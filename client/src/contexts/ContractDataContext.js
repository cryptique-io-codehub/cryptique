import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import axiosInstance from '../axiosInstance';
import { getChainConfig, isChainSupported, getDefaultTokenType } from '../utils/chainRegistry';

// Add utility for exponential backoff and debouncing
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Debounce utility to prevent multiple rapid API calls
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

/**
 * Helper function to make API requests with exponential backoff retry
 * @param {Function} apiCall - Function that returns a promise for the API call
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialBackoff - Initial backoff time in ms
 */
const fetchWithRetry = async (apiCall, maxRetries = 3, initialBackoff = 1000) => {
  let retries = 0;
  let lastError;

  while (retries <= maxRetries) {
    try {
      // If not the first attempt, wait with exponential backoff
      if (retries > 0) {
        const backoffTime = initialBackoff * Math.pow(2, retries - 1);
        console.log(`Retry attempt ${retries}/${maxRetries}, waiting ${backoffTime}ms...`);
        await sleep(backoffTime);
      }

      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // If rate limited (429), we definitely want to retry with longer backoff
      if (error.response && error.response.status === 429) {
        console.log(`Rate limited (429), will retry after backoff`);
        retries++;
        initialBackoff = Math.max(initialBackoff * 2, 5000); // Increase minimum backoff
        continue;
      }
      
      // For other errors, only retry on network errors or 5xx server errors
      if (!error.response || (error.response.status >= 500 && error.response.status < 600)) {
        retries++;
        continue;
      }
      
      // For 4xx errors other than 429, don't retry
      throw error;
    }
  }
  
  // If we've exhausted all retries
  console.error(`Failed after ${maxRetries} retries`, lastError);
  throw lastError;
};

// Create the context
const ContractDataContext = createContext();

export const ContractDataProvider = ({ children }) => {
  // State for smart contract selection and data
  const [contractArray, setContractArray] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractTransactions, setContractTransactions] = useState([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [showDemoData, setShowDemoData] = useState(true); // By default, show demo data
  const [loadingStatus, setLoadingStatus] = useState('');
  const [updatingTransactions, setUpdatingTransactions] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const lastFetchRef = useRef(0);
  const isFetchingRef = useRef(false);

  // Fetch smart contracts for the current team
  // Using useEffect with debouncing to prevent excessive API calls
  useEffect(() => {
    // Create a debounced version of fetchSmartContracts
    const debouncedFetchSmartContracts = debounce(async () => {
      // Check if we're already fetching or if we've fetched recently (within 10 seconds)
      const now = Date.now();
      if (isFetchingRef.current || (now - lastFetchRef.current < 10000)) {
        console.log('Skipping fetch - already in progress or fetched recently');
        return;
      }
      
      isFetchingRef.current = true;
      
      try {
        setIsLoadingContracts(true);
        const selectedTeam = localStorage.getItem("selectedTeam");
        
        if (!selectedTeam) {
          setIsLoadingContracts(false);
          isFetchingRef.current = false;
          return;
        }

        // Check for cached data in sessionStorage first
        const preloadedContracts = sessionStorage.getItem("preloadedContracts");
        const contractsLastFetch = sessionStorage.getItem("contractsLastFetch");
        
        // Use cached data if it exists and is less than 5 minutes old
        if (preloadedContracts && contractsLastFetch) {
          const cacheAge = now - parseInt(contractsLastFetch);
          if (cacheAge < 5 * 60 * 1000) { // 5 minutes in milliseconds
            console.log("Using cached contract data (less than 5 minutes old)");
            const contracts = JSON.parse(preloadedContracts);
            setContractArray(contracts);
            console.log(`Loaded ${contracts.length} cached contracts for team ${selectedTeam}`);
            setIsLoadingContracts(false);
            isFetchingRef.current = false;
            setFetchError(null);
            return; // Skip API call
          }
        }

        // If no recent cached data, fetch from API with retry logic
        console.log(`Fetching contracts for team ${selectedTeam} with retry logic`);
        const response = await fetchWithRetry(
          () => axiosInstance.get(`/contracts/team/${selectedTeam}`)
        );
        
        if (response.data && response.data.contracts) {
          // Format contract data
          const contracts = response.data.contracts.map(contract => ({
            id: contract.contractId,
            address: contract.address,
            name: contract.name || `Contract ${contract.address.substring(0, 6)}...${contract.address.substring(contract.address.length - 4)}`,
            blockchain: contract.blockchain,
            tokenSymbol: contract.tokenSymbol
          }));
          
          setContractArray(contracts);
          
          // Save to sessionStorage for future quick access with timestamp
          sessionStorage.setItem("preloadedContracts", JSON.stringify(contracts));
          sessionStorage.setItem("contractsLastFetch", now.toString());
          
          console.log(`Loaded ${contracts.length} contracts for team ${selectedTeam}`);
          setFetchError(null);
        }
      } catch (error) {
        console.error("Error fetching smart contracts:", error);
        setFetchError(error);
        
        // If we have cached data, use it as fallback even if it's older than 5 minutes
        const preloadedContracts = sessionStorage.getItem("preloadedContracts");
        if (preloadedContracts) {
          console.log("Using cached contract data as fallback after error");
          const contracts = JSON.parse(preloadedContracts);
          setContractArray(contracts);
        }
      } finally {
        setIsLoadingContracts(false);
        isFetchingRef.current = false;
        lastFetchRef.current = Date.now();
      }
    }, 1000); // 1 second debounce

    debouncedFetchSmartContracts();
  }, []);

  // Function to fetch transactions for a selected smart contract
  const fetchContractTransactions = async (contractId) => {
    if (!contractId) {
      setShowDemoData(true); // If no contract selected, show demo data
      setContractTransactions([]);
      return;
    }

    setShowDemoData(false); // When a contract is selected, use real data
    
    try {
      setIsLoadingTransactions(true);
      console.log(`Fetching transactions for contract ID: ${contractId}`);
      
      // Check for cached transaction data first
      const cachedTransactions = sessionStorage.getItem(`transactions_${contractId}`);
      const transactionsLastFetch = sessionStorage.getItem(`transactions_${contractId}_lastFetch`);
      
      // Use cached data if it exists and is less than 5 minutes old
      if (cachedTransactions && transactionsLastFetch) {
        const now = Date.now();
        const cacheAge = now - parseInt(transactionsLastFetch);
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes in milliseconds
          console.log("Using cached transaction data (less than 5 minutes old)");
          const transactions = JSON.parse(cachedTransactions);
          setContractTransactions(transactions);
          console.log(`Loaded ${transactions.length} cached transactions for contract ${contractId}`);
          
          // After using cached data, check for new ones in the background
          const contract = contractArray.find(c => c.id === contractId);
          if (contract) {
            // Don't await this - let it run in background
            fetchLatestTransactions(contract, transactions);
          }
          
          setIsLoadingTransactions(false);
          return transactions;
        }
      }
      
      // If no recent cached data, fetch from API with retry logic
      let allTransactions = [];
      let hasMore = true;
      let page = 1;
      const pageSize = 100000; // Fetch 100000 transactions per request
      
      // Loop to fetch all transactions with pagination
      while (hasMore) {
        console.log(`Fetching page ${page} of transactions (${pageSize} per page)`);
        
        try {
          const response = await fetchWithRetry(
            () => axiosInstance.get(`/transactions/contract/${contractId}`, {
              params: { 
                limit: pageSize,
                page: page
              }
            })
          );
          
          if (response.data && response.data.transactions) {
            const fetchedTransactions = response.data.transactions;
            
            // Add to our accumulated transactions
            allTransactions = [...allTransactions, ...fetchedTransactions];
            
            console.log(`Fetched ${fetchedTransactions.length} transactions on page ${page}`);
            
            // Check if we need to fetch more
            hasMore = response.data.metadata?.hasMore;
            
            // If we got fewer transactions than the page size, we're done
            if (fetchedTransactions.length < pageSize) {
              hasMore = false;
            }
            
            // Move to next page
            page++;
            
            // Safety check - don't loop more than 10 times (1,000,000 transactions)
            if (page > 10) {
              console.log("Reached maximum page fetch limit (1,000,000 transactions)");
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error(`Error fetching transactions page ${page}:`, error);
          hasMore = false;
          
          // If rate limited, break the loop and use what we have
          if (error.response && error.response.status === 429) {
            console.log("Rate limited (429) during transaction fetch, using partial results");
            break;
          }
        }
      }
      
      // Cache the transactions we've fetched
      if (allTransactions.length > 0) {
        sessionStorage.setItem(`transactions_${contractId}`, JSON.stringify(allTransactions));
        sessionStorage.setItem(`transactions_${contractId}_lastFetch`, Date.now().toString());
      }
      
      setContractTransactions(allTransactions);
      console.log(`Loaded ${allTransactions.length} total transactions for contract ${contractId}`);
      
      // After loading existing transactions, check for new ones
      const contract = contractArray.find(c => c.id === contractId);
      if (contract) {
        fetchLatestTransactions(contract, allTransactions);
      }
      
      return allTransactions;
    } catch (error) {
      console.error("Error fetching contract transactions:", error);
      
      // Try to use cached data as fallback
      const cachedTransactions = sessionStorage.getItem(`transactions_${contractId}`);
      if (cachedTransactions) {
        console.log("Using cached transaction data as fallback after error");
        const transactions = JSON.parse(cachedTransactions);
        setContractTransactions(transactions);
        return transactions;
      }
      
      setShowDemoData(true); // Fallback to demo data on error
      return [];
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  
  // Function to fetch latest transactions from blockchain explorer
  const fetchLatestTransactions = async (contract, existingTransactions) => {
    if (!contract || !contract.id) return;
    
    setUpdatingTransactions(true);
    setLoadingStatus(`Checking for new transactions for ${contract.name || contract.address}`);
    
    console.log(`Fetching latest transactions for contract: ${contract.address} on ${contract.blockchain}`);
    
    try {
      // Get the latest block number from our database
      setLoadingStatus('Determining latest processed block...');
      
      const latestBlockResponse = await axiosInstance.get(`/transactions/contract/${contract.id}/latest-block`);
      const startBlock = latestBlockResponse.data.latestBlockNumber;
      
      if (!startBlock) {
        setLoadingStatus('No existing transactions found, fetching initial transactions...');
        // This is handled separately
        setUpdatingTransactions(false);
        return;
      }
      
      setLoadingStatus(`Checking for new transactions since block ${startBlock}`);
      console.log(`Checking for new transactions since block ${startBlock} for contract: ${contract.address}`);
      
      // Fetch only new transactions from blockchain API
      let newTransactions = [];
      
      // Use the chain registry to determine which blockchain API to use
      if (!isChainSupported(contract.blockchain)) {
        console.log(`Chain ${contract.blockchain} is not supported yet.`);
        setLoadingStatus(`Chain ${contract.blockchain} is not supported yet.`);
        setUpdatingTransactions(false);
        return;
      }
      
      const chainConfig = getChainConfig(contract.blockchain);
      
      if (!chainConfig || !chainConfig.fetchTransactions) {
        console.log(`No transaction fetcher available for ${contract.blockchain}.`);
        setLoadingStatus(`No transaction fetcher available for ${contract.blockchain}.`);
        setUpdatingTransactions(false);
        return;
      }
      
      setLoadingStatus(`Fetching new transactions from ${chainConfig.name} (${chainConfig.blockExplorerUrl})...`);
      console.log(`Using ${chainConfig.name} API to fetch new transactions`);
      
      const chainResult = await chainConfig.fetchTransactions(contract.address, {
        limit: 100000,
        startBlock: startBlock
      });
      
      if (chainResult.transactions?.length > 0) {
        console.log(`Retrieved ${chainResult.transactions.length} new transactions from ${chainConfig.name} API`);
        
        // Update token symbol in transactions
        const defaultTokenType = getDefaultTokenType(contract.blockchain);
        newTransactions = chainResult.transactions.map(tx => ({
          ...tx,
          token_symbol: contract.tokenSymbol || tx.token_symbol,
          value_eth: tx.value_eth.replace(defaultTokenType, contract.tokenSymbol || defaultTokenType)
        }));
      } else {
        console.log('No new transactions found or error:', chainResult.metadata?.message);
      }
      
      let totalSaved = 0;
      
      // If we found new transactions, sanitize and save them to API
      if (newTransactions.length > 0) {
        setLoadingStatus(`Processing ${newTransactions.length} new transactions...`);
        
        try {
          // Ensure transactions have proper format and required fields
          const sanitizedTransactions = newTransactions.map(tx => ({
            ...tx,
            tx_hash: tx.tx_hash || '',
            block_number: parseInt(tx.block_number) || 0,
            block_time: tx.block_time || new Date().toISOString(),
            chain: tx.chain || contract.blockchain,
            contract_address: tx.contract_address || contract.address,
            contractId: contract.id
          })).filter(tx => 
            // Filter out invalid transactions
            tx.tx_hash && 
            tx.tx_hash.length > 0 && 
            tx.block_number && 
            typeof tx.block_number === 'number'
          );
          
          setLoadingStatus(`Saving ${sanitizedTransactions.length} valid transactions...`);
          
          // Save sanitized transactions in batches
          const BATCH_SIZE = 7500;
          let batchErrors = [];
          
          for (let i = 0; i < sanitizedTransactions.length; i += BATCH_SIZE) {
            const batch = sanitizedTransactions.slice(i, i + BATCH_SIZE);
            setLoadingStatus(`Saving batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(sanitizedTransactions.length/BATCH_SIZE)} (${i+1}-${Math.min(i+BATCH_SIZE, sanitizedTransactions.length)} of ${sanitizedTransactions.length})`);
            
            try {
              const response = await axiosInstance.post(`/transactions/contract/${contract.id}`, {
                transactions: batch
              });
              
              console.log('Batch save response:', response.data);
              totalSaved += response.data.total || 0;
            } catch (batchError) {
              console.error(`Error saving batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
              batchErrors.push(batchError.message || 'Unknown batch error');
              // Small delay before next batch to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (batchErrors.length > 0) {
            console.warn(`Had ${batchErrors.length} errors while saving batches:`, batchErrors);
          }
          
          console.log(`Saved ${totalSaved} new transactions to API in batches`);
          
          // If we saved any new transactions, update our local data instead of re-fetching everything
          if (totalSaved > 0) {
            setLoadingStatus(`Added ${totalSaved} new transactions. Updating local data...`);
            
            // FIXED: Instead of re-fetching all transactions (which might hit the pagination limit),
            // let's directly append the new transactions to our existing ones
            try {
              // Fetch only the new transactions we just saved
              const newSavedTransactionsResponse = await axiosInstance.get(`/transactions/contract/${contract.id}`, {
                params: { 
                  limit: totalSaved * 2, // Fetch a bit more to be safe
                  page: 1,
                  sort: '-block_number' // Sort by newest first
                }
              });
              
              if (newSavedTransactionsResponse.data && newSavedTransactionsResponse.data.transactions) {
                const newSavedTransactions = newSavedTransactionsResponse.data.transactions;
                
                // Get transaction hashes from existing transactions for deduplication
                const existingTxHashes = new Set(existingTransactions.map(tx => tx.tx_hash));
                
                // Filter out any transactions that might already be in our existing set
                const uniqueNewTransactions = newSavedTransactions.filter(tx => !existingTxHashes.has(tx.tx_hash));
                
                // Combine with existing, making sure to add at the beginning since they're newer
                const updatedTransactions = [...uniqueNewTransactions, ...existingTransactions];
                
                setContractTransactions(updatedTransactions);
                console.log(`Updated transaction list, now showing ${updatedTransactions.length} transactions`);
                
                // Print transaction count information
                console.log('======== TRANSACTION COUNT SUMMARY ========');
                console.log(`Before update: ${existingTransactions.length} transactions`);
                console.log(`New transactions saved: ${totalSaved}`);
                console.log(`Unique new transactions added: ${uniqueNewTransactions.length}`);
                console.log(`After update: ${updatedTransactions.length} transactions`);
                console.log(`Net increase: ${updatedTransactions.length - existingTransactions.length} transactions`);
                console.log('==========================================');
                
                // Print the latest 10 transactions for verification
                console.log('======== LATEST 10 TRANSACTIONS ========');
                const latest10Txns = updatedTransactions.slice(0, 10);
                latest10Txns.forEach((tx, index) => {
                  console.log(`${index + 1}. TX Hash: ${tx.tx_hash.substring(0, 12)}... | Block: ${tx.block_number} | Value: ${tx.value_eth}`);
                });
                console.log('==========================================');
              }
            } catch (error) {
              console.error("Error fetching newly saved transactions:", error);
              setLoadingStatus(`Error updating local data: ${error.message}`);
            }
          } else {
            setLoadingStatus('No new transactions found');
          }
        } catch (error) {
          console.error("Error saving new transactions to API:", error);
          setLoadingStatus(`Error saving transactions: ${error.message}`);
        }
      } else {
        setLoadingStatus('No new transactions found');
      }
    } catch (error) {
      console.error(`Error fetching latest transactions:`, error);
      setLoadingStatus(`Error: ${error.message}`);
    }
    
    setUpdatingTransactions(false);
  };

  // Handle contract selection change
  const handleContractChange = async (contractId) => {
    // If empty, reset to demo data
    if (!contractId) {
      setSelectedContract(null);
      setContractTransactions([]);
      setShowDemoData(true);
      return;
    }
    
    // Find the selected contract details
    const contract = contractArray.find(c => c.id === contractId);
    if (contract) {
      setSelectedContract(contract);
      await fetchContractTransactions(contractId);
    } else {
      setSelectedContract(null);
      setContractTransactions([]);
      setShowDemoData(true);
    }
  };
  
  // Process contract transactions into a usable format for charts and analytics
  const processContractTransactions = () => {
    if (!selectedContract || !contractTransactions || contractTransactions.length === 0) {
      return null;
    }
    
    console.log(`Processing ${contractTransactions.length} transactions for contract: ${selectedContract.name}`);
    
    // Get current date and dates for time-based calculations
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);

    // Get dates for previous periods (for percentage calculations)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 14);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(now.getDate() - 60);
    const twoYearsAgo2 = new Date();
    twoYearsAgo2.setFullYear(now.getFullYear() - 2);
    
    // Get unique wallet addresses (from_address represents the wallet)
    const uniqueWallets = new Set(contractTransactions.map(tx => tx.from_address));
    
    // Get unique active wallets in the last 30 days
    const activeWallets = new Set(
      contractTransactions
        .filter(tx => {
          // Parse transaction date
          const txDate = new Date(tx.block_time);
          // Check if transaction is within the last 30 days
          return txDate >= thirtyDaysAgo && txDate <= now;
        })
        .map(tx => tx.from_address)
    );
    
    // Filter transactions for different time periods
    const transactionsLast7Days = contractTransactions.filter(tx => {
      const txDate = new Date(tx.block_time);
      return txDate >= sevenDaysAgo && txDate <= now;
    });
    
    const transactionsLast30Days = contractTransactions.filter(tx => {
      const txDate = new Date(tx.block_time);
      return txDate >= thirtyDaysAgo && txDate <= now;
    });
    
    const transactionsLastYear = contractTransactions.filter(tx => {
      const txDate = new Date(tx.block_time);
      return txDate >= oneYearAgo && txDate <= now;
    });

    // Filter transactions for previous periods (for calculating percentage changes)
    const transactionsPrevious7Days = contractTransactions.filter(tx => {
      const txDate = new Date(tx.block_time);
      return txDate >= fourteenDaysAgo && txDate < sevenDaysAgo;
    });
    
    const transactionsPrevious30Days = contractTransactions.filter(tx => {
      const txDate = new Date(tx.block_time);
      return txDate >= sixtyDaysAgo && txDate < thirtyDaysAgo;
    });
    
    const transactionsPreviousYear = contractTransactions.filter(tx => {
      const txDate = new Date(tx.block_time);
      return txDate >= twoYearsAgo2 && txDate < oneYearAgo;
    });
    
    // Calculate transaction volume for recent periods
    const volumeLast7Days = transactionsLast7Days.reduce((sum, tx) => {
      const value = parseFloat(tx.value_eth) || 0;
      return isNaN(value) ? sum : sum + value;
    }, 0);
    
    const volumeLast30Days = transactionsLast30Days.reduce((sum, tx) => {
      const value = parseFloat(tx.value_eth) || 0;
      return isNaN(value) ? sum : sum + value;
    }, 0);
    
    const volumeLastYear = transactionsLastYear.reduce((sum, tx) => {
      const value = parseFloat(tx.value_eth) || 0;
      return isNaN(value) ? sum : sum + value;
    }, 0);
    
    // Calculate transaction volume for previous periods
    const volumePrevious7Days = transactionsPrevious7Days.reduce((sum, tx) => {
      const value = parseFloat(tx.value_eth) || 0;
      return isNaN(value) ? sum : sum + value;
    }, 0);
    
    const volumePrevious30Days = transactionsPrevious30Days.reduce((sum, tx) => {
      const value = parseFloat(tx.value_eth) || 0;
      return isNaN(value) ? sum : sum + value;
    }, 0);
    
    const volumePreviousYear = transactionsPreviousYear.reduce((sum, tx) => {
      const value = parseFloat(tx.value_eth) || 0;
      return isNaN(value) ? sum : sum + value;
    }, 0);
    
    // Calculate lifetime volume (all transactions)
    const volumeLifetime = contractTransactions.reduce((sum, tx) => {
      const value = parseFloat(tx.value_eth) || 0;
      return isNaN(value) ? sum : sum + value;
    }, 0);
    
    // Calculate percentage changes
    const percentChange7Days = volumePrevious7Days > 0 
      ? ((volumeLast7Days - volumePrevious7Days) / volumePrevious7Days) * 100 
      : 0;
    
    const percentChange30Days = volumePrevious30Days > 0 
      ? ((volumeLast30Days - volumePrevious30Days) / volumePrevious30Days) * 100 
      : 0;
    
    const percentChangeYear = volumePreviousYear > 0 
      ? ((volumeLastYear - volumePreviousYear) / volumePreviousYear) * 100 
      : 0;
    
    // Process wallet age distribution
    // First get the first transaction date for each wallet
    const walletFirstTransactionMap = {};
    
    // Sort transactions by date (ascending)
    const sortedTransactions = [...contractTransactions].sort((a, b) => 
      new Date(a.block_time) - new Date(b.block_time)
    );
    
    // Find the first transaction for each wallet
    sortedTransactions.forEach(tx => {
      const wallet = tx.from_address;
      if (!walletFirstTransactionMap[wallet]) {
        walletFirstTransactionMap[wallet] = new Date(tx.block_time);
      }
    });
    
    // Count wallets in each age range
    let walletsOlderThan2Years = 0;
    let wallets1To2Years = 0;
    let wallets6MonthsTo1Year = 0;
    let walletsLessThan6Months = 0;
    
    // Calculate wallet age distribution
    Object.values(walletFirstTransactionMap).forEach(firstTxDate => {
      if (firstTxDate <= twoYearsAgo) {
        walletsOlderThan2Years++;
      } else if (firstTxDate <= oneYearAgo) {
        wallets1To2Years++;
      } else if (firstTxDate <= sixMonthsAgo) {
        wallets6MonthsTo1Year++;
      } else {
        walletsLessThan6Months++;
      }
    });
    
    const totalWallets = uniqueWallets.size;
    
    // Calculate average wallet age in years
    let totalAgeInDays = 0;
    
    Object.values(walletFirstTransactionMap).forEach(firstTxDate => {
      const ageInDays = (now - firstTxDate) / (1000 * 60 * 60 * 24);
      totalAgeInDays += ageInDays;
    });
    
    const avgWalletAgeInYears = (totalAgeInDays / totalWallets) / 365;
    
    // Format wallet age distribution data for the pie chart
    const walletAgeData = [
      { 
        name: ">2Y", 
        value: totalWallets > 0 ? Math.round((walletsOlderThan2Years / totalWallets) * 100) : 0, 
        color: "#3b82f6" 
      },
      { 
        name: "1Y-2Y", 
        value: totalWallets > 0 ? Math.round((wallets1To2Years / totalWallets) * 100) : 0, 
        color: "#f97316" 
      },
      { 
        name: "6M-1Y", 
        value: totalWallets > 0 ? Math.round((wallets6MonthsTo1Year / totalWallets) * 100) : 0, 
        color: "#10b981" 
      },
      { 
        name: "<6M", 
        value: totalWallets > 0 ? Math.round((walletsLessThan6Months / totalWallets) * 100) : 0, 
        color: "#eab308" 
      }
    ];

    // Get chain configuration if available
    const chainConfig = getChainConfig(selectedContract.blockchain);
    const chainColor = chainConfig?.color || '#627EEA'; // Default to Ethereum blue if not found
    
    // Generate daily transaction data for charts (transactions and volume over time)
    const transactionTimeSeriesData = generateDailyTransactionData(contractTransactions, 30); // Last 30 days of data
    
    console.log(`Generated ${transactionTimeSeriesData.length} daily data points for transaction chart`);
    console.log('Sample of transaction time series data:', transactionTimeSeriesData.slice(0, 3));
    
    const processedData = {
      contractInfo: {
        address: selectedContract.address,
        name: selectedContract.name,
        blockchain: selectedContract.blockchain,
        tokenSymbol: selectedContract.tokenSymbol || 'Unknown',
        totalTransactions: contractTransactions.length,
        chainColor: chainColor,
        blockExplorerUrl: chainConfig?.blockExplorerUrl
      },
      summary: {
        uniqueUsers: uniqueWallets.size,
        activeWallets: activeWallets.size, // Active wallets in last 30 days
        uniqueReceivers: new Set(contractTransactions.map(tx => tx.to_address)).size,
        totalVolume: contractTransactions.reduce((sum, tx) => {
          const value = parseFloat(tx.value_eth) || 0;
          return isNaN(value) ? sum : sum + value;
        }, 0)
      },
      recentTransactions: {
        last7Days: transactionsLast7Days.length,
        last30Days: transactionsLast30Days.length,
        lastYear: transactionsLastYear.length,
        lifetime: contractTransactions.length
      },
      recentVolume: {
        last7Days: volumeLast7Days.toFixed(2),
        last30Days: volumeLast30Days.toFixed(2),
        lastYear: volumeLastYear.toFixed(2),
        lifetime: volumeLifetime.toFixed(2),
        percentChange7Days: percentChange7Days.toFixed(1),
        percentChange30Days: percentChange30Days.toFixed(1),
        percentChangeYear: percentChangeYear.toFixed(1)
      },
      walletAgeData: walletAgeData,
      medianWalletStats: {
        age: `${avgWalletAgeInYears.toFixed(1)} Years`,
        netWorth: "$945" // Placeholder - would need external data source
      },
      // Use the generated transaction data for charts
      transactionData: transactionTimeSeriesData,
      
      // Add transaction data for different time ranges
      getTransactionDataForRange: (timeRange) => {
        let daysToInclude;
        let granularity = 'daily';
        
        switch(timeRange) {
          case '24h':
            daysToInclude = 1;
            granularity = 'hourly';
            break;
          case '7d':
            daysToInclude = 7;
            break;
          case '30d':
            daysToInclude = 30;
            break;
          case 'quarter':
            daysToInclude = 90;
            break;
          case 'year':
            daysToInclude = 365;
            break;
          default:
            daysToInclude = 30;
        }
        
        return generateDailyTransactionData(contractTransactions, daysToInclude, granularity);
      }
    };
    
    return processedData;
  };

  // Helper function to generate daily transaction data for charts
  const generateDailyTransactionData = (transactions, daysToInclude = 30, granularity = 'daily') => {
    if (!transactions || transactions.length === 0) {
      return [];
    }
    
    // Get date range
    const now = new Date();
    let startDate = new Date();
    
    // Calculate start date based on daysToInclude
    startDate.setDate(now.getDate() - daysToInclude);
    
    // Find the transaction dates within our range
    const txsInRange = transactions.filter(tx => {
      const txDate = new Date(tx.block_time);
      return txDate >= startDate && txDate <= now;
    });
    
    // If no transactions in the date range, return empty array
    if (txsInRange.length === 0) {
      return [];
    }
    
    // Initialize map to store data by day/hour
    const timeSeriesData = {};
    
    // Get token symbol from contract or default to blockchain's native currency
    const chainConfig = getChainConfig(selectedContract.blockchain);
    const tokenSymbol = selectedContract.tokenSymbol || (chainConfig?.nativeCurrency?.symbol || 'TOKEN');
    
    // Create entries for all time points in the range (to ensure no gaps in chart)
    if (granularity === 'hourly') {
      // For hourly granularity
      for (let i = 0; i <= daysToInclude * 24; i++) {
        const date = new Date(startDate);
        date.setHours(startDate.getHours() + i);
        
        // Don't go beyond current time
        if (date > now) break;
        
        const hourStr = formatHour(date);
        timeSeriesData[hourStr] = {
          date: hourStr,
          transactions: 0,
          volume: 0,
          volumeFormatted: `0 ${tokenSymbol}`
        };
      }
    } else {
      // For daily granularity
      for (let i = 0; i <= daysToInclude; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        // Don't go beyond current time
        if (date > now) break;
        
        const dateStr = formatDate(date);
        timeSeriesData[dateStr] = {
          date: dateStr,
          transactions: 0,
          volume: 0,
          volumeFormatted: `0 ${tokenSymbol}`
        };
      }
    }
    
    // Aggregate transaction data by time period
    txsInRange.forEach(tx => {
      const txDate = new Date(tx.block_time);
      let timeKey;
      
      if (granularity === 'hourly') {
        timeKey = formatHour(txDate);
      } else {
        timeKey = formatDate(txDate);
      }
      
      // Create entry if it doesn't exist (shouldn't be needed with the loop above)
      if (!timeSeriesData[timeKey]) {
        timeSeriesData[timeKey] = {
          date: timeKey,
          transactions: 0,
          volume: 0,
          volumeFormatted: `0 ${tokenSymbol}`
        };
      }
      
      // Add transaction and volume
      timeSeriesData[timeKey].transactions += 1;
      const value = parseFloat(tx.value_eth) || 0;
      if (!isNaN(value)) {
        timeSeriesData[timeKey].volume += value;
      }
    });
    
    // Format volume values properly
    Object.values(timeSeriesData).forEach(item => {
      // Round to 2 decimal places
      item.volume = parseFloat(item.volume.toFixed(2));
      
      // Format volumes with appropriate suffix
      if (item.volume >= 1000000000) {
        item.volumeFormatted = `${(item.volume / 1000000000).toFixed(2)}B ${tokenSymbol}`;
      } else if (item.volume >= 1000000) {
        item.volumeFormatted = `${(item.volume / 1000000).toFixed(2)}M ${tokenSymbol}`;
      } else if (item.volume >= 1000) {
        item.volumeFormatted = `${(item.volume / 1000).toFixed(1)}K ${tokenSymbol}`;
      } else {
        item.volumeFormatted = `${item.volume.toLocaleString()} ${tokenSymbol}`;
      }
    });
    
    // Convert to array and sort by date
    return Object.values(timeSeriesData).sort((a, b) => {
      const dateA = granularity === 'hourly' ? parseHour(a.date) : parseDate(a.date);
      const dateB = granularity === 'hourly' ? parseHour(b.date) : parseDate(b.date);
      return dateA - dateB;
    });
  };
  
  // Helper for date formatting
  const formatDate = (date) => {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${day} ${month}`;
  };
  
  // Helper to parse formatted date back to Date object
  const parseDate = (dateStr) => {
    const [day, month] = dateStr.split(' ');
    const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
    const year = new Date().getFullYear(); // Assume current year
    return new Date(year, monthIdx, parseInt(day));
  };
  
  // Helper for hour formatting
  const formatHour = (date) => {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const hour = date.getHours().toString().padStart(2, '0');
    return `${day} ${month} ${hour}:00`;
  };
  
  // Helper to parse formatted hour back to Date object
  const parseHour = (hourStr) => {
    const [day, month, hourMinute] = hourStr.split(' ');
    const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
    const hour = parseInt(hourMinute.split(':')[0]);
    const year = new Date().getFullYear(); // Assume current year
    return new Date(year, monthIdx, parseInt(day), hour);
  };

  // Add a refreshContracts function that can be called by components
  const refreshContracts = async () => {
    // Skip if we're already fetching or fetched recently (within 10 seconds)
    const now = Date.now();
    if (isFetchingRef.current || (now - lastFetchRef.current < 10000)) {
      console.log('Skipping refresh - already in progress or refreshed recently');
      return;
    }
    
    isFetchingRef.current = true;
    
    try {
      setIsLoadingContracts(true);
      const selectedTeam = localStorage.getItem("selectedTeam");
      
      if (!selectedTeam) {
        setIsLoadingContracts(false);
        isFetchingRef.current = false;
        return;
      }

      console.log("Refreshing contract data");
      
      // Force fetch from API with retry logic
      const response = await fetchWithRetry(
        () => axiosInstance.get(`/contracts/team/${selectedTeam}`)
      );
      
      if (response.data && response.data.contracts) {
        // Format contract data
        const contracts = response.data.contracts.map(contract => ({
          id: contract.contractId,
          address: contract.address,
          name: contract.name || `Contract ${contract.address.substring(0, 6)}...${contract.address.substring(contract.address.length - 4)}`,
          blockchain: contract.blockchain,
          tokenSymbol: contract.tokenSymbol
        }));
        
        setContractArray(contracts);
        
        // Update sessionStorage
        sessionStorage.setItem("preloadedContracts", JSON.stringify(contracts));
        sessionStorage.setItem("contractsLastFetch", now.toString());
        
        console.log(`Refreshed contracts, loaded ${contracts.length} contracts`);
        setFetchError(null);
      }
    } catch (error) {
      console.error("Error refreshing contract data:", error);
      setFetchError(error);
    } finally {
      setIsLoadingContracts(false);
      isFetchingRef.current = false;
      lastFetchRef.current = Date.now();
    }
  };

  // Listen for team changes
  useEffect(() => {
    // Store the current team for comparison
    let currentTeam = localStorage.getItem("selectedTeam");
    
    // Function to check for team changes
    const checkTeamChange = () => {
      const newTeam = localStorage.getItem("selectedTeam");
      if (newTeam && newTeam !== currentTeam) {
        console.log(`Team changed in context from ${currentTeam} to ${newTeam}, refreshing contracts`);
        currentTeam = newTeam;
        
        // Refresh contract data for the new team
        refreshContracts();
      }
    };
    
    // Check for team changes every 2 seconds
    const intervalId = setInterval(checkTeamChange, 2000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <ContractDataContext.Provider
      value={{
        contractArray,
        selectedContract,
        contractTransactions,
        isLoadingContracts,
        isLoadingTransactions,
        showDemoData,
        updatingTransactions,
        loadingStatus,
        fetchError,
        handleContractChange,
        processContractTransactions,
        refreshContracts
      }}
    >
      {children}
    </ContractDataContext.Provider>
  );
};

// Custom hook to use the contract data context
export const useContractData = () => {
  const context = useContext(ContractDataContext);
  if (!context) {
    throw new Error('useContractData must be used within a ContractDataProvider');
  }
  return context;
};

export default ContractDataContext; 
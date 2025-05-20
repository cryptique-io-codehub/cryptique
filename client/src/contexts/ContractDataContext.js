import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import axiosInstance from '../axiosInstance';
import { getChainConfig, isChainSupported, getDefaultTokenType } from '../utils/chainRegistry';

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

  // Add ref to track last refresh time
  const lastRefreshTime = useRef(Date.now() - 60000); // Initialize to 1 minute ago
  
  // Add ref to store wallet stats for each contract to keep them consistent
  const walletStatsByContractRef = useRef({});
  
  // Create a ref for demo wallet stats to keep them consistent
  const demoWalletStatsRef = useRef(null);
  
  // Create a ref for wallet balance distributions
  const walletBalanceDistributionRef = useRef({});

  // Fetch smart contracts for the current team
  useEffect(() => {
    const fetchSmartContracts = async () => {
      try {
        setIsLoadingContracts(true);
        const selectedTeam = localStorage.getItem("selectedTeam");
        
        if (!selectedTeam) {
          setIsLoadingContracts(false);
          return;
        }

        // Check for preloaded data in sessionStorage first
        const preloadedContracts = sessionStorage.getItem("preloadedContracts");
        
        if (preloadedContracts) {
          console.log("Using preloaded contract data");
          const contracts = JSON.parse(preloadedContracts);
          setContractArray(contracts);
          console.log(`Loaded ${contracts.length} preloaded contracts for team ${selectedTeam}`);
          setIsLoadingContracts(false);
          return; // Skip API call
        }

        // If no preloaded data, fetch from API
        const response = await axiosInstance.get(`/contracts/team/${selectedTeam}`);
        
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
          
          // Save to sessionStorage for future quick access
          sessionStorage.setItem("preloadedContracts", JSON.stringify(contracts));
          
          console.log(`Loaded ${contracts.length} contracts for team ${selectedTeam}`);
        }
      } catch (error) {
        console.error("Error fetching smart contracts:", error);
      } finally {
        setIsLoadingContracts(false);
      }
    };

    fetchSmartContracts();
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
      
      let allTransactions = [];
      let hasMore = true;
      let page = 1;
      const pageSize = 100000; // Fetch 100000 transactions per request
      
      // Loop to fetch all transactions with pagination
      while (hasMore) {
        console.log(`Fetching page ${page} of transactions (${pageSize} per page)`);
        
        const response = await axiosInstance.get(`/transactions/contract/${contractId}`, {
          params: { 
            limit: pageSize,
            page: page
          }
        });
        
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
      // For demo data, initialize once and reuse
      if (!demoWalletStatsRef.current) {
        // Generate wallet age distribution for demo data
        const lessThan6MonthsPercent = Math.floor(Math.random() * 26) + 25; // 25-50%
        const sixMonthsTo1YearPercent = Math.floor(Math.random() * 31) + 30; // 30-60%
        const oneYearTo2YearsPercent = Math.floor(Math.random() * 26) + 25; // 25-50%
        const olderThan2YearsPercent = Math.floor(Math.random() * 9) + 7; // 7-15%
        
        // Normalize percentages to sum to 100%
        const totalPercent = lessThan6MonthsPercent + sixMonthsTo1YearPercent + 
                              oneYearTo2YearsPercent + olderThan2YearsPercent;
        
        let normalizedLessThan6Months = Math.round((lessThan6MonthsPercent / totalPercent) * 100);
        let normalizedSixMonthsTo1Year = Math.round((sixMonthsTo1YearPercent / totalPercent) * 100);
        let normalizedOneYearTo2Years = Math.round((oneYearTo2YearsPercent / totalPercent) * 100);
        let normalizedOlderThan2Years = Math.round((olderThan2YearsPercent / totalPercent) * 100);
        
        // Ensure they sum to exactly 100%
        const currentSum = normalizedLessThan6Months + normalizedSixMonthsTo1Year + 
                          normalizedOneYearTo2Years + normalizedOlderThan2Years;
                          
        if (currentSum !== 100) {
          normalizedOlderThan2Years += (100 - currentSum);
        }
        
        // Calculate median wallet age based on this distribution
        const avgWalletAgeInYears = (
          (0.25 * normalizedLessThan6Months) + 
          (0.75 * normalizedSixMonthsTo1Year) + 
          (1.5 * normalizedOneYearTo2Years) + 
          (3 * normalizedOlderThan2Years)
        ) / 100;
        
        // Generate wallet balance distribution once
        const walletBalanceDistribution = generateWalletBalanceDistribution();
        
        // Generate demo transaction count distribution (preset values)
        const transactionCountDistribution = [
          { range: "1-5", percentage: 22.5 },
          { range: "6-10", percentage: 18.3 },
          { range: "11-20", percentage: 15.7 },
          { range: "21-50", percentage: 12.9 },
          { range: "51-100", percentage: 11.2 },
          { range: "101-500", percentage: 10.6 },
          { range: "500+", percentage: 8.8 }
        ];
        
        demoWalletStatsRef.current = {
          walletAgeData: [
            { name: "2Y+", value: normalizedOlderThan2Years, color: "#3b82f6" },
            { name: "1Y-2Y", value: normalizedOneYearTo2Years, color: "#f97316" },
            { name: "6M-1Y", value: normalizedSixMonthsTo1Year, color: "#10b981" },
            { name: "<6M", value: normalizedLessThan6Months, color: "#eab308" }
          ],
          medianAge: `${avgWalletAgeInYears.toFixed(1)} Years`,
          netWorth: calculateMedianNetWorth(walletBalanceDistribution),
          walletBalanceData: walletBalanceDistribution,
          transactionCountData: transactionCountDistribution
        };
      }
      
      // Return demo data for the wallet stats
      return {
        walletAgeData: demoWalletStatsRef.current.walletAgeData,
        medianWalletStats: {
          age: demoWalletStatsRef.current.medianAge,
          netWorth: formatDollarAmount(demoWalletStatsRef.current.netWorth)
        },
        walletBalanceData: demoWalletStatsRef.current.walletBalanceData,
        transactionCountData: demoWalletStatsRef.current.transactionCountData
      };
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
    
    // Calculate wallet age distribution
    if (!walletStatsByContractRef.current[selectedContract.id]) {
      // Process wallet age distribution
      // Instead of using actual data, always use proxy data with specified ranges
      // <6M: 25-50%, 6M-1Y: 30-60%, 1Y-2Y: 25-50%, 2Y+: 7-15%
      
      // Generate values within specified ranges
      const lessThan6MonthsPercent = Math.floor(Math.random() * 26) + 25; // 25-50%
      const sixMonthsTo1YearPercent = Math.floor(Math.random() * 31) + 30; // 30-60%
      const oneYearTo2YearsPercent = Math.floor(Math.random() * 26) + 25; // 25-50%
      const olderThan2YearsPercent = Math.floor(Math.random() * 9) + 7; // 7-15%
      
      // Normalize percentages to sum to 100%
      const totalPercent = lessThan6MonthsPercent + sixMonthsTo1YearPercent + 
                            oneYearTo2YearsPercent + olderThan2YearsPercent;
      
      let normalizedLessThan6Months = Math.round((lessThan6MonthsPercent / totalPercent) * 100);
      let normalizedSixMonthsTo1Year = Math.round((sixMonthsTo1YearPercent / totalPercent) * 100);
      let normalizedOneYearTo2Years = Math.round((oneYearTo2YearsPercent / totalPercent) * 100);
      let normalizedOlderThan2Years = Math.round((olderThan2YearsPercent / totalPercent) * 100);
      
      // Ensure they sum to exactly 100%
      const currentSum = normalizedLessThan6Months + normalizedSixMonthsTo1Year + 
                        normalizedOneYearTo2Years + normalizedOlderThan2Years;
                        
      if (currentSum !== 100) {
        normalizedOlderThan2Years += (100 - currentSum);
      }
      
      // Calculate median wallet age based on this distribution
      const avgWalletAgeInYears = (
        (0.25 * normalizedLessThan6Months) + 
        (0.75 * normalizedSixMonthsTo1Year) + 
        (1.5 * normalizedOneYearTo2Years) + 
        (3 * normalizedOlderThan2Years)
      ) / 100;
      
      // Generate wallet balance distribution once
      const walletBalanceDistribution = generateWalletBalanceDistribution();
      
      // Generate transaction count distribution
      // For real contracts, use actual transaction data for distribution
      const transactionCountDistribution = analyzeTransactionCountDistribution(contractTransactions);
      
      // Store the generated values for this contract
      walletStatsByContractRef.current[selectedContract.id] = {
        walletAgeData: [
          { name: "2Y+", value: normalizedOlderThan2Years, color: "#3b82f6" },
          { name: "1Y-2Y", value: normalizedOneYearTo2Years, color: "#f97316" },
          { name: "6M-1Y", value: normalizedSixMonthsTo1Year, color: "#10b981" },
          { name: "<6M", value: normalizedLessThan6Months, color: "#eab308" }
        ],
        medianAge: `${avgWalletAgeInYears.toFixed(1)} Years`,
        netWorth: calculateMedianNetWorth(walletBalanceDistribution),
        walletBalanceData: walletBalanceDistribution,
        transactionCountData: transactionCountDistribution
      };
    }
    
    // Retrieve the stored wallet stats for this contract
    const contractWalletStats = walletStatsByContractRef.current[selectedContract.id];
    
    // Format wallet age distribution data for the pie chart
    const walletAgeData = contractWalletStats.walletAgeData;

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
        age: contractWalletStats.medianAge,
        netWorth: formatDollarAmount(contractWalletStats.netWorth)
      },
      walletBalanceData: contractWalletStats.walletBalanceData,
      transactionCountData: contractWalletStats.transactionCountData,
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
    // Prevent multiple refreshes within a short timeframe (5 seconds)
    const now = Date.now();
    if (now - lastRefreshTime.current < 5000) {
      console.log("Contract refresh throttled - too many requests. Please wait.");
      return;
    }
    
    try {
      setIsLoadingContracts(true);
      lastRefreshTime.current = now;
      const selectedTeam = localStorage.getItem("selectedTeam");
      
      if (!selectedTeam) {
        setIsLoadingContracts(false);
        return;
      }

      console.log("Refreshing contract data");
      
      // Check if we already have contracts cached in session storage and use those
      // instead of making a new API call if they exist and we refreshed recently
      const cachedContracts = sessionStorage.getItem("preloadedContracts");
      if (cachedContracts && now - lastRefreshTime.current < 30000) {
        try {
          const contracts = JSON.parse(cachedContracts);
          setContractArray(contracts);
          console.log(`Using cached contracts, loaded ${contracts.length} contracts`);
          setIsLoadingContracts(false);
          return;
        } catch (error) {
          console.error("Error parsing cached contracts:", error);
          // Continue with API call if cache parsing fails
        }
      }
      
      // Force fetch from API
      const response = await axiosInstance.get(`/contracts/team/${selectedTeam}`);
      
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
        
        console.log(`Refreshed contracts, loaded ${contracts.length} contracts`);
      }
    } catch (error) {
      console.error("Error refreshing contract data:", error);
    } finally {
      setIsLoadingContracts(false);
    }
  };

  // Create a ref for tracking the last team refresh time
  const lastTeamRefreshTime = useRef(Date.now() - 60000); // Initialize to 1 minute ago

  // Listen for team changes
  useEffect(() => {
    // Store the current team for comparison
    let currentTeam = localStorage.getItem("selectedTeam");
    
    // Function to check for team changes
    const checkTeamChange = () => {
      const newTeam = localStorage.getItem("selectedTeam");
      const now = Date.now();
      
      if (newTeam && newTeam !== currentTeam) {
        console.log(`Team changed in context from ${currentTeam} to ${newTeam}, refreshing contracts`);
        currentTeam = newTeam;
        lastTeamRefreshTime.current = now;
        
        // Refresh contract data for the new team
        refreshContracts();
      } else if (newTeam && (now - lastTeamRefreshTime.current > 300000)) {
        // Refresh every 5 minutes at most to keep data fresh but avoid excessive requests
        lastTeamRefreshTime.current = now;
        refreshContracts();
      }
    };
    
    // Check for team changes every 5 seconds instead of 2 seconds
    const intervalId = setInterval(checkTeamChange, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Function to generate wallet balance distribution with random values within specified ranges
  const generateWalletBalanceDistribution = () => {
    // Generate values within specified ranges
    const lessThan100 = Math.floor(Math.random() * 11) + 30; // 30-40%
    const between100and500 = Math.floor(Math.random() * 11) + 20; // 20-30%
    const between500and1000 = Math.floor(Math.random() * 8) + 15; // 15-22%
    const between1000and5000 = Math.floor(Math.random() * 8) + 10; // 10-17%
    const between5000and10000 = Math.floor(Math.random() * 5) + 3; // 3-7%
    const between10000and100000 = Math.floor(Math.random() * 5) + 4; // 4-8%
    const above100000 = Math.floor(Math.random() * 3) + 1; // 1-3%
    
    // Calculate total to normalize
    const total = lessThan100 + between100and500 + between500and1000 + 
                  between1000and5000 + between5000and10000 + 
                  between10000and100000 + above100000;
    
    // Normalize to ensure sum is 100%
    const normalizedValues = [
      { range: "<$100", percentage: Math.round((lessThan100 / total) * 100) },
      { range: "$100-$500", percentage: Math.round((between100and500 / total) * 100) },
      { range: "$500-$1K", percentage: Math.round((between500and1000 / total) * 100) },
      { range: "$1K-$5K", percentage: Math.round((between1000and5000 / total) * 100) },
      { range: "$5K-$10K", percentage: Math.round((between5000and10000 / total) * 100) },
      { range: "$10K-$100K", percentage: Math.round((between10000and100000 / total) * 100) },
      { range: ">$100K", percentage: Math.round((above100000 / total) * 100) }
    ];
    
    // Ensure the sum is exactly 100%
    const currentSum = normalizedValues.reduce((sum, item) => sum + item.percentage, 0);
    if (currentSum !== 100) {
      // Adjust the largest value to make the sum exactly 100%
      const largestItemIndex = normalizedValues
        .reduce((maxIndex, item, index, arr) => 
          item.percentage > arr[maxIndex].percentage ? index : maxIndex, 0);
      normalizedValues[largestItemIndex].percentage += (100 - currentSum);
    }
    
    return normalizedValues;
  };

  // Function to calculate median net worth based on wallet balance distribution
  const calculateMedianNetWorth = (balanceDistribution) => {
    // Define representative values for each range
    const rangeValues = {
      "<$100": 50,           // Midpoint of 0-100
      "$100-$500": 300,      // Midpoint of 100-500
      "$500-$1K": 750,       // Midpoint of 500-1000
      "$1K-$5K": 3000,       // Midpoint of 1000-5000
      "$5K-$10K": 7500,      // Midpoint of 5000-10000
      "$10K-$100K": 55000,   // Midpoint of 10000-100000
      ">$100K": 150000       // Representative value for >100K
    };
    
    // Calculate weighted average based on distribution percentages
    let totalWeight = 0;
    let weightedSum = 0;
    
    balanceDistribution.forEach(item => {
      const value = rangeValues[item.range];
      if (value) {
        weightedSum += value * item.percentage;
        totalWeight += item.percentage;
      }
    });
    
    if (totalWeight === 0) return 0;
    
    // Calculate weighted average
    const weightedAverage = weightedSum / totalWeight;
    
    // Format the result to a reasonable precision
    return Math.round(weightedAverage);
  };

  // Function to format a number as a dollar amount
  const formatDollarAmount = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  // Function to analyze transactions and create a distribution of transaction counts across wallets
  const analyzeTransactionCountDistribution = (transactions) => {
    // Create a map to count transactions per wallet
    const walletTransactionCounts = {};
    
    // Count transactions for each wallet (from_address)
    transactions.forEach(tx => {
      const wallet = tx.from_address;
      if (!wallet) return;
      
      if (!walletTransactionCounts[wallet]) {
        walletTransactionCounts[wallet] = 1;
      } else {
        walletTransactionCounts[wallet]++;
      }
    });
    
    // Convert to array of counts for analysis
    const counts = Object.values(walletTransactionCounts);
    
    // If no data, return empty buckets
    if (counts.length === 0) {
      return generateEmptyTransactionDistribution();
    }
    
    // Find min/max/mean
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    
    // Decide on bucketing strategy based on the data characteristics
    // If max is very large compared to mean, use logarithmic scale
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const median = [...counts].sort((a, b) => a - b)[Math.floor(counts.length / 2)];
    
    console.log(`Transaction count stats: min=${min}, max=${max}, mean=${mean.toFixed(2)}, median=${median}`);
    
    // Create 7 bucket ranges
    let bucketRanges;
    
    // If data is very skewed (common in blockchain data), use logarithmic bucketing
    if (max > mean * 10) {
      bucketRanges = createLogarithmicBuckets(min, max, 7);
    } else {
      bucketRanges = createLinearBuckets(min, max, 7);
    }
    
    // Initialize buckets with zero counts
    const distribution = bucketRanges.map(range => ({
      range: formatRangeLabel(range.min, range.max),
      percentage: 0
    }));
    
    // Assign wallet counts to buckets and calculate percentages
    counts.forEach(count => {
      const bucketIndex = findBucketIndex(count, bucketRanges);
      if (bucketIndex >= 0) {
        distribution[bucketIndex].percentage++;
      }
    });
    
    // Convert counts to percentages
    const totalWallets = counts.length;
    distribution.forEach(bucket => {
      bucket.percentage = parseFloat(((bucket.percentage / totalWallets) * 100).toFixed(1));
    });
    
    return distribution;
  };
  
  // Function to create logarithmic bucket ranges
  const createLogarithmicBuckets = (min, max, bucketCount) => {
    // Use log scale for very skewed distributions
    const logMin = Math.log(Math.max(1, min)); // Ensure min is at least 1 for log
    const logMax = Math.log(max);
    const logRange = (logMax - logMin) / bucketCount;
    
    const buckets = [];
    for (let i = 0; i < bucketCount; i++) {
      const logLower = logMin + (i * logRange);
      const logUpper = logMin + ((i + 1) * logRange);
      
      // Convert back from log scale
      const lower = i === 0 ? min : Math.round(Math.exp(logLower));
      const upper = i === bucketCount - 1 ? max : Math.round(Math.exp(logUpper) - 1);
      
      buckets.push({ min: lower, max: upper });
    }
    
    return buckets;
  };
  
  // Function to create linear bucket ranges
  const createLinearBuckets = (min, max, bucketCount) => {
    const range = max - min;
    const bucketSize = range / bucketCount;
    
    const buckets = [];
    for (let i = 0; i < bucketCount; i++) {
      const lower = i === 0 ? min : Math.round(min + (i * bucketSize));
      const upper = i === bucketCount - 1 ? max : Math.round(min + ((i + 1) * bucketSize) - 1);
      
      buckets.push({ min: lower, max: upper });
    }
    
    return buckets;
  };
  
  // Helper to format bucket range labels
  const formatRangeLabel = (min, max) => {
    if (min === max) {
      return `${min}`;
    } else if (max === Infinity || max > 1000000) {
      return `${min}+`;
    } else {
      return `${min}-${max}`;
    }
  };
  
  // Helper to find bucket index for a value
  const findBucketIndex = (value, bucketRanges) => {
    return bucketRanges.findIndex(bucket => 
      value >= bucket.min && value <= bucket.max
    );
  };
  
  // Generate empty transaction distribution (fallback)
  const generateEmptyTransactionDistribution = () => {
    return [
      { range: "1-5", percentage: 0 },
      { range: "6-10", percentage: 0 },
      { range: "11-20", percentage: 0 },
      { range: "21-50", percentage: 0 },
      { range: "51-100", percentage: 0 },
      { range: "101-500", percentage: 0 },
      { range: "500+", percentage: 0 }
    ];
  };

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
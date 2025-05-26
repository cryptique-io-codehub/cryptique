import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import axiosInstance from '../axiosInstance';
import { getChainConfig, isChainSupported, getDefaultTokenType } from '../utils/chainRegistry';

// Create the context
const ContractDataContext = createContext();

export const ContractDataProvider = ({ children }) => {
  // State for smart contract selection and data
  const [contractArray, setContractArray] = useState([]);
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [contractTransactions, setContractTransactions] = useState({});
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [showDemoData, setShowDemoData] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [updatingTransactions, setUpdatingTransactions] = useState(false);

  // Add ref to track last refresh time
  const lastRefreshTime = useRef(Date.now() - 60000);
  
  // Add ref to store wallet stats for each contract
  const walletStatsByContractRef = useRef({});
  
  // Create a ref for demo wallet stats
  const demoWalletStatsRef = useRef(null);
  
  // Create a ref for wallet balance distributions
  const walletBalanceDistributionRef = useRef({});

  // Add ref to store wallet categories for each contract
  const walletCategoriesByContractRef = useRef({});

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

        const response = await axiosInstance.get(`/contracts/team/${selectedTeam}`);
        
        if (response.data && response.data.contracts) {
          const contracts = response.data.contracts.map(contract => ({
            id: contract.contractId,
            address: contract.address,
            name: contract.name || `Contract ${contract.address.substring(0, 6)}...${contract.address.substring(contract.address.length - 4)}`,
            blockchain: contract.blockchain,
            tokenSymbol: contract.tokenSymbol
          }));
          
          setContractArray(contracts);
          // Select all contracts by default
          setSelectedContracts(contracts);
          
          // Fetch transactions for all contracts
          contracts.forEach(contract => {
            fetchContractTransactions(contract.id);
          });
          
          sessionStorage.setItem("preloadedContracts", JSON.stringify(contracts));
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
    if (!contractId) return;

    try {
      setIsLoadingTransactions(true);
      console.log(`Fetching transactions for contract ID: ${contractId}`);
      
      let allTransactions = [];
      let hasMore = true;
      let page = 1;
      const pageSize = 100000;
      
      while (hasMore) {
        const response = await axiosInstance.get(`/transactions/contract/${contractId}`, {
          params: { 
            limit: pageSize,
            page: page
          }
        });
        
        if (response.data && response.data.transactions) {
          const fetchedTransactions = response.data.transactions;
          allTransactions = [...allTransactions, ...fetchedTransactions];
          
          hasMore = response.data.metadata?.hasMore;
          if (fetchedTransactions.length < pageSize) {
            hasMore = false;
          }
          
          page++;
          if (page > 10) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      // Store transactions by contract ID
      setContractTransactions(prev => ({
        ...prev,
        [contractId]: allTransactions
      }));
      
      // After loading existing transactions, check for new ones
      const contract = contractArray.find(c => c.id === contractId);
      if (contract) {
        fetchLatestTransactions(contract, allTransactions);
      }
      
      return allTransactions;
    } catch (error) {
      console.error("Error fetching contract transactions:", error);
      return [];
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Handle contract selection/deselection
  const handleContractToggle = (contractId) => {
    setSelectedContracts(prev => {
      const isSelected = prev.some(c => c.id === contractId);
      if (isSelected) {
        return prev.filter(c => c.id !== contractId);
      } else {
        const contract = contractArray.find(c => c.id === contractId);
        if (contract) {
          return [...prev, contract];
        }
        return prev;
      }
    });
  };

  // Select/Deselect all contracts
  const handleSelectAllContracts = (selectAll) => {
    setSelectedContracts(selectAll ? [...contractArray] : []);
  };

  // Process contract transactions into meaningful data
  const processContractTransactions = () => {
    if (!selectedContracts.length || !contractTransactions || Object.keys(contractTransactions).length === 0) {
      return null;
    }

    // Aggregate data from all selected contracts
    const aggregatedData = selectedContracts.reduce((acc, contract) => {
      const transactions = contractTransactions[contract.id] || [];
      
      // Process transactions for this contract
      const contractData = processContractData(contract, transactions);
      
      // Merge data into accumulator
      return {
        uniqueUsers: acc.uniqueUsers + contractData.uniqueUsers,
        activeWallets: acc.activeWallets + contractData.activeWallets,
        uniqueReceivers: acc.uniqueReceivers + contractData.uniqueReceivers,
        totalVolume: acc.totalVolume + contractData.totalVolume,
        transactions: acc.transactions + transactions.length,
        // Add other metrics as needed
      };
    }, {
      uniqueUsers: 0,
      activeWallets: 0,
      uniqueReceivers: 0,
      totalVolume: 0,
      transactions: 0
    });

    return aggregatedData;
  };

  // Helper function to process individual contract data
  const processContractData = (contract, transactions) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    
    const uniqueWallets = new Set(transactions.map(tx => tx.from_address));
    const activeWallets = new Set(
      transactions
        .filter(tx => new Date(tx.block_time) >= thirtyDaysAgo)
        .map(tx => tx.from_address)
    );
    const uniqueReceivers = new Set(transactions.map(tx => tx.to_address));
    const totalVolume = transactions.reduce((sum, tx) => {
      const value = parseFloat(tx.value_eth) || 0;
      return isNaN(value) ? sum : sum + value;
    }, 0);

    return {
      uniqueUsers: uniqueWallets.size,
      activeWallets: activeWallets.size,
      uniqueReceivers: uniqueReceivers.size,
      totalVolume
    };
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
                
                setContractTransactions(prev => ({
                  ...prev,
                  [contract.id]: updatedTransactions
                }));
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

  // Add website change listener
  useEffect(() => {
    // Store current website ID for comparison
    let currentWebsiteId = localStorage.getItem("idy");
    
    // Function to check for website changes
    const checkWebsiteChange = () => {
      const newWebsiteId = localStorage.getItem("idy");
      
      if (newWebsiteId && newWebsiteId !== currentWebsiteId) {
        console.log(`Website ID changed in context from ${currentWebsiteId} to ${newWebsiteId}, refreshing contracts`);
        currentWebsiteId = newWebsiteId;
        
        // Reset cached transaction data since we're viewing a new website
        setContractTransactions({});
        
        // Refresh contract data for the new website
        refreshContracts();
      }
    };
    
    // Check for website changes every 2 seconds
    const intervalId = setInterval(checkWebsiteChange, 2000);
    
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

  // Wallet categorization logic - returns object with calculated percentages
  const categorizeWallets = (transactions) => {
    // If no data, return default values
    if (!transactions || transactions.length === 0) {
      return {
        airdropFarmers: 32,
        whales: 7,
        whalesVolumePercentage: 58,
        bridgeUsers: 15,
        topAirdropFarmers: [],
        topWhales: [],
        topBridgeUsers: []
      };
    }
    
    // Step 1: Count transactions and volume per wallet
    const walletStats = {};
    let totalVolume = 0;
    
    transactions.forEach(tx => {
      if (!tx.from_address) return;
      
      if (!walletStats[tx.from_address]) {
        walletStats[tx.from_address] = {
          address: tx.from_address,
          transactionCount: 0,
          volume: 0,
          approvals: 0,
          noValueTxs: 0
        };
      }
      
      walletStats[tx.from_address].transactionCount++;
      
      // Track volume
      if (tx.value_eth) {
        const txValue = parseFloat(tx.value_eth);
        if (!isNaN(txValue)) {
          walletStats[tx.from_address].volume += txValue;
          totalVolume += txValue;
        }
      } else {
        // Track transactions without value data (potential bridge transactions)
        walletStats[tx.from_address].noValueTxs++;
      }
      
      // Track approval transactions
      if (tx.method_name && (tx.method_name.toLowerCase().includes('approve') || 
                          tx.method_name.toLowerCase().includes('bridge') ||
                          tx.method_name.toLowerCase().includes('permit'))) {
        walletStats[tx.from_address].approvals++;
      }
    });
    
    // Step 2: Calculate wallet categories
    const walletAddresses = Object.keys(walletStats);
    const totalWallets = walletAddresses.length;
    
    if (totalWallets === 0) {
      return {
        airdropFarmers: 32,
        whales: 7,
        whalesVolumePercentage: 58,
        bridgeUsers: 15,
        topAirdropFarmers: [],
        topWhales: [],
        topBridgeUsers: []
      };
    }
    
    // Airdrop farmers: EXACTLY 1 transaction with token value <= 1
    const airdropFarmers = walletAddresses.filter(address => {
      const stats = walletStats[address];
      return stats.transactionCount === 1 && stats.volume <= 1;
    });
    
    // Extract top 10 airdrop farmers (or fewer if there aren't that many)
    // Sort by lowest volume first (most likely to be pure airdrop farmers)
    const sortedAirdropFarmers = [...airdropFarmers].sort((a, b) => 
      walletStats[a].volume - walletStats[b].volume
    );
    
    const topAirdropFarmers = sortedAirdropFarmers.slice(0, Math.min(10, sortedAirdropFarmers.length))
      .map(address => ({
        address,
        transactionCount: walletStats[address].transactionCount,
        volume: walletStats[address].volume
      }));
    
    // Whales: High volume wallets (top 7% by volume)
    const sortedByVolume = [...walletAddresses].sort((a, b) => 
      walletStats[b].volume - walletStats[a].volume
    );
    
    const whaleCount = Math.max(Math.ceil(totalWallets * 0.07), 1); // ~7% of wallets
    const whales = sortedByVolume.slice(0, whaleCount);
    
    // Extract top 10 whales
    const topWhales = whales.slice(0, Math.min(10, whales.length))
      .map(address => ({
        address,
        transactionCount: walletStats[address].transactionCount,
        volume: walletStats[address].volume
      }));
    
    // Calculate whale volume percentage
    const whaleVolume = whales.reduce((sum, address) => {
      const vol = walletStats[address]?.volume || 0;
      return sum + vol;
    }, 0);
    
    const whalesVolumePercentage = totalVolume > 0 
      ? Math.round((whaleVolume / totalVolume) * 100)
      : 58; // Default if no volume data
    
    // Bridge users: High percentage of transactions that are approvals or have no value
    const bridgeUsers = walletAddresses.filter(address => {
      const stats = walletStats[address];
      
      // Check if wallet has transactions
      if (stats.transactionCount === 0) return false;
      
      // Consider a wallet a bridge user if:
      // 1. More than 50% of transactions are approvals OR
      // 2. More than 50% of transactions have no value data
      return (stats.approvals / stats.transactionCount > 0.5) || 
             (stats.noValueTxs / stats.transactionCount > 0.5);
    });
    
    // Sort bridge users by approval count (descending)
    const sortedBridgeUsers = [...bridgeUsers].sort((a, b) => 
      (walletStats[b].approvals + walletStats[b].noValueTxs) - 
      (walletStats[a].approvals + walletStats[a].noValueTxs)
    );
    
    // Extract top 10 bridge users
    const topBridgeUsers = sortedBridgeUsers.slice(0, Math.min(10, sortedBridgeUsers.length))
      .map(address => ({
        address,
        transactionCount: walletStats[address].transactionCount,
        approvals: walletStats[address].approvals,
        noValueTxs: walletStats[address].noValueTxs
      }));
    
    // Calculate percentages
    return {
      airdropFarmers: Math.min(Math.round((airdropFarmers.length / totalWallets) * 100), 70),
      whales: Math.round((whales.length / totalWallets) * 100),
      whalesVolumePercentage,
      bridgeUsers: Math.min(Math.round((bridgeUsers.length / totalWallets) * 100), 60),
      topAirdropFarmers,
      topWhales,
      topBridgeUsers
    };
  };

  return (
    <ContractDataContext.Provider
      value={{
        contractArray,
        selectedContracts,
        contractTransactions,
        isLoadingContracts,
        isLoadingTransactions,
        showDemoData,
        updatingTransactions,
        loadingStatus,
        handleContractToggle,
        handleSelectAllContracts,
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
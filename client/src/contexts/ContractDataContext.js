import React, { createContext, useState, useContext, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { fetchBnbTransactions } from '../utils/chains/bnbChain';
import { fetchBaseTransactions } from '../utils/chains/baseChain';
import { fetchEthereumTransactions } from '../utils/chains/ethereumChain';
import { fetchPolygonTransactions } from '../utils/chains/polygonChain';
import { fetchArbitrumTransactions } from '../utils/chains/arbitrumChain';
import { fetchOptimismTransactions } from '../utils/chains/optimismChain';

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
          // Format contract data
          const contracts = response.data.contracts.map(contract => ({
            id: contract.contractId,
            address: contract.address,
            name: contract.name || `Contract ${contract.address.substring(0, 6)}...${contract.address.substring(contract.address.length - 4)}`,
            blockchain: contract.blockchain,
            tokenSymbol: contract.tokenSymbol
          }));
          
          setContractArray(contracts);
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
      
      // Use the appropriate chain-specific module based on blockchain
      switch (contract.blockchain) {
        case 'BNB Chain':
          setLoadingStatus(`Fetching new transactions from BscScan...`);
          console.log('Fetching new transactions from BscScan');
          const bnbResult = await fetchBnbTransactions(contract.address, {
            limit: 100000,
            startBlock: startBlock
          });
          
          if (bnbResult.transactions?.length > 0) {
            console.log(`Retrieved ${bnbResult.transactions.length} new transactions from BscScan`);
            // Update token symbol in transactions
            newTransactions = bnbResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('BEP20', contract.tokenSymbol || 'BEP20')
            }));
          } else {
            console.log('No new transactions found');
          }
          break;
          
        case 'Base':
          console.log('Using Base Chain module for new transactions');
          const baseResult = await fetchBaseTransactions(contract.address, {
            limit: 100000,
            startBlock: startBlock
          });
          
          if (baseResult.transactions?.length > 0) {
            // Update token symbol in transactions
            newTransactions = baseResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('ETH', contract.tokenSymbol || 'ETH')
            }));
            console.log(`Retrieved ${newTransactions.length} new transactions from Base API`);
          } else {
            console.log('No new transactions found or error:', baseResult.metadata?.message);
          }
          break;
          
        case 'Ethereum':
          console.log('Fetching new transactions from Etherscan');
          const ethResult = await fetchEthereumTransactions(contract.address, {
            limit: 100000,
            startBlock: startBlock
          });
          
          if (ethResult.transactions?.length > 0) {
            console.log(`Retrieved ${ethResult.transactions.length} new transactions from Etherscan`);
            // Update token symbol in transactions
            newTransactions = ethResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('ERC20', contract.tokenSymbol || 'ERC20')
            }));
          } else {
            console.log('No new transactions found or error:', ethResult.metadata?.message);
          }
          break;
          
        case 'Polygon':
          console.log('Fetching new transactions from Polygonscan');
          const polygonResult = await fetchPolygonTransactions(contract.address, {
            limit: 100000,
            startBlock: startBlock
          });
          
          if (polygonResult.transactions?.length > 0) {
            console.log(`Retrieved ${polygonResult.transactions.length} new transactions from Polygonscan`);
            // Update token symbol in transactions
            newTransactions = polygonResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('MATIC', contract.tokenSymbol || 'MATIC')
            }));
          } else {
            console.log('No new transactions found or error:', polygonResult.metadata?.message);
          }
          break;
          
        case 'Arbitrum':
          console.log('Fetching new transactions from Arbiscan');
          const arbitrumResult = await fetchArbitrumTransactions(contract.address, {
            limit: 100000,
            startBlock: startBlock
          });
          
          if (arbitrumResult.transactions?.length > 0) {
            console.log(`Retrieved ${arbitrumResult.transactions.length} new transactions from Arbiscan`);
            // Update token symbol in transactions
            newTransactions = arbitrumResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('ARB', contract.tokenSymbol || 'ARB')
            }));
          } else {
            console.log('No new transactions found or error:', arbitrumResult.metadata?.message);
          }
          break;
          
        case 'Optimism':
          console.log('Fetching new transactions from Optimistic Etherscan');
          const optimismResult = await fetchOptimismTransactions(contract.address, {
            limit: 100000,
            startBlock: startBlock
          });
          
          if (optimismResult.transactions?.length > 0) {
            console.log(`Retrieved ${optimismResult.transactions.length} new transactions from Optimistic Etherscan`);
            // Update token symbol in transactions
            newTransactions = optimismResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('OP', contract.tokenSymbol || 'OP')
            }));
          } else {
            console.log('No new transactions found or error:', optimismResult.metadata?.message);
          }
          break;
          
        default:
          console.log(`${contract.blockchain} chain not fully implemented yet for transaction fetching`);
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
          
          // If we saved any new transactions, fetch all transactions again
          if (totalSaved > 0) {
            setLoadingStatus(`Added ${totalSaved} new transactions. Refreshing data...`);
            
            // Fetch all transactions again to include the new ones
            const updatedTransactionsResponse = await axiosInstance.get(`/transactions/contract/${contract.id}`, {
              params: { 
                limit: 100000,
                page: 1
              }
            });
            
            if (updatedTransactionsResponse.data && updatedTransactionsResponse.data.transactions) {
              const updatedTransactions = updatedTransactionsResponse.data.transactions;
              
              setContractTransactions(updatedTransactions);
              console.log(`Refreshed transaction list, now showing ${updatedTransactions.length} transactions`);
              
              // Print transaction count information
              console.log('======== TRANSACTION COUNT SUMMARY ========');
              console.log(`Before update: ${existingTransactions.length} transactions`);
              console.log(`New transactions saved: ${totalSaved}`);
              console.log(`After update: ${updatedTransactions.length} transactions`);
              console.log(`Net increase: ${updatedTransactions.length - existingTransactions.length} transactions`);
              console.log('==========================================');
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
    
    // Get current date and dates for time-based calculations
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    
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
    
    // Filter transactions for the last 7 and 30 days
    const transactionsLast7Days = contractTransactions.filter(tx => {
      const txDate = new Date(tx.block_time);
      return txDate >= sevenDaysAgo && txDate <= now;
    });
    
    const transactionsLast30Days = contractTransactions.filter(tx => {
      const txDate = new Date(tx.block_time);
      return txDate >= thirtyDaysAgo && txDate <= now;
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
    
    // Create processed data object with metrics extracted from transactions
    const processedData = {
      contractInfo: {
        address: selectedContract.address,
        name: selectedContract.name,
        blockchain: selectedContract.blockchain,
        tokenSymbol: selectedContract.tokenSymbol || 'Unknown',
        totalTransactions: contractTransactions.length
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
        last30Days: transactionsLast30Days.length
      },
      recentVolume: {
        last7Days: volumeLast7Days.toFixed(2),
        last30Days: volumeLast30Days.toFixed(2)
      },
      walletAgeData: walletAgeData,
      medianWalletStats: {
        age: `${avgWalletAgeInYears.toFixed(1)} Years`,
        netWorth: "$945" // Placeholder - would need external data source
      },
      // Add more processed data as needed for charts
    };
    
    return processedData;
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
        processContractTransactions
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
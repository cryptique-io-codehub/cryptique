import React, { createContext, useState, useContext, useEffect } from 'react';
import axiosInstance from '../axiosInstance';

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
      return allTransactions;
    } catch (error) {
      console.error("Error fetching contract transactions:", error);
      setShowDemoData(true); // Fallback to demo data on error
      return [];
    } finally {
      setIsLoadingTransactions(false);
    }
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
        uniqueUsers: new Set(contractTransactions.map(tx => tx.from_address)).size,
        uniqueReceivers: new Set(contractTransactions.map(tx => tx.to_address)).size,
        totalVolume: contractTransactions.reduce((sum, tx) => {
          const value = parseFloat(tx.value_eth) || 0;
          return isNaN(value) ? sum : sum + value;
        }, 0)
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
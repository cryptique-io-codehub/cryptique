import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Web3 from 'web3';
import { fetchBnbTransactions } from '../../utils/chains/bnbChain';
import { fetchBaseTransactions } from '../../utils/chains/baseChain';
import { isValidAddress } from '../../utils/chainUtils';
import axiosInstance from '../../axiosInstance';

// ABI for ERC20/BEP20 token interface - minimal version for what we need
const ERC20_ABI = [
  // Get token name
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  // Get token symbol
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  // Get token decimals
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  // Get token total supply
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  // Get token balance
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  // Transfer tokens
  {
    "constant": false,
    "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const SmartContractFilters = ({ contractarray, setcontractarray, selectedContract, setSelectedContract }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [contractName, setContractName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [blockchain, setBlockchain] = useState('Ethereum');
  const [contractError, setContractError] = useState('');
  const [addingContract, setAddingContract] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [web3, setWeb3] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState({});
  const [isFetchingTransactions, setIsFetchingTransactions] = useState(false);

  // Initialize web3 when component mounts
  useEffect(() => {
    const initWeb3 = () => {
      try {
        // Try using modern dapp browsers
        if (window.ethereum) {
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);
          return web3Instance;
        }
        // Legacy dapp browsers
        else if (window.web3) {
          const web3Instance = new Web3(window.web3.currentProvider);
          setWeb3(web3Instance);
          return web3Instance;
        }
        // Fallback to a public provider
        else {
          const provider = new Web3.providers.HttpProvider(
            "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
          );
          const web3Instance = new Web3(provider);
          setWeb3(web3Instance);
          return web3Instance;
        }
      } catch (error) {
        console.error("Error initializing Web3:", error);
        return null;
      }
    };

    initWeb3();
  }, []);

  // Load contracts from API on component mount
  useEffect(() => {
    fetchContractsFromAPI();
  }, []);

  // Polling effect for transactions
  useEffect(() => {
    if (!selectedContract) return;
    
    const POLLING_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    // Fetch transactions initially if not already loaded
    if (!transactions[selectedContract.id]) {
      fetchTransactionsForContract(selectedContract);
    }
    
    // Set up interval for polling
    const intervalId = setInterval(() => {
      fetchTransactionsForContract(selectedContract, true);
    }, POLLING_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [selectedContract, transactions]);

  const fetchTransactionsForContract = async (contract, isPolling = false) => {
    if (!contract || !contract.id) {
      console.error("No valid contract provided for fetching transactions");
      return;
    }
    
    setIsFetchingTransactions(true);
    
    try {
      // First, check if we already have transactions for this contract
      if (!isPolling && transactions[contract.id]) {
        console.log(`Using cached transactions for contract ${contract.id}`);
        setIsFetchingTransactions(false);
        return transactions[contract.id];
      }
      
      // For polling or initial fetch, get the latest block number
      let startBlock;
      if (isPolling) {
        try {
          const latestBlockResponse = await axiosInstance.get(`/transactions/contract/${contract.id}/latest-block`);
          startBlock = latestBlockResponse.data.latestBlockNumber;
        } catch (error) {
          console.warn("Could not get latest block number, will fetch new transactions anyway");
        }
      }
      
      // Fetch transactions from blockchain
      let newTransactions = [];
      
      console.log(`Fetching transactions for contract: ${contract.address} on ${contract.blockchain}`);
      
      // Use the appropriate chain-specific module based on blockchain
      switch (contract.blockchain) {
        case 'BNB Chain':
          console.log('Fetching up to 10,000 transactions from BscScan');
          const bnbResult = await fetchBnbTransactions(contract.address, {
            limit: 10000,
            startBlock: startBlock
          });
          
          if (bnbResult.transactions?.length > 0) {
            console.log(`Retrieved ${bnbResult.transactions.length} transactions from BscScan`);
            // Update token symbol in transactions
            newTransactions = bnbResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('BEP20', contract.tokenSymbol || 'BEP20')
            }));
            console.log('Transactions:', newTransactions);
          } else {
            console.log('No transactions found or there was an error:', bnbResult.metadata?.message);
          }
          break;
          
        case 'Base':
          console.log('Using Base Chain module');
          const baseTransactions = await fetchBaseTransactions(contract.address, {
            limit: 10000,
            startBlock: startBlock
          });
          // Update token symbol in transactions
          newTransactions = baseTransactions.map(tx => ({
            ...tx,
            token_symbol: contract.tokenSymbol || tx.token_symbol,
            value_eth: tx.value_eth.replace('ETH', contract.tokenSymbol || 'ETH')
          }));
          break;
          
        case 'Ethereum':
        default:
          console.log(`${contract.blockchain} chain not fully implemented yet`);
          newTransactions = [];
      }
      
      if (newTransactions.length > 0) {
        // Save transactions to API
        try {
          await axiosInstance.post(`/transactions/contract/${contract.id}`, {
            transactions: newTransactions
          });
          console.log(`Saved ${newTransactions.length} transactions to API`);
        } catch (error) {
          console.error("Error saving transactions to API:", error);
        }
        
        // Fetch all transactions from API to ensure we have the complete set
        try {
          const response = await axiosInstance.get(`/transactions/contract/${contract.id}`, {
            params: { limit: 10000 }
          });
          
          if (response.data && response.data.transactions) {
            setTransactions(prev => ({
              ...prev,
              [contract.id]: response.data.transactions
            }));
            
            console.log(`Loaded ${response.data.transactions.length} total transactions from API`);
            setIsFetchingTransactions(false);
            return response.data.transactions;
          }
        } catch (error) {
          console.error("Error fetching transactions from API:", error);
        }
      }
      
      setIsFetchingTransactions(false);
      return newTransactions;
    } catch (error) {
      console.error(`Error fetching transactions for ${contract.address}:`, error);
      setIsFetchingTransactions(false);
      return [];
    }
  };

  const handleSelectContract = async (contract) => {
    // Set as the primary selected contract
    setSelectedContract(contract);
    
    // Add to the array of selected contracts if not already there
    if (!selectedContracts.find(c => c.id === contract.id)) {
      setSelectedContracts([...selectedContracts, contract]);
    }
    
    // NOTE: Removed explicit fetchTransactionsForContract call here
    // The useEffect hook will handle fetching transactions when selectedContract changes
    
    setShowDropdown(false);
  };

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleRemoveContract = (contractId, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    // Remove from selected contracts
    const updatedSelectedContracts = selectedContracts.filter(c => c.id !== contractId);
    setSelectedContracts(updatedSelectedContracts);
    
    // If this was the primary selected contract, update it
    if (selectedContract?.id === contractId) {
      // If there are other selected contracts, set the first one as primary
      if (updatedSelectedContracts.length > 0) {
        setSelectedContract(updatedSelectedContracts[0]);
        // The useEffect hook will handle fetching transactions when selectedContract changes
      } else {
        setSelectedContract(null);
      }
    }
  };

  const handleOpenAddContractModal = () => {
    setShowAddContractModal(true);
    setShowDropdown(false);
    setContractAddress('');
    setContractName('');
    setTokenSymbol('');
    setBlockchain('Ethereum');
    setContractError('');
  };

  const handleCloseAddContractModal = () => {
    setShowAddContractModal(false);
    setContractError('');
  };

  const verifySmartContract = async () => {
    if (!contractAddress) {
      setContractError('Please enter a contract address');
      return false;
    }

    // Validate contract address format
    if (!isValidAddress(contractAddress)) {
      setContractError('Invalid contract address format');
      return false;
    }

    setAddingContract(true);
    setContractError('');
    
    try {
      // Create contract instance
      const contract = new web3.eth.Contract(ERC20_ABI, contractAddress);
      
      // Get token symbol if not manually provided
      let finalTokenSymbol = tokenSymbol;
      if (!finalTokenSymbol) {
        try {
          finalTokenSymbol = await contract.methods.symbol().call();
        } catch (error) {
          console.warn("Could not fetch token symbol, using default:", error);
          // Use default token symbol based on blockchain
          switch (blockchain) {
            case 'Ethereum':
              finalTokenSymbol = 'ETH';
              break;
            case 'BNB Chain':
              finalTokenSymbol = 'BNB';
              break;
            case 'Base':
              finalTokenSymbol = 'ETH';
              break;
            case 'Polygon':
              finalTokenSymbol = 'MATIC';
              break;
            case 'Arbitrum':
              finalTokenSymbol = 'ETH';
              break;
            case 'Optimism':
              finalTokenSymbol = 'ETH';
              break;
            default:
              finalTokenSymbol = 'ETH';
          }
        }
      }

      // Create new contract object
      const contractId = `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newContract = {
        id: contractId,
        address: contractAddress,
        name: contractName || `Contract ${contractAddress.substr(0, 6)}...${contractAddress.substr(-4)}`,
        blockchain: blockchain,
        tokenSymbol: finalTokenSymbol,
        added_at: new Date().toISOString(),
        verified: true
      };
      
      // Save contract to API
      const savedContract = await saveContractToAPI(newContract);
      
      // Use the saved contract if API call was successful
      const contractToAdd = savedContract || newContract;
      
      // Update contract array
      const updatedContracts = [...contractarray, contractToAdd];
      setcontractarray(updatedContracts);
      
      // Update selected contracts
      setSelectedContracts([...selectedContracts, contractToAdd]);
      
      // Set as primary selected contract
      setSelectedContract(contractToAdd);
      
      setAddingContract(false);
      setShowAddContractModal(false);
      
      // The useEffect hook will handle fetching transactions when selectedContract changes
      
      return true;
    } catch (error) {
      console.error("Error adding smart contract:", error);
      setContractError(`Error adding contract: ${error.message}`);
      setAddingContract(false);
      return false;
    }
  };

  const handleAddContract = async (e) => {
    e.preventDefault();
    
    // Check if this contract is already in the array
    const isDuplicate = contractarray.some(contract => 
      contract.address.toLowerCase() === contractAddress.toLowerCase() && 
      contract.blockchain === blockchain
    );
    
    if (isDuplicate) {
      setContractError('This contract is already in your list for this blockchain');
      return;
    }
    
    // Verify and add the contract
    const success = await verifySmartContract();
    
    if (success) {
      console.log("Contract added successfully");
    }
  };

  const formatContractDisplay = (contract) => {
    const displayName = contract.name || contract.address;
    const shortAddress = `${contract.address.substring(0, 6)}...${contract.address.substring(contract.address.length - 4)}`;
    
    return {
      name: displayName,
      shortAddress: shortAddress,
      fullAddress: contract.address,
      blockchain: contract.blockchain,
      tokenSymbol: contract.tokenSymbol
    };
  };

  const handleDeleteContract = (contract) => {
    setContractToDelete(contract);
    setShowDeleteModal(true);
    setShowDropdown(false);
  };

  const confirmDeleteContract = async () => {
    if (!contractToDelete) return;

    try {
      // Delete from API first
      const apiSuccess = await deleteContractFromAPI(contractToDelete.id);
      
      // Remove from contract array
      const updatedContracts = contractarray.filter(c => c.id !== contractToDelete.id);
      setcontractarray(updatedContracts);

      // Remove from selected contracts
      const updatedSelectedContracts = selectedContracts.filter(c => c.id !== contractToDelete.id);
      setSelectedContracts(updatedSelectedContracts);

      // If this was the primary selected contract, update it
      if (selectedContract?.id === contractToDelete.id) {
        if (updatedSelectedContracts.length > 0) {
          setSelectedContract(updatedSelectedContracts[0]);
        } else {
          setSelectedContract(null);
        }
      }

      // If API failed, save to localStorage as fallback
      if (!apiSuccess) {
        // Save the updated contracts to localStorage
        try {
          const currentTeam = localStorage.getItem('selectedTeam');
          if (currentTeam) {
            const storageKey = `contracts_${currentTeam}`;
            localStorage.setItem(storageKey, JSON.stringify(updatedContracts));
            console.log(`Saved ${updatedContracts.length} contracts to storage after deletion`);
          }
        } catch (error) {
          console.error("Error saving contracts to storage after deletion:", error);
        }
      }
    } catch (error) {
      console.error("Error in deletion process:", error);
    }

    setShowDeleteModal(false);
    setContractToDelete(null);
  };

  const cancelDeleteContract = () => {
    setShowDeleteModal(false);
    setContractToDelete(null);
  };

  // Fetch contracts from API
  const fetchContractsFromAPI = async () => {
    try {
      setIsLoading(true);
      const currentTeam = localStorage.getItem('selectedTeam');
      if (!currentTeam) {
        setIsLoading(false);
        return;
      }

      const response = await axiosInstance.get(`/contracts/team/${currentTeam}`);
      
      if (response.data && response.data.contracts) {
        // Convert API contract format to local format
        const apiContracts = response.data.contracts.map(contract => ({
          id: contract.contractId,
          address: contract.address,
          name: contract.name,
          blockchain: contract.blockchain,
          tokenSymbol: contract.tokenSymbol,
          added_at: contract.createdAt,
          verified: contract.verified
        }));
        
        setcontractarray(apiContracts);
        console.log(`Loaded ${apiContracts.length} contracts from API for team ${currentTeam}`);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching contracts from API:", error);
      // Fallback to localStorage if API fails
      loadContractsFromLocalStorage();
      setIsLoading(false);
    }
  };

  // Fallback function to load contracts from localStorage
  const loadContractsFromLocalStorage = () => {
    try {
      const currentTeam = localStorage.getItem('selectedTeam');
      if (!currentTeam) return;

      const storageKey = `contracts_${currentTeam}`;
      const storedContracts = localStorage.getItem(storageKey);
      
      if (storedContracts) {
        const contracts = JSON.parse(storedContracts);
        setcontractarray(contracts);
        console.log(`Loaded ${contracts.length} contracts from localStorage for team ${currentTeam}`);
      } else {
        console.log(`No contracts found in localStorage for team ${currentTeam}`);
      }
    } catch (error) {
      console.error("Error loading contracts from localStorage:", error);
    }
  };

  // Save contracts to API
  const saveContractToAPI = async (contract) => {
    try {
      const currentTeam = localStorage.getItem('selectedTeam');
      if (!currentTeam) return null;

      const response = await axiosInstance.post('/contracts', {
        teamName: currentTeam,
        address: contract.address,
        name: contract.name,
        blockchain: contract.blockchain,
        tokenSymbol: contract.tokenSymbol
      });

      if (response.data && response.data.contract) {
        // Return the contract with API ID
        return {
          ...contract,
          id: response.data.contract.contractId
        };
      }
      return null;
    } catch (error) {
      console.error("Error saving contract to API:", error);
      return null;
    }
  };

  // Delete contract from API
  const deleteContractFromAPI = async (contractId) => {
    try {
      await axiosInstance.delete(`/contracts/${contractId}`);
      return true;
    } catch (error) {
      console.error("Error deleting contract from API:", error);
      return false;
    }
  };

  return (
    <div className="smart-contract-filters relative">
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Loading contracts...</span>
        </div>
      ) : (
        <div className="relative inline-block text-left">
          <div>
            <button
              type="button"
              className="inline-flex w-full justify-between gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              onClick={handleDropdownToggle}
              aria-expanded={showDropdown}
              aria-haspopup="true"
            >
              {selectedContract 
                ? formatContractDisplay(selectedContract).name
                : "Select Smart Contract"}
              <svg className="-mr-1 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {showDropdown && (
            <div className="absolute left-0 z-10 mt-2 w-72 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1 max-h-96 overflow-y-auto">
                {contractarray && contractarray.length > 0 ? (
                  contractarray.map((contract) => {
                    const display = formatContractDisplay(contract);
                    const isSelected = selectedContracts.some(c => c.id === contract.id);
                    
                    return (
                      <div 
                        key={contract.id} 
                        className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                        onClick={() => handleSelectContract(contract)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900 truncate mr-2">{display.name}</span>
                            <span className="text-xs text-gray-500 truncate">({display.shortAddress})</span>
                          </div>
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-500 mr-2">[{display.blockchain}]</span>
                            <span className="text-xs text-gray-500">({display.tokenSymbol})</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContract(contract);
                          }}
                          className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0 p-1 rounded-full hover:bg-red-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">No smart contracts found</div>
                )}
                <div className="border-t border-gray-100"></div>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-gray-50 flex items-center"
                  onClick={handleOpenAddContractModal}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add new smart contract
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected contracts display */}
      {selectedContracts.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedContracts.map((contract) => {
            const display = formatContractDisplay(contract);
            return (
              <div 
                key={contract.id} 
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
              >
                <span className="mr-2">{display.name}</span>
                <span className="text-xs text-gray-500">({display.shortAddress})</span>
                <button
                  onClick={(e) => handleRemoveContract(contract.id, e)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Smart Contract Modal */}
      {showAddContractModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Add Smart Contract
                    </h3>
                    <div className="mt-4">
                      <form onSubmit={handleAddContract}>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Contract Address
                          </label>
                          <input
                            type="text"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="0x..."
                            value={contractAddress}
                            onChange={(e) => setContractAddress(e.target.value)}
                            required
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Name (Optional)
                          </label>
                          <input
                            type="text"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="MyContract"
                            value={contractName}
                            onChange={(e) => setContractName(e.target.value)}
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Token Symbol (Optional)
                          </label>
                          <input
                            type="text"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="ETH"
                            value={tokenSymbol}
                            onChange={(e) => setTokenSymbol(e.target.value)}
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            If left empty, the system will try to fetch the symbol from the contract or use a default based on the blockchain.
                          </p>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Blockchain
                          </label>
                          <select
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={blockchain}
                            onChange={(e) => setBlockchain(e.target.value)}
                          >
                            <option value="Ethereum">Ethereum</option>
                            <option value="BNB Chain">BNB Chain</option>
                            <option value="Base">Base</option>
                            <option value="Polygon">Polygon</option>
                            <option value="Arbitrum">Arbitrum</option>
                            <option value="Optimism">Optimism</option>
                          </select>
                        </div>
                        {contractError && (
                          <div className="mb-4 text-sm text-red-600">{contractError}</div>
                        )}
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                            disabled={addingContract}
                          >
                            {addingContract ? 'Adding...' : 'Add Smart Contract'}
                          </button>
                          <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                            onClick={handleCloseAddContractModal}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Smart Contract
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this smart contract? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={confirmDeleteContract}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={cancelDeleteContract}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFetchingTransactions && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 z-40 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          <span className="text-sm text-gray-600">Syncing transactions...</span>
        </div>
      )}
    </div>
  );
};

export default SmartContractFilters;
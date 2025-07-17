import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Web3 from 'web3';
import { fetchBnbTransactions } from '../../utils/chains/bnbChain';
import { fetchBaseTransactions } from '../../utils/chains/baseChain';
import { fetchEthereumTransactions } from '../../utils/chains/ethereumChain';
import { fetchPolygonTransactions } from '../../utils/chains/polygonChain';
import { fetchArbitrumTransactions } from '../../utils/chains/arbitrumChain';
import { fetchOptimismTransactions } from '../../utils/chains/optimismChain';
import { isValidAddress } from '../../utils/chainUtils';
import axiosInstance from '../../axiosInstance';
import { useContractData } from '../../contexts/ContractDataContext';

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

const SmartContractFilters = ({ contractarray, setcontractarray, selectedContract: propSelectedContract, setSelectedContract: propSetSelectedContract }) => {
  // Get data and methods from context
  const { 
    contractArray: contextContractArray, 
    selectedContract: contextSelectedContract, 
    selectedContracts: contextSelectedContracts,
    handleContractChange,
    handleMultipleContractSelection,
    isLoadingContracts: contextIsLoading,
    isLoadingTransactions,
    refreshContracts
  } = useContractData();

  // We'll still use the local component state for UI controls
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [contractName, setContractName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [blockchain, setBlockchain] = useState('Ethereum');
  const [contractType, setContractType] = useState('main');
  const [stakingDetails, setStakingDetails] = useState({
    rewardToken: '',
    stakingToken: '',
    lockPeriod: '',
    apy: '',
    minimumStake: '',
    totalStaked: '',
    totalRewards: ''
  });
  const [contractError, setContractError] = useState('');
  const [addingContract, setAddingContract] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState(contextSelectedContracts || []);
  const [web3, setWeb3] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [processingStep, setProcessingStep] = useState('');
  const teamRef = useRef(null);
  
  // For backwards compatibility with existing code
  const [transactions, setTransactions] = useState({});
  const [isFetchingTransactions, setIsFetchingTransactions] = useState(false);

  // Keep the component props in sync with the context
  useEffect(() => {
    if (contextContractArray?.length > 0) {
      setcontractarray(contextContractArray);
    }
  }, [contextContractArray, setcontractarray]);

  useEffect(() => {
    if (contextSelectedContract) {
      propSetSelectedContract(contextSelectedContract);
    } else {
      propSetSelectedContract(null);
    }
  }, [contextSelectedContract, propSetSelectedContract]);

  // Sync selected contracts with context
  useEffect(() => {
    if (contextSelectedContracts && contextSelectedContracts.length !== selectedContracts.length) {
      setSelectedContracts(contextSelectedContracts);
    }
  }, [contextSelectedContracts]);

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

  // Add an effect to watch for team changes
  useEffect(() => {
    // Track the current team
    const currentTeam = localStorage.getItem("selectedTeam");
    teamRef.current = currentTeam;
    
    // Function to handle team changes
    const handleTeamChange = () => {
      const newTeam = localStorage.getItem("selectedTeam");
      if (newTeam && newTeam !== teamRef.current) {
        console.log(`Team changed from ${teamRef.current} to ${newTeam}, refreshing contract data`);
        teamRef.current = newTeam;
        
        // Force reload contract data
        forceLoadContractData();
      }
    };
    
    // Check for team changes every second
    const intervalId = setInterval(handleTeamChange, 1000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Add the forceLoadContractData function as a named function in the component
  // This will be easier to call from other places
  const forceLoadContractData = async () => {
    try {
      console.log("Forcefully loading contract data on demand");
      const selectedTeam = localStorage.getItem("selectedTeam");
      
      if (!selectedTeam) {
        console.log("No team selected, can't load contracts");
        return;
      }

      // Force fetch from API regardless of cache
      const response = await axiosInstance.get(`/contracts/team/${selectedTeam}`);
      
      if (response.data && response.data.contracts) {
        // Format contract data
        const contracts = response.data.contracts.map(contract => {
          const contractType = contract.contractType || 'main';
          console.log(`Loading contract: ${contract.name} with type: ${contractType} (raw: ${contract.contractType})`);
          
          return {
          id: contract.contractId,
          address: contract.address,
          name: contract.name || `Contract ${contract.address.substring(0, 6)}...${contract.address.substring(contract.address.length - 4)}`,
          blockchain: contract.blockchain,
            tokenSymbol: contract.tokenSymbol,
            contractType: contractType,
            stakingDetails: contract.stakingDetails || null
          };
        });
        
        // Update state and session storage
        setcontractarray(contracts);
        sessionStorage.setItem("preloadedContracts", JSON.stringify(contracts));
        
        console.log(`Forcefully loaded ${contracts.length} contracts on demand`);
      }
    } catch (error) {
      console.error("Error forcefully loading contract data:", error);
    }
  };

  // Update the useEffect to use this function
  useEffect(() => {
    forceLoadContractData();
  }, [setcontractarray]);

  // Function to handle contract selection that works with both props and context
  const handleSelectContract = async (contract) => {
    // Update the context (this will also fetch transactions)
    handleContractChange(contract.id);
    
    // Close the dropdown
    setShowDropdown(false);
  };

  const handleDropdownToggle = () => {
    // If we're opening the dropdown, refresh contract data
    if (!showDropdown) {
      console.log("Smart contract dropdown opened, checking cache first");
      
      // Check if we have cached data and it's recent
      const cachedContracts = sessionStorage.getItem("preloadedContracts");
      if (cachedContracts) {
        try {
          const contracts = JSON.parse(cachedContracts);
          setcontractarray(contracts);
          console.log(`Using cached contracts, loaded ${contracts.length} contracts`);
          setShowDropdown(true);
          return;
        } catch (error) {
          console.error("Error parsing cached contracts:", error);
          // Continue with API call if cache parsing fails
        }
      }
      
      // Only fetch if no cached data available or parsing failed
      const selectedTeam = localStorage.getItem("selectedTeam");
      if (selectedTeam) {
        try {
          // Use throttling - check if we've refreshed recently (within 10 seconds)
          const now = Date.now();
          const lastRefreshTime = parseInt(sessionStorage.getItem("lastContractRefreshTime") || "0");
          
          if (now - lastRefreshTime < 10000) {
            console.log("Contract refresh throttled - using existing data");
            setShowDropdown(true);
            return;
          }
          
          // Trigger a refresh of contract data in the context
          if (typeof refreshContracts === 'function') {
            refreshContracts();
          } else {
            // Fallback if context function not available
            forceLoadContractData();
          }
          
          // Update last refresh time
          sessionStorage.setItem("lastContractRefreshTime", now.toString());
        } catch (error) {
          console.error("Error refreshing contract data:", error);
        }
      }
    }
    
    setShowDropdown(!showDropdown);
  };

  const handleToggleContract = (contract) => {
    const isSelected = selectedContracts.some(c => c.id === contract.id);
    let updatedContracts;
    
    if (isSelected) {
      // Remove from selection
      updatedContracts = selectedContracts.filter(c => c.id !== contract.id);
    } else {
      // Add to selection
      updatedContracts = [...selectedContracts, contract];
    }
    
    setSelectedContracts(updatedContracts);
    
    // Update the context with the new multi-contract selection
    handleMultipleContractSelection(updatedContracts);
    
    // For backward compatibility, set the first contract as the active one
    if (updatedContracts.length > 0) {
      handleContractChange(updatedContracts[0].id);
    } else {
      handleContractChange('');
    }
  };

  const handleClearAllContracts = () => {
    setSelectedContracts([]);
    // Update the context
    handleMultipleContractSelection([]);
    // Reset the context to show demo data
    handleContractChange('');
  };

  const handleRemoveContract = (contractId, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    // Remove from selected contracts array
    const updatedSelectedContracts = selectedContracts.filter(c => c.id !== contractId);
    setSelectedContracts(updatedSelectedContracts);
    
    // Update the context
    handleMultipleContractSelection(updatedSelectedContracts);
    
    // If this was the currently selected contract in context, reset to the first remaining or empty
    if (contextSelectedContract?.id === contractId) {
      if (updatedSelectedContracts.length > 0) {
        handleContractChange(updatedSelectedContracts[0].id);
      } else {
        handleContractChange('');
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
    setContractType('main');
    setStakingDetails({
      rewardToken: '',
      stakingToken: '',
      lockPeriod: '',
      apy: '',
      minimumStake: '',
      totalStaked: '',
      totalRewards: ''
    });
    setContractError('');
  };

  const handleCloseAddContractModal = () => {
    setShowAddContractModal(false);
    setContractError('');
  };

  const handleDeleteContract = (contract) => {
    setContractToDelete(contract);
    setShowDeleteModal(true);
    setShowDropdown(false);
  };

  const confirmDeleteContract = async () => {
    if (!contractToDelete) return;

    try {
      // First delete all transactions associated with this contract
      try {
        console.log(`Deleting all transactions for contract ${contractToDelete.id}...`);
        await axiosInstance.delete(`/transactions/contract/${contractToDelete.id}`);
        console.log(`Successfully deleted all transactions for contract ${contractToDelete.id}`);
      } catch (txError) {
        console.error(`Error deleting transactions for contract ${contractToDelete.id}:`, txError);
        // Continue with deletion even if transaction deletion fails
      }
      
      // Delete contract from API
      const apiSuccess = await deleteContractFromAPI(contractToDelete.id);
      
      // Remove from contract array
      const updatedContracts = contractarray.filter(c => c.id !== contractToDelete.id);
      setcontractarray(updatedContracts);

      // Remove from selected contracts
      const updatedSelectedContracts = selectedContracts.filter(c => c.id !== contractToDelete.id);
      setSelectedContracts(updatedSelectedContracts);
          
      // If this was the primary selected contract, update it
      if (propSelectedContract?.id === contractToDelete.id) {
        if (updatedSelectedContracts.length > 0) {
          propSetSelectedContract(updatedSelectedContracts[0]);
        } else {
          propSetSelectedContract(null);
        }
      }

      // Also clear the transactions from local state
      setTransactions(prev => {
        const updated = {...prev};
        delete updated[contractToDelete.id];
        return updated;
      });

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

  const formatContractDisplay = (contract) => {
    const displayName = contract.name || contract.address;
    const shortAddress = `${contract.address.substring(0, 6)}...${contract.address.substring(contract.address.length - 4)}`;
                        const contractTypeLabel = contract.contractType === 'escrow' ? ' (Staking)' : '';
    
    return {
      name: displayName + contractTypeLabel,
      shortAddress: shortAddress,
      fullAddress: contract.address,
      blockchain: contract.blockchain,
      tokenSymbol: contract.tokenSymbol,
      contractType: contract.contractType || 'main'
    };
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
      
      // Close the modal
      handleCloseAddContractModal();
    }
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
    setIsFetchingTransactions(true);
    setLoadingStatus('Verifying smart contract...');
    setProcessingStep('verifying');
    setLoadingProgress({ current: 0, total: 100 });
    
    try {
      // Create contract instance
      setLoadingStatus('Creating contract instance...');
      setLoadingProgress({ current: 10, total: 100 });
      const contract = new web3.eth.Contract(ERC20_ABI, contractAddress);
      
      // Get token symbol if not manually provided
      let finalTokenSymbol = tokenSymbol;
      if (!finalTokenSymbol) {
        try {
          setLoadingStatus('Fetching token symbol...');
          setLoadingProgress({ current: 20, total: 100 });
          finalTokenSymbol = await contract.methods.symbol().call();
        } catch (error) {
          console.warn("Could not fetch token symbol, using default:", error);
          setLoadingStatus('Could not fetch token symbol, using default...');
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

      setLoadingStatus('Creating contract object...');
      setLoadingProgress({ current: 30, total: 100 });

      // Create new contract object
      const newContract = {
        address: contractAddress,
        name: contractName || `Contract ${contractAddress.substr(0, 6)}...${contractAddress.substr(-4)}`,
        blockchain: blockchain,
        tokenSymbol: finalTokenSymbol,
        contractType: contractType,

        added_at: new Date().toISOString(),
        verified: true
      };
      
      // Save contract to API
      setLoadingStatus('Saving contract to database...');
      setLoadingProgress({ current: 50, total: 100 });
      const savedContract = await saveContractToAPI(newContract);
      
      // Use the saved contract if API call was successful
      if (!savedContract) {
        console.error('Failed to save contract to API, cannot proceed');
        setContractError('Failed to save contract to database. Please try again.');
        setAddingContract(false);
        setIsFetchingTransactions(false);
        setLoadingStatus('Error: Failed to save contract');
        return false;
      }
      
      const contractToAdd = savedContract;
      
      console.log('Contract to add:', contractToAdd);
      console.log('Contract ID:', contractToAdd.id);
      console.log('Contract contractId:', contractToAdd.contractId);
      
      // Update contract array
      setLoadingStatus('Updating contract list...');
          setLoadingProgress({ current: 70, total: 100 });
      const updatedContracts = [...contractarray, contractToAdd];
      setcontractarray(updatedContracts);
      
      // Update selected contracts
      setSelectedContracts([...selectedContracts, contractToAdd]);
      
      // Set as primary selected contract
      propSetSelectedContract(contractToAdd);
      
      // Force refresh of contract data from API to ensure UI is updated
      console.log('Forcing contract data refresh after adding new contract...');
      await forceLoadContractData();
      
      setLoadingStatus('Contract added successfully. Preparing to fetch transactions...');
      setLoadingProgress({ current: 90, total: 100 });
      setAddingContract(false);
      setShowAddContractModal(false);

      // Short delay to show success before fetching transactions
              await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch initial transactions for this new contract
      console.log(`Fetching initial transactions for newly added contract: ${contractToAdd.address}`);
      console.log(`Using contract ID: ${contractToAdd.id}`);
      await fetchInitialTransactions(contractToAdd);
      
      return true;
        } catch (error) {
      console.error("Error adding smart contract:", error);
      setContractError(`Error adding contract: ${error.message}`);
      setAddingContract(false);
      setIsFetchingTransactions(false);
      setLoadingStatus(`Error: ${error.message}`);
      return false;
    }
  };

  const fetchInitialTransactions = async (contract) => {
    console.log('fetchInitialTransactions called with contract:', contract);
    console.log('Contract ID:', contract?.id);
    console.log('Contract contractId:', contract?.contractId);
    
    if (!contract || !contract.id) {
      console.error("No valid contract provided for fetching initial transactions");
      return;
    }
    
    setIsFetchingTransactions(true);
    setLoadingStatus(`Starting initial transaction fetch for ${contract.name || contract.address}`);
    setProcessingStep('initializing');
    setLoadingProgress({ current: 0, total: 100 });
    
    console.log(`Fetching initial transactions for new contract: ${contract.address} on ${contract.blockchain}`);
    
    try {
      // Log initial state (should be 0 for new contracts)
      setProcessingStep('checking_existing');
      setLoadingStatus('Checking existing transactions...');
      setLoadingProgress({ current: 5, total: 100 });
      
      console.log(`===== INITIAL TRANSACTION COUNT =====`);
      console.log(`New contract ${contract.address} - expected 0 transactions in database`);
      console.log(`====================================`);
      
      // Fetch transactions from blockchain
      let newTransactions = [];
      
      // Use the appropriate chain-specific module based on blockchain
      setProcessingStep('fetching');
      setLoadingStatus(`Fetching transactions from ${contract.blockchain}...`);
      setLoadingProgress({ current: 10, total: 100 });
      
      switch (contract.blockchain) {
        case 'BNB Chain':
          setLoadingStatus('Fetching up to 100,000 transactions from BscScan...');
          const bnbResult = await fetchBnbTransactions(contract.address, {
            limit: 100000
          });
          
          if (bnbResult.transactions?.length > 0) {
            console.log(`Retrieved ${bnbResult.transactions.length} transactions from BscScan`);
            // Update token symbol in transactions
            newTransactions = bnbResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('BEP20', contract.tokenSymbol || 'BEP20')
            }));
            
            // Log transactions from explorer API
            console.log('========== TRANSACTIONS FROM EXPLORER API ==========');
            console.log(`Total transactions: ${newTransactions.length}`);
            console.log('First 5 transactions:', newTransactions.slice(0, 5));
            console.log('Last 5 transactions:', newTransactions.slice(-5));
            console.log('Transaction hashes sample:', newTransactions.slice(0, 10).map(tx => tx.tx_hash));
            console.log('==================================================');
          } else {
            console.log('No transactions found or there was an error:', bnbResult.metadata?.message);
          }
          break;
          
        case 'Base':
          console.log('Using Base Chain module');
          const baseResult = await fetchBaseTransactions(contract.address, {
            limit: 100000
          });
          
          if (baseResult.transactions?.length > 0) {
            // Update token symbol in transactions
            newTransactions = baseResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('ETH', contract.tokenSymbol || 'ETH')
            }));
            console.log(`Retrieved ${newTransactions.length} transactions from Base API`);
            
            // Log transactions from explorer API
            console.log('========== TRANSACTIONS FROM EXPLORER API ==========');
            console.log(`Total transactions: ${newTransactions.length}`);
            console.log('First 5 transactions:', newTransactions.slice(0, 5));
            console.log('Last 5 transactions:', newTransactions.slice(-5));
            console.log('Transaction hashes sample:', newTransactions.slice(0, 10).map(tx => tx.tx_hash));
            console.log('==================================================');
          } else {
            console.log('No transactions found or error:', baseResult.metadata?.message);
          }
          break;
          
        case 'Ethereum':
          console.log('Fetching up to 100,000 transactions from Etherscan');
          const ethResult = await fetchEthereumTransactions(contract.address, {
            limit: 100000
          });
          
          if (ethResult.transactions?.length > 0) {
            console.log(`Retrieved ${ethResult.transactions.length} transactions from Etherscan`);
            // Update token symbol in transactions
            newTransactions = ethResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('ERC20', contract.tokenSymbol || 'ERC20')
            }));
            
            // Log transactions from explorer API
            console.log('========== TRANSACTIONS FROM EXPLORER API ==========');
            console.log(`Total transactions: ${newTransactions.length}`);
            console.log('First 5 transactions:', newTransactions.slice(0, 5));
            console.log('Last 5 transactions:', newTransactions.slice(-5));
            console.log('Transaction hashes sample:', newTransactions.slice(0, 10).map(tx => tx.tx_hash));
            console.log('==================================================');
          } else {
            console.log('No transactions found or there was an error:', ethResult.metadata?.message);
          }
          break;
          
        case 'Polygon':
          console.log('Fetching up to 100,000 transactions from Polygonscan');
          const polygonResult = await fetchPolygonTransactions(contract.address, {
            limit: 100000
          });
          
          if (polygonResult.transactions?.length > 0) {
            console.log(`Retrieved ${polygonResult.transactions.length} transactions from Polygonscan`);
            // Update token symbol in transactions
            newTransactions = polygonResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('MATIC', contract.tokenSymbol || 'MATIC')
            }));
            
            // Log transactions from explorer API
            console.log('========== TRANSACTIONS FROM EXPLORER API ==========');
            console.log(`Total transactions: ${newTransactions.length}`);
            console.log('First 5 transactions:', newTransactions.slice(0, 5));
            console.log('Last 5 transactions:', newTransactions.slice(-5));
            console.log('Transaction hashes sample:', newTransactions.slice(0, 10).map(tx => tx.tx_hash));
            console.log('==================================================');
          } else {
            console.log('No transactions found or there was an error:', polygonResult.metadata?.message);
          }
          break;
          
        case 'Arbitrum':
          console.log('Fetching up to 100,000 transactions from Arbiscan');
          const arbitrumResult = await fetchArbitrumTransactions(contract.address, {
            limit: 100000
          });
          
          if (arbitrumResult.transactions?.length > 0) {
            console.log(`Retrieved ${arbitrumResult.transactions.length} transactions from Arbiscan`);
            // Update token symbol in transactions
            newTransactions = arbitrumResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('ARB', contract.tokenSymbol || 'ARB')
            }));
            
            // Log transactions from explorer API
            console.log('========== TRANSACTIONS FROM EXPLORER API ==========');
            console.log(`Total transactions: ${newTransactions.length}`);
            console.log('First 5 transactions:', newTransactions.slice(0, 5));
            console.log('Last 5 transactions:', newTransactions.slice(-5));
            console.log('Transaction hashes sample:', newTransactions.slice(0, 10).map(tx => tx.tx_hash));
            console.log('==================================================');
          } else {
            console.log('No transactions found or there was an error:', arbitrumResult.metadata?.message);
          }
          break;
          
        case 'Optimism':
          console.log('Fetching up to 100,000 transactions from Optimistic Etherscan');
          const optimismResult = await fetchOptimismTransactions(contract.address, {
            limit: 100000
          });
          
          if (optimismResult.transactions?.length > 0) {
            console.log(`Retrieved ${optimismResult.transactions.length} transactions from Optimistic Etherscan`);
            // Update token symbol in transactions
            newTransactions = optimismResult.transactions.map(tx => ({
              ...tx,
              token_symbol: contract.tokenSymbol || tx.token_symbol,
              value_eth: tx.value_eth.replace('OP', contract.tokenSymbol || 'OP')
            }));
            
            // Log transactions from explorer API
            console.log('========== TRANSACTIONS FROM EXPLORER API ==========');
            console.log(`Total transactions: ${newTransactions.length}`);
            console.log('First 5 transactions:', newTransactions.slice(0, 5));
            console.log('Last 5 transactions:', newTransactions.slice(-5));
            console.log('Transaction hashes sample:', newTransactions.slice(0, 10).map(tx => tx.tx_hash));
            console.log('==================================================');
          } else {
            console.log('No transactions found or there was an error:', optimismResult.metadata?.message);
          }
          break;
          
        default:
          console.log(`${contract.blockchain} chain not fully implemented yet`);
      }
      
      let totalSaved = 0;
      
      if (newTransactions.length > 0) {
        setProcessingStep('processing');
        setLoadingStatus(`Processing ${newTransactions.length} transactions...`);
        setLoadingProgress({ current: 40, total: 100 });
        
        // Ensure transactions have proper format and required fields
        console.log('Contract object in sanitization:', contract);
        console.log('Contract ID:', contract.id);
        console.log('Contract contractId:', contract.contractId);
        
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
        
        setLoadingStatus(`Preparing to save ${sanitizedTransactions.length} valid transactions...`);
        console.log(`After sanitization, sending ${sanitizedTransactions.length} valid transactions`);
        
        // Save transactions to API in smaller batches to avoid payload size issues
        try {
          // Smaller batch size for better reliability
          const BATCH_SIZE = 7500; // Reduced from 10000 to 7500 to avoid payload size issues
          let batchErrors = [];
          
          setProcessingStep('saving');
          setLoadingStatus(`Saving transactions in batches of ${BATCH_SIZE}...`);
          setLoadingProgress({ current: 50, total: 100 });
          
          for (let i = 0; i < sanitizedTransactions.length; i += BATCH_SIZE) {
            const batch = sanitizedTransactions.slice(i, i + BATCH_SIZE);
            const progressPercent = Math.min(50 + Math.floor((i / sanitizedTransactions.length) * 40), 90);
            setLoadingProgress({ current: progressPercent, total: 100 });
            setLoadingStatus(`Saving batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(sanitizedTransactions.length/BATCH_SIZE)} (${i+1}-${Math.min(i+BATCH_SIZE, sanitizedTransactions.length)} of ${sanitizedTransactions.length})`);
            
            try {
              console.log(`Making API call to: /transactions/contract/${contract.id}`);
              console.log(`Contract object:`, contract);
              console.log(`Batch size:`, batch.length);
              console.log(`Batch sample:`, batch.slice(0, 2));
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
            setLoadingStatus(`Completed with ${batchErrors.length} errors. ${totalSaved} transactions saved successfully.`);
          } else {
            setLoadingStatus(`Successfully saved ${totalSaved} transactions to database.`);
          }
          
          // Load the transactions into state
          setTransactions(prev => ({
            ...prev,
            [contract.id]: sanitizedTransactions
          }));
          
          // After saving all transactions, fetch them from MongoDB to verify
          setProcessingStep('verifying');
          setLoadingStatus('Verifying saved transactions...');
          setLoadingProgress({ current: 95, total: 100 });
          
          console.log('Fetching saved transactions from MongoDB to verify...');
          const savedTransactions = await fetchTransactionsFromAPI(contract.id);
          
          // Print transaction count summary
          console.log('======== INITIAL TRANSACTION COUNT SUMMARY ========');
          console.log(`Retrieved from blockchain: ${newTransactions.length} transactions`);
          console.log(`After sanitization: ${sanitizedTransactions.length} valid transactions`);
          console.log(`Successfully saved to database: ${totalSaved} transactions`);
          console.log(`Final transaction count in database: ${savedTransactions.length}`);
          console.log('=================================================');
          
          setLoadingStatus(`Transaction fetch complete. Saved ${savedTransactions.length} transactions.`);
          setLoadingProgress({ current: 100, total: 100 });
          
          // Final delay to show completion
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error("Error saving initial transactions to API:", error);
          setLoadingStatus(`Error saving transactions: ${error.message}`);
        }
      } else {
        setLoadingStatus(`No transactions found for this contract on ${contract.blockchain}.`);
        setLoadingProgress({ current: 100, total: 100 });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error fetching initial transactions for ${contract.address}:`, error);
      setLoadingStatus(`Error: ${error.message}`);
    }
    
    setIsFetchingTransactions(false);
    setProcessingStep('');
  };

  const fetchTransactionsFromAPI = async (contractId) => {
    if (!contractId) return [];
    
    setIsFetchingTransactions(true);
    console.log(`Fetching transactions from MongoDB for contract ID: ${contractId}`);
    
    try {
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
          // No transactions or error
          hasMore = false;
        }
      }
        
        // Store in component state
        setTransactions(prev => ({
          ...prev,
        [contractId]: allTransactions
        }));
        
      console.log(`Loaded ${allTransactions.length} total transactions from MongoDB for contract ${contractId}`);
        setIsFetchingTransactions(false);
      return allTransactions;
    } catch (error) {
      console.error("Error fetching transactions from MongoDB:", error);
    }
    
    setIsFetchingTransactions(false);
    return [];
  };

  const saveContractToAPI = async (contract) => {
    try {
      // Get the selected team from localStorage
      const selectedTeam = localStorage.getItem('selectedTeam');
      
      if (!selectedTeam) {
        console.error("No selected team found");
        setContractError("No team selected. Please select a team first.");
        return null;
      }

      console.log(`Saving contract ${contract.address} to team ${selectedTeam}`);
      console.log('Contract type being saved:', contract.contractType);

      // Create payload for API
      const payload = {
        teamName: selectedTeam,
        address: contract.address,
        name: contract.name,
        blockchain: contract.blockchain,
        tokenSymbol: contract.tokenSymbol,
        contractType: contract.contractType,
        stakingDetails: contract.stakingDetails
      };

      console.log("API payload:", payload);
      
      // Make the API request
      const response = await axiosInstance.post('/contracts', payload);
      
      console.log("API response:", response.data);
      console.log("Contract type in response:", response.data.contract?.contractType);
        
      // Check if the contract was saved successfully
      if (response.data && response.data.contract) {
        // Clear the cached contracts to force refresh
        sessionStorage.removeItem("preloadedContracts");
        sessionStorage.removeItem("lastContractRefreshTime");
        
        console.log('Contract saved successfully with type:', response.data.contract.contractType);
        
        return {
          ...contract,
          id: response.data.contract.contractId,
          contractId: response.data.contract.contractId,
          contractType: response.data.contract.contractType, // Ensure we use the saved contract type
          _id: response.data.contract._id
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error saving contract to API:", error);
      
      let errorMessage = "Failed to save contract.";
      
      // Check for specific error messages
      if (error.response) {
        if (error.response.status === 403) {
          if (error.response.data?.error === 'Resource limit reached') {
            // Subscription limit error
            const message = error.response.data.message || "You have reached the maximum number of smart contracts for your current plan.";
            
            // Add upgrade options if available
            let fullMessage = message;
            if (error.response.data?.upgradeOptions?.length > 0) {
              const nextPlan = error.response.data.upgradeOptions[0];
              fullMessage += ` Consider upgrading to ${nextPlan.plan} plan to add up to ${nextPlan.smartContracts} smart contracts.`;
            }
            
            setContractError(fullMessage);
          } else {
            setContractError(error.response.data.message || "Permission denied.");
          }
        } else if (error.response.status === 404) {
          setContractError("Team not found. Please select a valid team.");
        } else {
          setContractError(error.response.data.message || errorMessage);
        }
      } else if (error.request) {
        setContractError("Network error. Please check your connection and try again.");
      } else {
        setContractError(errorMessage);
      }
      
      return null;
    }
  };

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
      {contextIsLoading ? (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Loading contracts...</span>
        </div>
      ) : (
        <div className="relative">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Smart Contract
          </label>
          <div>
            <button
              type="button"
              className="flex items-center justify-between w-full px-3 py-1.5 text-base bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none"
              onClick={handleDropdownToggle}
              aria-expanded={showDropdown}
              aria-haspopup="true"
            >
              {selectedContracts.length > 0 
                ? `${selectedContracts.length} contract${selectedContracts.length > 1 ? 's' : ''} selected`
                : "Select Smart Contract(s)"}
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {showDropdown && (
            <div className="absolute left-0 z-10 mt-1 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1 max-h-96 overflow-y-auto">
                {contextContractArray && contextContractArray.length > 0 ? (
                  <>
                    {/* Group contracts by type */}
                    {(() => {
                      const mainContracts = contextContractArray.filter(c => c.contractType === 'main' || !c.contractType);
                      const stakingContracts = contextContractArray.filter(c => c.contractType === 'escrow');
                      
                      return (
                        <>
                          {/* Main Contracts Section */}
                          {mainContracts.length > 0 && (
                            <>
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
                                MAIN CONTRACTS
                              </div>
                              {mainContracts.map((contract) => {
                    const display = formatContractDisplay(contract);
                    const isSelected = selectedContracts.some(c => c.id === contract.id);
                    
                    return (
                      <div 
                        key={contract.id} 
                                    className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                                    onClick={() => handleToggleContract(contract)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleContract(contract)}
                                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      onClick={(e) => e.stopPropagation()}
                                    />
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
                              })}
                            </>
                          )}
                          
                          {/* Staking Contracts Section */}
                          {stakingContracts.length > 0 && (
                            <>
                              {mainContracts.length > 0 && <div className="border-t border-gray-200"></div>}
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
                                STAKING CONTRACTS
                              </div>
                              {stakingContracts.map((contract) => {
                                const display = formatContractDisplay(contract);
                                const isSelected = selectedContracts.some(c => c.id === contract.id);
                                
                                return (
                                  <div 
                                    key={contract.id} 
                                    className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                                    onClick={() => handleToggleContract(contract)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleContract(contract)}
                                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center">
                                        <span className="text-sm font-medium text-gray-900 truncate mr-2">{display.name}</span>
                                        <span className="text-xs text-gray-500 truncate">({display.shortAddress})</span>
                                        <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">Staking</span>
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
                              })}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">No smart contracts found</div>
                )}
                <div className="border-t border-gray-100"></div>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-indigo-600 font-medium hover:bg-gray-50 flex items-center"
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
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
          {selectedContracts.map((contract) => {
            const display = formatContractDisplay(contract);
              const isStaking = contract.contractType === 'escrow';
              
            return (
              <div 
                key={contract.id} 
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    isStaking 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
              >
                <span className="mr-2">{display.name}</span>
                  <span className="text-xs opacity-75">({display.shortAddress})</span>
                  {isStaking && <span className="ml-2 text-xs">📈</span>}
                <button
                  onClick={(e) => handleRemoveContract(contract.id, e)}
                    className="ml-2 text-current hover:text-red-600 opacity-75 hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
          </div>
          
          {/* Clear all button */}
          <button
            onClick={handleClearAllContracts}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all selections
          </button>
        </div>
      )}

      {/* Transaction loading indicator */}
      {isLoadingTransactions && (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
          <span>Loading transaction data...</span>
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
                            Contract Type
                          </label>
                          <select
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={contractType}
                            onChange={(e) => setContractType(e.target.value)}
                          >
                            <option value="main">Main Contract</option>
                                                    <option value="escrow">Staking Contract</option>
                          </select>
                        </div>
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

      {/* Loading indicator for transactions */}
      {isFetchingTransactions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {processingStep === 'initializing' && 'Initializing...'}
                {processingStep === 'counting_existing' && 'Counting existing transactions...'}
                {processingStep === 'getting_latest_block' && 'Getting latest block...'}
                {processingStep === 'fetching_new' && 'Fetching new transactions...'}
                {processingStep === 'processing' && 'Processing transactions...'}
                {processingStep === 'saving' && 'Saving transactions...'}
                {processingStep === 'finalizing' && 'Finalizing...'}
              </h3>
              <p className="text-sm text-gray-500">{loadingStatus}</p>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                style={{width: `${(loadingProgress.current / loadingProgress.total) * 100}%`}}
              ></div>
            </div>
            
            <p className="text-xs text-gray-500 text-right">
              {Math.round((loadingProgress.current / loadingProgress.total) * 100)}% complete
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartContractFilters;
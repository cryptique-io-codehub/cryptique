import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Web3 from 'web3';
import { fetchBnbTransactions } from '../../utils/chains/bnbChain';
import { fetchBaseTransactions } from '../../utils/chains/baseChain';
import { isValidAddress } from '../../utils/chainUtils';

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
  const [contractAddress, setContractAddress] = useState('');
  const [contractName, setContractName] = useState('');
  const [blockchain, setBlockchain] = useState('Ethereum');
  const [contractError, setContractError] = useState('');
  const [addingContract, setAddingContract] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [web3, setWeb3] = useState(null);

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

  // Load contracts from localStorage on component mount
  useEffect(() => {
    loadContractsFromStorage();
  }, []);

  // Save contracts to localStorage whenever they change
  useEffect(() => {
    if (contractarray && contractarray.length > 0) {
      saveContractsToStorage();
    }
  }, [contractarray]);

  // Effect to initialize selectedContracts with existing selectedContract
  useEffect(() => {
    if (selectedContract && !selectedContracts.find(c => c.id === selectedContract.id)) {
      setSelectedContracts([selectedContract]);
    }
  }, [selectedContract]);

  // Load contracts from localStorage based on current team
  const loadContractsFromStorage = () => {
    try {
      // Get current team from localStorage
      const currentTeam = localStorage.getItem('selectedTeam');
      if (!currentTeam) return;

      // Get contracts for this team
      const storageKey = `contracts_${currentTeam}`;
      const storedContracts = localStorage.getItem(storageKey);
      
      if (storedContracts) {
        const contracts = JSON.parse(storedContracts);
        setcontractarray(contracts);
        console.log(`Loaded ${contracts.length} contracts from storage for team ${currentTeam}`);
        
        // Don't select any contract by default on first load
        // If there's one stored in localStorage, we'd load that separately
      } else {
        console.log(`No contracts found in storage for team ${currentTeam}`);
      }
    } catch (error) {
      console.error("Error loading contracts from storage:", error);
    }
  };

  // Save contracts to localStorage for current team
  const saveContractsToStorage = () => {
    try {
      // Get current team from localStorage
      const currentTeam = localStorage.getItem('selectedTeam');
      if (!currentTeam) return;

      // Save contracts for this team
      const storageKey = `contracts_${currentTeam}`;
      localStorage.setItem(storageKey, JSON.stringify(contractarray));
      console.log(`Saved ${contractarray.length} contracts to storage for team ${currentTeam}`);
    } catch (error) {
      console.error("Error saving contracts to storage:", error);
    }
  };

  // Fetch transactions for the selected contract using the appropriate chain module
  const fetchContractTransactions = async (contract) => {
    if (!contract || !contract.address) {
      console.error("No contract selected or contract address is missing");
      return;
    }

    console.log(`Fetching transactions for contract: ${contract.address} on ${contract.blockchain}`);
    
    try {
      let transactions = [];
      
      // Use the appropriate chain-specific module based on blockchain
      switch (contract.blockchain) {
        case 'BNB Chain':
          console.log('Using BNB Chain module');
          const bnbResult = await fetchBnbTransactions(contract.address, {
            limit: 50,
            includeTokenTransfers: true
          });
          transactions = bnbResult.transactions || [];
          break;
          
        case 'Base':
          console.log('Using Base Chain module');
          transactions = await fetchBaseTransactions(contract.address, {
            limit: 50
          });
          break;
          
        case 'Ethereum':
          console.log('Ethereum chain not implemented yet, using mock data');
          transactions = generateSampleTransactions(contract.address);
          break;
          
        default:
          console.log(`Chain ${contract.blockchain} not implemented yet, using mock data`);
          transactions = generateSampleTransactions(contract.address);
      }
      
      // Log transactions to console
      console.log(`Retrieved ${transactions.length} transactions for ${contract.address}`);
      console.log('Transactions:', transactions);
      
      return transactions;
    } catch (error) {
      console.error(`Error fetching transactions for ${contract.address}:`, error);
      return [];
    }
  };

  // Generate sample transactions for testing purposes
  const generateSampleTransactions = (address) => {
    return Array(10).fill().map((_, index) => ({
      tx_hash: `0x${Math.random().toString(16).substr(2, 40)}`,
      block_number: 10000000 + index,
      block_time: new Date(Date.now() - index * 3600 * 1000).toISOString(),
      from_address: index % 2 === 0 ? address : `0x${Math.random().toString(16).substr(2, 40)}`,
      to_address: index % 2 === 0 ? `0x${Math.random().toString(16).substr(2, 40)}` : address,
      value_eth: `${(Math.random() * 10).toFixed(4)} ETH`,
      gas_used: Math.floor(Math.random() * 1000000).toString(),
      status: Math.random() > 0.1 ? 'Success' : 'Failed',
      tx_type: Math.random() > 0.7 ? 'Contract Interaction' : 'Transfer',
      chain: 'Sample'
    }));
  };

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleSelectContract = (contract) => {
    // Set as the primary selected contract
    setSelectedContract(contract);
    
    // Add to the array of selected contracts if not already there
    if (!selectedContracts.find(c => c.id === contract.id)) {
      setSelectedContracts([...selectedContracts, contract]);
    }
    
    // Fetch and display transactions for this contract
    fetchContractTransactions(contract);
    
    setShowDropdown(false);
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
        fetchContractTransactions(updatedSelectedContracts[0]);
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
      // Create new contract object directly without API verification
      // since the backend API is not available yet
      const contractId = `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newContract = {
        id: contractId,
        address: contractAddress,
        name: contractName || `Contract ${contractAddress.substr(0, 6)}...${contractAddress.substr(-4)}`,
        blockchain: blockchain,
        added_at: new Date().toISOString(),
        verified: true
      };

      // Update contract array
      const updatedContracts = [...contractarray, newContract];
      setcontractarray(updatedContracts);
      
      // Update selected contracts
      setSelectedContracts([...selectedContracts, newContract]);
      
      // Set as primary selected contract
      setSelectedContract(newContract);
      
      setAddingContract(false);
      setShowAddContractModal(false);
      
      // Fetch transactions for the new contract
      fetchContractTransactions(newContract);
      
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
      blockchain: contract.blockchain
    };
  };

  return (
    <div className="smart-contract-filters relative">
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

        {/* Selected contracts display (as tags) */}
        {selectedContracts.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedContracts.map(contract => (
              <span 
                key={contract.id} 
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium 
                          ${selectedContract?.id === contract.id 
                           ? 'bg-blue-100 text-blue-800' 
                           : 'bg-gray-100 text-gray-800'}`}
              >
                {contract.name || contract.address.substring(0, 6) + '...' + contract.address.substring(contract.address.length - 4)}
                <span 
                  className="ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-600 cursor-pointer"
                  onClick={(e) => handleRemoveContract(contract.id, e)}
                >
                  ×
                </span>
              </span>
            ))}
          </div>
        )}

        {showDropdown && (
          <div className="absolute left-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {contractarray && contractarray.length > 0 ? (
                contractarray.map((contract) => {
                  const displayInfo = formatContractDisplay(contract);
                  const isSelected = selectedContracts.some(c => c.id === contract.id);
                  
                  return (
                    <button
                      key={contract.id}
                      className={`w-full text-left px-4 py-2 text-sm ${isSelected ? 'bg-gray-100' : ''}`}
                      onClick={() => handleSelectContract(contract)}
                    >
                      <div className="font-medium">{displayInfo.name}</div>
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>{displayInfo.shortAddress}</span>
                        <span className="italic">{contract.blockchain}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No smart contracts found</div>
              )}
              <div className="border-t border-gray-100"></div>
              <button
                className="text-left w-full block px-4 py-2 text-sm text-blue-600 hover:bg-gray-50"
                onClick={handleOpenAddContractModal}
              >
                + Add new smart contract
              </button>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default SmartContractFilters;
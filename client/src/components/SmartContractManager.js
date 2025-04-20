import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SmartContractManager = ({ onContractSelect }) => {
  const [smartContracts, setSmartContracts] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [newContractAddress, setNewContractAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedContract, setSelectedContract] = useState(null);

  // Load saved contracts from localStorage on component mount
  useEffect(() => {
    const savedContracts = localStorage.getItem('smartContracts');
    if (savedContracts) {
      setSmartContracts(JSON.parse(savedContracts));
    }
  }, []);

  // Save contracts to localStorage whenever the array changes
  useEffect(() => {
    localStorage.setItem('smartContracts', JSON.stringify(smartContracts));
  }, [smartContracts]);

  const availableChains = [
    "Ethereum",
    "Polygon",
    "Solana",
    "Base",
    "Bnb",
    "Arbitrum",
    "Avalanche",
    "Optimism",
  ];

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSelectContract = (contract) => {
    setSelectedContract(contract);
    setIsDropdownOpen(false);
    
    if (onContractSelect) {
      onContractSelect(contract);
    }
  };

  const handleOpenAddContractModal = () => {
    setShowAddContractModal(true);
    setIsDropdownOpen(false);
    setNewContractAddress('');
    setSelectedChain('');
    setErrorMessage('');
  };

  const handleCloseAddContractModal = () => {
    setShowAddContractModal(false);
  };

  const verifySmartContract = async () => {
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // Call backend to verify the contract via Dune API
      const response = await axios.post('https://cryptique-backend.vercel.app/api/onchain/smart-contracts', {
        contractAddress: newContractAddress,
        chainName: selectedChain
      });
      
      // If successful, add the contract
      const newContract = {
        address: newContractAddress,
        chain: selectedChain,
        id: `contract-${Date.now()}`
      };
      
      const updatedContracts = [...smartContracts, newContract];
      setSmartContracts(updatedContracts);
      
      // Select the new contract
      setSelectedContract(newContract);
      
      // Close modal
      setShowAddContractModal(false);
      
      if (onContractSelect) {
        onContractSelect(newContract);
      }
      
    } catch (error) {
      console.error("Error verifying contract:", error);
      setErrorMessage(
        error.response?.data?.error || 
        "Failed to verify smart contract. Please check the address and chain."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContract = (e) => {
    e.preventDefault();
    
    if (!newContractAddress || !selectedChain) {
      setErrorMessage("Please enter a contract address and select a chain");
      return;
    }
    
    // Validate contract address format (basic validation)
    if (!/^0x[a-fA-F0-9]{40}$/.test(newContractAddress)) {
      setErrorMessage("Please enter a valid contract address (0x followed by 40 hex characters)");
      return;
    }
    
    verifySmartContract();
  };

  return (
    <div className="w-full">
      <div className="relative">
        <button
          type="button"
          className="flex items-center justify-between w-full px-3 py-2 text-base bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none"
          onClick={handleDropdownToggle}
          disabled={isLoading}
        >
          {selectedContract ? (
            <div className="flex items-center">
              <span className="text-gray-800">{selectedContract.address.substring(0, 10)}...{selectedContract.address.substring(36)} ({selectedContract.chain})</span>
            </div>
          ) : (
            <span className="text-gray-500">Select smart contract</span>
          )}
          
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200">
            <ul className="py-1 max-h-60 overflow-auto">
              {smartContracts && smartContracts.length > 0 ? (
                smartContracts.map((contract) => (
                  <li key={contract.id}>
                    <button
                      type="button"
                      className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-100"
                      onClick={() => handleSelectContract(contract)}
                    >
                      <span>{contract.address.substring(0, 10)}...{contract.address.substring(36)}</span>
                      <span className="ml-2 text-xs bg-gray-200 rounded-full px-2 py-1">{contract.chain}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-gray-500">No contracts found</li>
              )}
              
              {/* Add contract option */}
              <li className="border-t border-gray-200">
                <button
                  type="button"
                  className="flex items-center w-full px-3 py-2 text-left text-purple-600 hover:bg-gray-100"
                  onClick={handleOpenAddContractModal}
                >
                  <span className="inline-block w-5 h-5 mr-2 bg-purple-600 rounded-full text-white flex-shrink-0 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>Add new smart contract</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Add Smart Contract Modal */}
      {showAddContractModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-['Montserrat'] font-semibold">Add a new smart contract</h2>
                <button onClick={handleCloseAddContractModal} className="text-gray-500 hover:text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleAddContract}>
                <div className="mb-4">
                  <label className="block font-['Montserrat'] font-medium text-gray-700 mb-2">Enter Your Smart Contract Address</label>
                  <input
                    type="text"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0x..."
                    value={newContractAddress}
                    onChange={(e) => setNewContractAddress(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block font-['Montserrat'] font-medium text-gray-700 mb-2">
                    What Chain is your smart contract on
                  </label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value)}
                    required
                  >
                    <option value="">Select a chain</option>
                    {availableChains.map((chain) => (
                      <option key={chain} value={chain}>{chain}</option>
                    ))}
                  </select>
                </div>
                
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {errorMessage}
                  </div>
                )}
                
                <button
                  type="submit"
                  className="w-full flex justify-center items-center px-4 py-2 bg-purple-800 text-white rounded-md hover:bg-purple-900 focus:outline-none font-['Montserrat']"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Smart Contract
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartContractManager; 
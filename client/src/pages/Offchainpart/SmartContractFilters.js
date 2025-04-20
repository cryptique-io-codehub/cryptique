import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SmartContractFilters = ({ contractarray, setcontractarray, selectedContract, setSelectedContract }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [newContractAddress, setNewContractAddress] = useState('');
  const [newContractName, setNewContractName] = useState('');
  const [selectedChain, setSelectedChain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedContracts, setSelectedContracts] = useState([]);

  // Initialize selectedContracts with the current selectedContract if it exists
  useEffect(() => {
    if (selectedContract && !selectedContracts.some(c => c.id === selectedContract.id)) {
      setSelectedContracts([selectedContract]);
    }
  }, [selectedContract]);

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
    // Set as primary selected contract
    setSelectedContract(contract);
    
    // Add to multi-select list if not already there
    if (!selectedContracts.some(c => c.id === contract.id)) {
      setSelectedContracts([...selectedContracts, contract]);
    }
    
    setIsDropdownOpen(false);
  };

  const handleRemoveContract = (contractId, e) => {
    e.stopPropagation(); // Prevent dropdown from toggling
    
    const updatedContracts = selectedContracts.filter(c => c.id !== contractId);
    setSelectedContracts(updatedContracts);
    
    // If the primary selected contract was removed, update it
    if (selectedContract && selectedContract.id === contractId) {
      setSelectedContract(updatedContracts.length > 0 ? updatedContracts[0] : null);
    }
  };

  const handleOpenAddContractModal = () => {
    setShowAddContractModal(true);
    setIsDropdownOpen(false);
    setSelectedChain(''); // Reset selected chain
    setNewContractAddress('');
    setNewContractName('');
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
        name: newContractName || newContractAddress,
        chain: selectedChain,
        chains: [selectedChain], // Keep the previous format for compatibility
        id: `contract-${Date.now()}`
      };
      
      // Update contract array
      const updatedContractArray = [...contractarray, newContract];
      setcontractarray(updatedContractArray);
      
      // Add to selected contracts
      setSelectedContracts([...selectedContracts, newContract]);
      
      // Set as primary selected contract
      setSelectedContract(newContract);
      
      // Close modal
      setShowAddContractModal(false);
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

  const handleAddContract = async (e) => {
    e.preventDefault();
    
    if (!newContractAddress || !selectedChain) {
      setErrorMessage("Please enter a contract address and select a chain");
      return;
    }
    
    // Validate contract address format (basic validation for EVM chains)
    if (selectedChain !== "Solana" && !/^0x[a-fA-F0-9]{40}$/.test(newContractAddress)) {
      setErrorMessage("Please enter a valid contract address (0x followed by 40 hex characters)");
      return;
    }
    
    verifySmartContract();
  };

  // Function to format contract display
  const formatContractDisplay = (contract) => {
    const addressDisplay = contract.address.length > 10 
      ? `${contract.address.substring(0, 6)}...${contract.address.substring(contract.address.length - 4)}`
      : contract.address;
      
    return contract.name 
      ? `${contract.name} (${addressDisplay})`
      : addressDisplay;
  };

  return (
    <div className="flex-1">
      <label className="block text-xs font-['Montserrat'] font-medium text-gray-700 mb-1">
        Smart Contract
      </label>
      
      <div className="relative">
        <button
          type="button"
          className="flex items-center justify-between w-full px-3 py-1.5 text-base bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none"
          onClick={handleDropdownToggle}
          disabled={isLoading}
        >
          <div className="flex items-center flex-wrap gap-1">
            {selectedContracts.length > 0 ? (
              selectedContracts.map(contract => (
                <div key={contract.id} className="flex items-center bg-purple-100 px-2 py-0.5 rounded-full mr-1 my-0.5">
                  <span className="text-sm text-purple-800">{formatContractDisplay(contract)}</span>
                  <button 
                    onClick={(e) => handleRemoveContract(contract.id, e)}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <span className="text-gray-500 text-base">Select smart contract</span>
            )}
          </div>
          
          {isLoading ? (
            <svg className="animate-spin h-4 w-4 ml-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        
        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200">
            <ul className="py-1 max-h-60 overflow-auto">
              {contractarray && contractarray.length > 0 ? (
                contractarray.map((contract, index) => (
                  <li key={contract.id || index}>
                    <button
                      type="button"
                      className={`flex items-center w-full px-3 py-1.5 text-base text-left hover:bg-gray-100 ${
                        selectedContracts.some(c => c.id === contract.id) ? 'bg-purple-50' : ''
                      }`}
                      onClick={() => handleSelectContract(contract)}
                    >
                      <span className="text-base">{contract.name || contract.address}</span>
                      {contract.chain && (
                        <span className="ml-2 text-xs bg-gray-200 rounded-full px-2 py-0.5">{contract.chain}</span>
                      )}
                      {selectedContracts.some(c => c.id === contract.id) && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-1.5 text-gray-500 text-base">No contracts found</li>
              )}
              
              {/* Add contract option */}
              <li className="border-t border-gray-200">
                <button
                  type="button"
                  className="flex items-center w-full px-3 py-1.5 text-base text-left text-blue-600 hover:bg-gray-100"
                  onClick={handleOpenAddContractModal}
                >
                  <span className="inline-block w-5 h-5 mr-2 bg-blue-600 rounded-full text-white flex-shrink-0 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-base">Add new smart contract</span>
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
                
                <div className="mb-4">
                  <label className="block font-['Montserrat'] font-medium text-gray-700 mb-2">
                    Optional: Contract Name
                  </label>
                  <input
                    type="text"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="My Contract"
                    value={newContractName}
                    onChange={(e) => setNewContractName(e.target.value)}
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
                  disabled={isLoading || !newContractAddress || !selectedChain}
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

export default SmartContractFilters;
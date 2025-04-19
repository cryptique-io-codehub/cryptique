import React, { useState, useEffect } from 'react';

const SmartContractFilters = ({ contractarray, setcontractarray, selectedContract, setSelectedContract }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [newContractAddress, setNewContractAddress] = useState('');
  const [newContractName, setNewContractName] = useState('');
  const [selectedChain, setSelectedChain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState([]);

  const availableChains = [
    "Ethereum",
    "Polygon",
    "Solana",
    "Base",
    "Bnb",
    "Arbitrum",
    "Avalanche",
    "Tron",
    "Sui",
    "Optimism",
    "Near",
    "Btc"
  ];

  useEffect(() => {
    // Initialize selectedContracts with the currently selected contract if it exists
    if (selectedContract && !selectedContracts.some(c => c.id === selectedContract.id)) {
      setSelectedContracts([selectedContract]);
    }
  }, [selectedContract]);

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSelectContract = (contract) => {
    // Check if contract is already selected
    const isAlreadySelected = selectedContracts.some(c => c.id === contract.id);
    
    if (isAlreadySelected) {
      // If already selected, remove it from selection
      setSelectedContracts(selectedContracts.filter(c => c.id !== contract.id));
    } else {
      // If not selected, add it to selection
      setSelectedContracts([...selectedContracts, contract]);
    }
    
    // Also update the parent component's selectedContract (for backwards compatibility)
    // Using the last selected contract as the current one
    if (!isAlreadySelected) {
      setSelectedContract(contract);
    } else if (selectedContracts.length > 1) {
      // If removing a contract but others are selected, set the first remaining one
      const remainingContracts = selectedContracts.filter(c => c.id !== contract.id);
      setSelectedContract(remainingContracts[0]);
    } else {
      // If removing the only selected contract
      setSelectedContract(null);
    }
  };

  const handleOpenAddContractModal = () => {
    setShowAddContractModal(true);
    setIsDropdownOpen(false);
    setSelectedChain(''); // Reset selected chain
    setNewContractAddress('');
    setNewContractName('');
  };

  const handleCloseAddContractModal = () => {
    setShowAddContractModal(false);
  };

  const handleChainSelect = (chain) => {
    setSelectedChain(chain);
  };

  const handleAddContract = async (e) => {
    e.preventDefault();
    
    if (!newContractAddress || !selectedChain) {
      // Show validation error
      return;
    }

    setIsLoading(true);
    
    try {
      // Here you would make an API call to add the contract
      const newContract = {
        address: newContractAddress,
        name: newContractName || newContractAddress,
        chains: [selectedChain], // Now using single chain in an array
        id: `contract-${Date.now()}`
      };
      
      // Update contract array
      setcontractarray([...contractarray, newContract]);
      
      // Add to selected contracts
      setSelectedContracts([...selectedContracts, newContract]);
      
      // Set as selected contract
      setSelectedContract(newContract);
      
      // Close modal
      setShowAddContractModal(false);
    } catch (error) {
      console.error("Error adding contract:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isContractSelected = (contract) => {
    return selectedContracts.some(c => c.id === contract.id);
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
          {selectedContracts.length > 0 ? (
            <div className="flex items-center truncate">
              <span className="text-gray-800 text-base truncate">
                {selectedContracts.length === 1 
                  ? (selectedContracts[0].name || selectedContracts[0].address)
                  : `${selectedContracts.length} contracts selected`}
              </span>
            </div>
          ) : (
            <span className="text-gray-500 text-base">Select smart contract</span>
          )}
          
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
                        isContractSelected(contract) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleSelectContract(contract)}
                    >
                      <div className="flex items-center w-full">
                        <input
                          type="checkbox"
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={isContractSelected(contract)}
                          onChange={() => {}} // Handled by parent button click
                          onClick={(e) => e.stopPropagation()} // Prevent double toggling
                        />
                        <span className="text-base">{contract.name || contract.address}</span>
                      </div>
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
                    placeholder=""
                    value={newContractAddress}
                    onChange={(e) => setNewContractAddress(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block font-['Montserrat'] font-medium text-gray-700 mb-2">
                    What Chain is your smart contract on
                  </label>
                  <div className="relative">
                    <div className="bg-white border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                      {availableChains.map((chain) => (
                        <div key={chain} className="flex items-center mb-2">
                          <input
                            type="radio"
                            id={`chain-${chain}`}
                            name="chainSelection"
                            className="mr-2"
                            checked={selectedChain === chain}
                            onChange={() => handleChainSelect(chain)}
                          />
                          <label htmlFor={`chain-${chain}`} className="text-base">{chain}</label>
                        </div>
                      ))}
                    </div>
                    {!selectedChain && (
                      <p className="mt-1 text-base text-red-500">
                        Please select a chain
                      </p>
                    )}
                  </div>
                </div>
                
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
                      Adding...
                    </>
                  ) : (
                    <>
                      Verify
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
import React, { useState, useEffect } from 'react';
import SmartContractManager from '../../components/SmartContractManager';

const SmartContractsSection = () => {
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [activeContract, setActiveContract] = useState(null);

  // Handle contract selection
  const handleContractSelect = (contract) => {
    setActiveContract(contract);
    
    // Add to selected contracts if not already selected
    if (!selectedContracts.some(c => c.id === contract.id)) {
      setSelectedContracts([...selectedContracts, contract]);
    }
  };

  // Handle contract deselection (remove from selected list)
  const handleRemoveContract = (contractId) => {
    const updatedContracts = selectedContracts.filter(contract => contract.id !== contractId);
    setSelectedContracts(updatedContracts);
    
    // If active contract was removed, set active to the first in the list or null
    if (activeContract && activeContract.id === contractId) {
      setActiveContract(updatedContracts.length > 0 ? updatedContracts[0] : null);
    }
  };

  return (
    <div className="bg-gray-50 p-4 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 font-['Montserrat']">Smart Contracts</h1>
          <p className="text-gray-600 font-['Poppins']">View and manage your smart contracts analytics</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800 font-['Montserrat']">Add or Select Smart Contracts</h2>
            <p className="text-sm text-gray-600 font-['Poppins']">Choose existing contracts or add new ones</p>
          </div>
          
          <SmartContractManager onContractSelect={handleContractSelect} />
          
          {/* Selected Contracts List */}
          {selectedContracts.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-medium text-gray-700 mb-2 font-['Montserrat']">Selected Contracts</h3>
              <div className="flex flex-wrap gap-2">
                {selectedContracts.map(contract => (
                  <div 
                    key={contract.id} 
                    className={`flex items-center px-3 py-1.5 rounded-full text-sm ${
                      activeContract && activeContract.id === contract.id 
                        ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                        : 'bg-gray-100 text-gray-800 border border-gray-300'
                    }`}
                  >
                    <span className="mr-2 truncate max-w-[200px]">
                      {contract.address.substring(0, 6)}...{contract.address.substring(38)} ({contract.chain})
                    </span>
                    <button 
                      onClick={() => handleRemoveContract(contract.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Contract Analytics Section - Placeholder for now */}
        {activeContract ? (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 font-['Montserrat']">
              Contract Analytics: {activeContract.address.substring(0, 6)}...{activeContract.address.substring(38)}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-md font-medium text-gray-700 mb-2 font-['Montserrat']">Contract Overview</h3>
                <p className="text-sm text-gray-600 font-['Poppins']">Address: {activeContract.address}</p>
                <p className="text-sm text-gray-600 font-['Poppins']">Network: {activeContract.chain}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-md font-medium text-gray-700 mb-2 font-['Montserrat']">Contract Activity</h3>
                <p className="text-sm text-gray-600 font-['Poppins']">Transactions: Loading...</p>
                <p className="text-sm text-gray-600 font-['Poppins']">Unique Users: Loading...</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium text-gray-700 font-['Montserrat']">Transaction History</h3>
                <select className="text-sm border border-gray-300 rounded p-1">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                  <option>All time</option>
                </select>
              </div>
              <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
                <p className="text-gray-500">Loading chart data...</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-md font-medium text-gray-700 mb-2 font-['Montserrat']">Smart Contract Interactions</h3>
              <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
                <p className="text-gray-500">Loading interaction data...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2 font-['Montserrat']">No Smart Contract Selected</h2>
            <p className="text-gray-600 font-['Poppins']">Please select or add a smart contract to view analytics</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartContractsSection; 
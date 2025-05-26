import React from 'react';
import { useContractData } from '../contexts/ContractDataContext';
import { ChevronDown } from 'lucide-react';

const SmartContractSelector = () => {
  const { 
    contractArray, 
    selectedContracts,
    handleContractToggle,
    handleSelectAllContracts,
    isLoadingContracts,
    isLoadingTransactions
  } = useContractData();

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
        <h2 className="text-lg font-semibold mb-2 md:mb-0 font-montserrat">Smart Contract Selection</h2>
        
        <div className="w-full md:w-auto relative">
          <div className="flex items-center">
            <div className="relative flex-grow">
              <button
                onClick={() => handleSelectAllContracts(!selectedContracts.length)}
                className="appearance-none bg-white border border-gray-300 rounded-lg py-2 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64 text-left"
                disabled={isLoadingContracts}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">
                    {selectedContracts.length === contractArray.length 
                      ? "All Smart Contracts" 
                      : selectedContracts.length === 0 
                        ? "Select Smart Contracts"
                        : `${selectedContracts.length} Contract${selectedContracts.length !== 1 ? 's' : ''} Selected`}
                  </span>
                  <ChevronDown size={18} />
                </div>
              </button>

              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg">
                <div className="p-2 border-b">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedContracts.length === contractArray.length}
                      onChange={(e) => handleSelectAllContracts(e.target.checked)}
                      className="mr-2"
                    />
                    Select All
                  </label>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {contractArray.map(contract => (
                    <label key={contract.id} className="flex items-center p-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedContracts.some(c => c.id === contract.id)}
                        onChange={() => handleContractToggle(contract.id)}
                        className="mr-2"
                      />
                      {contract.name} {contract.tokenSymbol ? `(${contract.tokenSymbol})` : ''} - {contract.blockchain}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Loading Indicators */}
          {isLoadingContracts && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-8">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>
          )}
          {isLoadingTransactions && (
            <div className="mt-2 text-sm text-gray-500">
              Loading transaction data...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartContractSelector; 
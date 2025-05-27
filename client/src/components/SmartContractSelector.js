import React from 'react';
import { useContractData } from '../contexts/ContractDataContext';
import { ChevronDown } from 'lucide-react';

const SmartContractSelector = () => {
  const { 
    contractArray, 
    selectedContract, 
    handleContractChange, 
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
              <select
                className="appearance-none bg-white border border-gray-300 rounded-lg py-2 px-4 pr-8 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                value={selectedContract ? selectedContract.id : ''}
                onChange={(e) => handleContractChange(e.target.value)}
                disabled={isLoadingContracts}
              >
                <option value="">Select a Smart Contract</option>
                {contractArray.map(contract => (
                  <option key={contract.id} value={contract.id}>
                    {contract.name} {contract.tokenSymbol ? `(${contract.tokenSymbol})` : ''} - {contract.blockchain}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>
          
          {/* Loading Indicators */}
          {isLoadingContracts && (
            <div className="text-xs text-gray-500 mt-1 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
              <span>Loading contracts...</span>
            </div>
          )}
          {isLoadingTransactions && (
            <div className="text-xs text-gray-500 mt-1 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
              <span>Loading transaction data...</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Selected Contract Details */}
      {selectedContract && (
        <div className="mt-3 text-sm border-t pt-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <div>
              <span className="text-gray-500">Contract:</span> {selectedContract.name}
            </div>
            <div>
              <span className="text-gray-500">Address:</span> {selectedContract.address.substring(0, 6)}...{selectedContract.address.substring(selectedContract.address.length - 4)}
            </div>
            <div>
              <span className="text-gray-500">Blockchain:</span> {selectedContract.blockchain}
            </div>
            {selectedContract.tokenSymbol && (
              <div>
                <span className="text-gray-500">Token:</span> {selectedContract.tokenSymbol}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartContractSelector; 
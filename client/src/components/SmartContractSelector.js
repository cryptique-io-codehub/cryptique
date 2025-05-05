import React, { useState, useEffect } from 'react';
import { useContract } from '../context/ContractContext';

const SmartContractSelector = () => {
  const { selectedContract, setSelectedContract, setHasLiveData } = useContract();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for demo purposes - replace with actual API call
  const mockContracts = [
    { id: '1', name: 'TokenSwap', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', chain: 'Ethereum' },
    { id: '2', name: 'NFT Marketplace', address: '0x123d35Cc6634C0532925a3b844Bc454e4438f123', chain: 'Ethereum' },
    { id: '3', name: 'DeFi Lending', address: '0x456d35Cc6634C0532925a3b844Bc454e4438f456', chain: 'Polygon' },
    { id: '4', name: 'DAO Governance', address: '0x789d35Cc6634C0532925a3b844Bc454e4438f789', chain: 'Avalanche' },
  ];

  useEffect(() => {
    // In a real application, you would fetch contracts from an API
    // For demo purposes, we'll use mock data
    setTimeout(() => {
      setContracts(mockContracts);
      setLoading(false);
    }, 1000);
  }, []);

  const handleContractSelect = (contract) => {
    setSelectedContract(contract);
    // Here you could check if the contract has data and set hasLiveData accordingly
    // For demo purposes, set it to false so it falls back to demo data
    setHasLiveData(false);
  };

  const handleClearSelection = () => {
    setSelectedContract(null);
    setHasLiveData(false);
  };

  const filteredContracts = contracts.filter(contract => 
    contract.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    contract.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 bg-white rounded-lg shadow mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold font-montserrat">Smart Contract</h2>
        {selectedContract && (
          <button 
            onClick={handleClearSelection}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear
          </button>
        )}
      </div>

      {selectedContract ? (
        <div className="border border-gray-200 rounded-md p-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-md">{selectedContract.name}</h3>
              <p className="text-sm text-gray-500 font-mono">{selectedContract.address}</p>
              <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {selectedContract.chain}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search by name or address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {filteredContracts.length > 0 ? (
                filteredContracts.map(contract => (
                  <div 
                    key={contract.id}
                    className="border border-gray-200 rounded-md p-3 mb-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleContractSelect(contract)}
                  >
                    <h3 className="font-bold text-md">{contract.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{contract.address}</p>
                    <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {contract.chain}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No contracts found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SmartContractSelector; 
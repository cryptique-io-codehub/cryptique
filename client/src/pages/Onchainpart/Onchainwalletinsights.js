import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Copy, AlertCircle } from 'lucide-react';
import { useContract } from '../../context/ContractContext';

export default function Onchainwalletinsights() {
  const { selectedContract, showDemoData, contractData, isLoading } = useContract();
  const [currentPage, setCurrentPage] = useState(1);
  const [wallets, setWallets] = useState([]);
  const [totalWallets, setTotalWallets] = useState(0);
  
  // Sample wallet data - DEMO DATA
  const demoWallets = [
    { address: '0x3c...bc2f', totalBalance: '$0', transactions: 201, firstDate: '12/02/2024', lastDate: '31/05/2024', hasAlert: true },
    { address: '0xae...ee64', totalBalance: '$0', transactions: 120, firstDate: '15/05/2021', lastDate: '09/03/2025', hasAlert: true },
    { address: '0xe4...ea4c', totalBalance: '$0', transactions: 63, firstDate: '10/02/2024', lastDate: '16/03/2024', hasAlert: true },
    { address: '0x3c...bc2f', totalBalance: '$0', transactions: 201, firstDate: '12/02/2024', lastDate: '31/05/2024', hasAlert: true },
    { address: '0xae...ee64', totalBalance: '$0', transactions: 120, firstDate: '15/05/2021', lastDate: '09/03/2025', hasAlert: true },
    { address: '0xe4...ea4c', totalBalance: '$0', transactions: 63, firstDate: '10/02/2024', lastDate: '16/03/2024', hasAlert: true },
    { address: '0x3c...bc2f', totalBalance: '$0', transactions: 201, firstDate: '12/02/2024', lastDate: '31/05/2024', hasAlert: true },
    { address: '0xae...ee64', totalBalance: '$0', transactions: 120, firstDate: '15/05/2021', lastDate: '09/03/2025', hasAlert: true },
    { address: '0xe4...ea4c', totalBalance: '$0', transactions: 63, firstDate: '10/02/2024', lastDate: '16/03/2024', hasAlert: true },
    { address: '0x3c...bc2f', totalBalance: '$0', transactions: 201, firstDate: '12/02/2024', lastDate: '31/05/2024', hasAlert: true },
    { address: '0xae...ee64', totalBalance: '$0', transactions: 120, firstDate: '15/05/2021', lastDate: '09/03/2025', hasAlert: true },
    { address: '0xe4...ea4c', totalBalance: '$0', transactions: 63, firstDate: '10/02/2024', lastDate: '16/03/2024', hasAlert: true },
    { address: '0x3c...bc2f', totalBalance: '$0', transactions: 201, firstDate: '12/02/2024', lastDate: '31/05/2024', hasAlert: true },
    { address: '0xae...ee64', totalBalance: '$0', transactions: 120, firstDate: '15/05/2021', lastDate: '09/03/2025', hasAlert: true },
    { address: '0xe4...ea4c', totalBalance: '$0', transactions: 63, firstDate: '10/02/2024', lastDate: '16/03/2024', hasAlert: true },
  ];

  // Effect to update the wallet data based on contract selection
  useEffect(() => {
    if (!showDemoData && contractData && contractData.wallets) {
      // If we have contract data with wallets, use it
      setWallets(contractData.wallets);
      setTotalWallets(contractData.totalWallets || contractData.wallets.length);
    } else {
      // Otherwise use demo data
      setWallets(demoWallets);
      setTotalWallets(6429); // Demo total
    }
  }, [showDemoData, contractData]);

  const walletsPerPage = 15;
  const totalPages = Math.ceil(totalWallets / walletsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      {/* Contract Selection Status */}
      {isLoading ? (
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm p-6 mb-6">
          <p className="text-center">Loading contract data...</p>
        </div>
      ) : (
        selectedContract && (
          <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm p-6 mb-6">
            <p className="text-sm font-medium">Currently analyzing: <span className="font-bold text-purple-600">{selectedContract.name || selectedContract.id}</span></p>
          </div>
        )
      )}

      {showDemoData && (
        <div className="max-w-7xl mx-auto bg-blue-50 p-4 rounded-lg shadow-sm mb-6 border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-bold">Demo Mode:</span> Select a smart contract to view real analytics data. Currently showing sample data.
          </p>
        </div>
      )}

      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h1 className="text-2xl font-semibold">List</h1>
          <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200">
            <Download size={16} />
            Export all wallets
            <span className="text-xs text-gray-500 ml-1">{totalWallets}</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-gray-500">
                <th className="py-4 px-6 text-left font-medium">Wallet Address</th>
                <th className="py-4 px-6 text-left font-medium">Total balance (USD)</th>
                <th className="py-4 px-6 text-left font-medium">Number of Transactions</th>
                <th className="py-4 px-6 text-left font-medium">First transaction date</th>
                <th className="py-4 px-6 text-left font-medium">Last transaction date</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((wallet, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <span>{wallet.address}</span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Copy size={16} />
                      </button>
                      {wallet.hasAlert && (
                        <AlertCircle size={16} className="text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">{wallet.totalBalance}</td>
                  <td className="py-4 px-6">{wallet.transactions}</td>
                  <td className="py-4 px-6">{wallet.firstDate}</td>
                  <td className="py-4 px-6">{wallet.lastDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center p-6 text-sm text-gray-500">
          <div>
            Showing 1-{Math.min(walletsPerPage, totalWallets)} of {totalWallets} matching wallets
          </div>
          <div className="flex items-center space-x-2">
            <button 
              className="flex items-center border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50" 
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            
            {[...Array(Math.min(4, totalPages))].map((_, i) => (
              <button 
                key={i+1}
                className={`w-8 h-8 rounded flex items-center justify-center ${currentPage === i+1 ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
                onClick={() => handlePageChange(i+1)}
              >
                {i+1}
              </button>
            ))}
            
            <button 
              className="flex items-center border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
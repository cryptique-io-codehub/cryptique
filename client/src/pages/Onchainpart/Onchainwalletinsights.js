import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Copy, AlertCircle } from 'lucide-react';

export default function Onchainwalletinsights() {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Sample wallet data
  const wallets = [
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

  const totalWallets = 6429;
  const walletsPerPage = 15;
  const totalPages = Math.ceil(totalWallets / walletsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h1 className="text-2xl font-semibold">List</h1>
          <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200">
            <Download size={16} />
            Export all wallets
            <span className="text-xs text-gray-500 ml-1">6429</span>
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
            Showing 1-{walletsPerPage} of {totalWallets} matching wallets
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
            
            {[1, 2, 3, 4].map(page => (
              <button 
                key={page}
                className={`w-8 h-8 rounded flex items-center justify-center ${currentPage === page ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            
            <button 
              className="flex items-center border rounded px-2 py-1 hover:bg-gray-50"
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
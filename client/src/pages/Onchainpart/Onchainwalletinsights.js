import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Copy, AlertCircle, Loader2 } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';

export default function Onchainwalletinsights() {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get contract data from context
  const { selectedContract, contractTransactions, isLoadingTransactions } = useContractData();
  
  // Dashboard styles matching the rest of the application
  const styles = {
    primaryColor: "#1d0c46", // Deep purple
    accentColor: "#caa968",  // Gold accent
    backgroundColor: "#f9fafb",
    cardBg: "white",
    textPrimary: "#111827",
    textSecondary: "#4b5563"
  };
  
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
  
  // Use loading state from contract context or simulate loading data
  useEffect(() => {
    if (!isLoadingTransactions) {
      // If contract data is loaded, we can set our loading to false
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500); // short timeout to ensure smooth transitions
      
      return () => clearTimeout(timer);
    }
  }, [isLoadingTransactions]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Show loading state when transactions are loading
  if (isLoading || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: styles.primaryColor }} />
          <p className="text-lg font-medium font-montserrat" style={{ color: styles.primaryColor }}>
            Loading wallet insights...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 text-gray-900">
      {/* Import fonts in the head */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');
          
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Montserrat', sans-serif;
          }
          
          body, p, span, div {
            font-family: 'Poppins', sans-serif;
          }
        `}
      </style>

      {/* Page title section */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 font-montserrat" style={{ color: styles.primaryColor }}>
          Wallet Insights {selectedContract ? `for ${selectedContract.name}` : ''}
        </h1>
        <p className="text-sm text-gray-600 font-poppins mt-1">
          Track and analyze wallet activity across the blockchain
        </p>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-lg font-montserrat" style={{ color: styles.primaryColor }}>
            Connected Wallets
          </h2>
          <button 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ 
              backgroundColor: `${styles.primaryColor}10`, 
              color: styles.primaryColor
            }}
          >
            <Download size={16} />
            Export all wallets
            <span className="text-xs ml-1 opacity-70">{totalWallets.toLocaleString()}</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">Wallet Address</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">Total balance (USD)</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">Number of Transactions</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">First transaction date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">Last transaction date</th>
              </tr>
            </thead>
            <tbody className="font-poppins">
              {wallets.map((wallet, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{wallet.address}</span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Copy size={14} />
                      </button>
                      {wallet.hasAlert && (
                        <AlertCircle size={14} style={{ color: styles.accentColor }} />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{wallet.totalBalance}</td>
                  <td className="py-3 px-4 text-sm">{wallet.transactions}</td>
                  <td className="py-3 px-4 text-sm">{wallet.firstDate}</td>
                  <td className="py-3 px-4 text-sm">{wallet.lastDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center p-4 text-sm text-gray-500 font-poppins">
          <div className="text-xs">
            Showing 1-{walletsPerPage} of {totalWallets.toLocaleString()} matching wallets
          </div>
          <div className="flex items-center space-x-2">
            <button 
              className="flex items-center border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white text-xs" 
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              style={{ color: styles.primaryColor }}
            >
              <ChevronLeft size={12} />
              <span className="ml-1">Previous</span>
            </button>
            
            {Array.from({ length: Math.min(4, totalPages) }, (_, i) => i + 1).map(page => (
              <button 
                key={page}
                className={`w-7 h-7 rounded flex items-center justify-center text-xs ${currentPage === page ? 'font-medium' : 'hover:bg-gray-50'}`}
                onClick={() => handlePageChange(page)}
                style={{ 
                  backgroundColor: currentPage === page ? `${styles.primaryColor}10` : '',
                  color: currentPage === page ? styles.primaryColor : ''
                }}
              >
                {page}
              </button>
            ))}
            
            <button 
              className="flex items-center border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white text-xs"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{ color: styles.primaryColor }}
            >
              <span className="mr-1">Next</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';

export default function OnchainmarketInsights() {
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

  const userCategories = [
    { title: "Protocol Explorers", count: 75125, color: "bg-indigo-100" },
    { title: "NFT Degens", count: 45124, color: "bg-indigo-100" },
    { title: "Airdrop Farmers", count: 131008, color: "bg-indigo-100" },
    { title: "Multi-Chain Users", count: 6251, color: "bg-indigo-100" },
    { title: "Whales", count: 45, color: "bg-indigo-100" },
    { title: "Returning Users", count: 17000, color: "bg-indigo-100" }
  ];

  const transactionData = [
    { chain: "Ethereum", volume: "$19.93B", icon: "🔵", color: "bg-blue-500" },
    { chain: "BNB Chain", volume: "$1.28B", icon: "🟡", color: "bg-yellow-500" },
    { chain: "Base", volume: "$871.91M", icon: "⚪", color: "bg-blue-600" },
    { chain: "Polygon", volume: "$199.52M", icon: "🟣", color: "bg-purple-500" },
    { chain: "Arbitrum", volume: "$90.3M", icon: "🔵", color: "bg-blue-800" },
    { chain: "Avalanche", volume: "$59.88M", icon: "🔴", color: "bg-red-500" },
    { chain: "Bera", volume: "$16.21M", icon: "🟤", color: "bg-amber-800" },
    { chain: "Ronin", volume: "$1.28M", icon: "🔵", color: "bg-blue-400" },
    { chain: "Blast", volume: "$521,178.56", icon: "🟡", color: "bg-yellow-400" },
    { chain: "Lukso", volume: "$348,298.99", icon: "🔴", color: "bg-pink-500" }
  ];

  const usersData = [
    { chain: "Polygon", users: 4175, icon: "🟣", color: "bg-purple-500" },
    { chain: "Base", users: 2712, icon: "⚪", color: "bg-blue-600" },
    { chain: "Ethereum", users: 2188, icon: "🔵", color: "bg-blue-500" },
    { chain: "BNB Chain", users: 675, icon: "🟡", color: "bg-yellow-500" },
    { chain: "Arbitrum", users: 337, icon: "🔵", color: "bg-blue-800" },
    { chain: "Avalanche", users: 139, icon: "🔴", color: "bg-red-500" },
    { chain: "Bera", users: 41, icon: "🟤", color: "bg-amber-800" },
    { chain: "Linea", users: 26, icon: "⚫", color: "bg-black" },
    { chain: "Ronin", users: 23, icon: "🔵", color: "bg-blue-400" },
    { chain: "Blast", users: 18, icon: "🟡", color: "bg-yellow-400" }
  ];

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

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Show loading state when transactions are loading
  if (isLoading || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: styles.primaryColor }} />
          <p className="text-lg font-medium font-montserrat" style={{ color: styles.primaryColor }}>
            Loading market insights...
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
          Market Insights {selectedContract ? `for ${selectedContract.name}` : ''}
        </h1>
        <p className="text-sm text-gray-600 font-poppins mt-1">
          Explore market trends and user distribution across blockchains
        </p>
      </div>

      {/* User Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {userCategories.map((category, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-lg mb-2 font-montserrat" style={{ color: styles.primaryColor }}>{category.title}</h2>
            <p className="text-2xl font-bold mt-1 font-montserrat">{formatNumber(category.count)}</p>
            <p className="text-xs text-gray-500 font-poppins">Users</p>
          </div>
        ))}
      </div>

      {/* Chain Data Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Transaction Volume Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-lg mb-4 font-montserrat" style={{ color: styles.primaryColor }}>Total transaction volume by chain</h2>
          <div className="overflow-y-auto max-h-96">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 font-montserrat">Chain</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 font-montserrat">TX Volume</th>
                </tr>
              </thead>
              <tbody className="font-poppins">
                {transactionData.map((item, index) => (
                  <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 flex items-center">
                      <span className={`inline-block w-6 h-6 rounded-full mr-3 flex items-center justify-center text-sm ${item.color}`}>
                        {item.icon}
                      </span>
                      <span className="font-medium text-sm">{item.chain}</span>
                    </td>
                    <td className="py-3 text-right font-medium text-sm">{item.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Users Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-lg mb-4 font-montserrat" style={{ color: styles.primaryColor }}>Unique active users by chain</h2>
          <div className="overflow-y-auto max-h-96">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 font-montserrat">Chain</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 font-montserrat">Unique Users</th>
                </tr>
              </thead>
              <tbody className="font-poppins">
                {usersData.map((item, index) => (
                  <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 flex items-center">
                      <span className={`inline-block w-6 h-6 rounded-full mr-3 flex items-center justify-center text-sm ${item.color}`}>
                        {item.icon}
                      </span>
                      <span className="font-medium text-sm">{item.chain}</span>
                    </td>
                    <td className="py-3 text-right font-medium text-sm">{formatNumber(item.users)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
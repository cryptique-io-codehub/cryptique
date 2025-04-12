import { useState } from 'react';

export default function OnchainmarketInsights() {
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

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="bg-gray-50 p-4 w-full min-h-screen font-poppins">
      {/* Import the fonts in the head */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');
      `}</style>

      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-800 font-montserrat">Market Insight</h1>
      </div>

      {/* User Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {userCategories.map((category, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-lg font-bold text-indigo-900 font-montserrat">{category.title}</h2>
            <p className="text-3xl font-bold mt-2 font-poppins">{formatNumber(category.count)}</p>
            <p className="text-sm text-gray-500 font-poppins">Users</p>
          </div>
        ))}
      </div>

      {/* Chain Data Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Volume Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4 font-montserrat">Total transaction volume by chain</h2>
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
                  <tr key={index} className="border-t border-gray-100">
                    <td className="py-3 flex items-center">
                      <span className={`inline-block w-6 h-6 rounded-full mr-3 flex items-center justify-center text-sm ${item.color}`}>
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.chain}</span>
                    </td>
                    <td className="py-3 text-right font-medium">{item.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Users Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4 font-montserrat">Unique active users by chain</h2>
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
                  <tr key={index} className="border-t border-gray-100">
                    <td className="py-3 flex items-center">
                      <span className={`inline-block w-6 h-6 rounded-full mr-3 flex items-center justify-center text-sm ${item.color}`}>
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.chain}</span>
                    </td>
                    <td className="py-3 text-right font-medium">{formatNumber(item.users)}</td>
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
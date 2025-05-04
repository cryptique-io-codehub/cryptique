import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Web3UsersByMedium = ({ analytics }) => {
  const [timeFrame, setTimeFrame] = useState('24h');
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!analytics?.sessions?.length) {
      setChartData([]);
      return;
    }

    const processData = () => {
      const now = new Date();
      let startDate;

      // Set start date based on selected timeframe
      switch (timeFrame) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '365d':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Initialize medium data
      const mediumData = {};

      // Process sessions within the timeframe
      analytics.sessions.forEach(session => {
        if (!session.startTime) return;
        
        const sessionDate = new Date(session.startTime);
        if (sessionDate < startDate) return;

        // Get medium from UTM data or default to 'direct'
        const medium = session.utmData?.medium || 'direct';
        
        // Initialize medium if not exists
        if (!mediumData[medium]) {
          mediumData[medium] = {
            web3Users: new Set(),
            totalUsers: new Set()
          };
        }

        // Add user to total users if userId exists
        if (session.userId) {
          mediumData[medium].totalUsers.add(session.userId);
        }

        // Check if user is a Web3 user (has wallet or chain info)
        const isWeb3User = session.wallet && (
          (session.wallet.walletType && session.wallet.walletType !== 'No Wallet Detected') ||
          (session.wallet.chainName && session.wallet.chainName !== 'No Wallet Detected') ||
          (session.wallet.walletAddress && session.wallet.walletAddress.trim() !== '')
        );

        if (isWeb3User && session.userId) {
          mediumData[medium].web3Users.add(session.userId);
        }
      });

      // Convert to chart data format
      const data = Object.entries(mediumData)
        .filter(([_, data]) => data.totalUsers.size > 0) // Only include mediums with users
        .map(([medium, data]) => ({
          medium: medium.charAt(0).toUpperCase() + medium.slice(1),
          web3Users: data.web3Users.size,
          totalUsers: data.totalUsers.size,
          conversion: data.totalUsers.size > 0 
            ? ((data.web3Users.size / data.totalUsers.size) * 100).toFixed(1)
            : 0
        }));

      // Sort by number of Web3 users
      data.sort((a, b) => b.web3Users - a.web3Users);

      setChartData(data);
    };

    processData();
  }, [analytics, timeFrame]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4 font-montserrat">Web3 Users by Source</h2>
      
      {isLoading && (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
        </div>
      )}
      
      {error && (
        <div className="text-red-500 p-4 text-center font-poppins">{error}</div>
      )}
      
      {!isLoading && !error && chartData.length === 0 && (
        <div className="text-gray-500 p-4 text-center font-poppins">No data available</div>
      )}
      
      {!isLoading && !error && chartData.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="source" 
                tick={{ fontSize: 10, fontFamily: "'Poppins', sans-serif" }}
              />
              <YAxis 
                tick={{ fontSize: 10, fontFamily: "'Poppins', sans-serif" }}
              />
              <Tooltip 
                contentStyle={{ fontFamily: "'Poppins', sans-serif" }}
                labelStyle={{ fontFamily: "'Montserrat', sans-serif", fontWeight: "bold" }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: "'Poppins', sans-serif" }}
              />
              <Bar 
                dataKey="web3users" 
                name="Web3 Users" 
                fill="#8884d8" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="walletsConnected" 
                name="Wallets Connected" 
                fill="#82ca9d"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Web3UsersByMedium; 
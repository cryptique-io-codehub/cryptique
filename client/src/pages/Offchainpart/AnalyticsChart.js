import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import axiosInstance from '../../axiosInstance';

const AnalyticsChart = ({ analytics, setAnalytics, isLoading, error }) => {
  const [chartData, setChartData] = useState(null);
  const [timeframe, setTimeframe] = useState('hourly');

  useEffect(() => {
    if (analytics && analytics.siteId) {
      generateChartData();
    } else {
      setChartData(null);
    }
  }, [analytics, timeframe]);

  const generateChartData = () => {
    if (!analytics || !analytics.sessions) {
      setChartData(null);
      return;
    }

    // Get current date for filtering
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today - 24 * 60 * 60 * 1000);

    // Filter sessions based on timeframe
    const filteredSessions = analytics.sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      
      switch (timeframe) {
        case 'hourly':
          // Show last 24 hours
          return sessionDate >= yesterday && sessionDate <= now;
        case 'daily':
          return sessionDate >= today;
        case 'weekly':
          return sessionDate >= new Date(today - 7 * 24 * 60 * 60 * 1000);
        case 'monthly':
          return sessionDate >= new Date(today.getFullYear(), today.getMonth(), 1);
        default:
          return true;
      }
    });

    // Group sessions by time interval
    const groupedData = filteredSessions.reduce((acc, session) => {
      const date = new Date(session.startTime);
      let timeKey;

      switch (timeframe) {
        case 'hourly':
          // Format as HH:MM
          timeKey = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          break;
        case 'daily':
          timeKey = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          break;
        case 'weekly':
          timeKey = `Week ${Math.ceil(date.getDate() / 7)}`;
          break;
        case 'monthly':
          timeKey = date.toLocaleDateString([], { month: 'short', year: 'numeric' });
          break;
        default:
          timeKey = date.toLocaleTimeString();
      }

      if (!acc[timeKey]) {
        acc[timeKey] = {
          visitors: 0,
          wallets: 0,
          timestamp: date.getTime()
        };
      }

      acc[timeKey].visitors++;
      
      // Debug logging for wallet data
      console.log('Session wallet data:', {
        timeKey,
        wallet: session.wallet,
        walletAddress: session.wallet?.walletAddress,
        walletType: session.wallet?.walletType,
        chainName: session.wallet?.chainName
      });

      // Only count as wallet if:
      // 1. wallet object exists
      // 2. walletAddress exists and is not empty
      // 3. walletAddress is not just whitespace
      const hasWallet = session.wallet && 
                       session.wallet.walletAddress && 
                       session.wallet.walletAddress.trim() !== '' &&
                       session.wallet.walletAddress !== 'undefined' &&
                       session.wallet.walletAddress !== 'null';

      if (hasWallet) {
        console.log('Counting wallet for time:', timeKey, 'with address:', session.wallet.walletAddress);
        acc[timeKey].wallets++;
      } else {
        console.log('Not counting wallet for time:', timeKey, 'because:', {
          hasWalletObject: !!session.wallet,
          hasWalletAddress: !!session.wallet?.walletAddress,
          walletAddress: session.wallet?.walletAddress
        });
      }

      return acc;
    }, {});

    // Debug logging for grouped data
    console.log('Grouped data before formatting:', groupedData);

    // For hourly view, ensure we have all 24 hours
    if (timeframe === 'hourly') {
      const hours = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(now - (23 - i) * 60 * 60 * 1000);
        return hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      });

      hours.forEach(hour => {
        if (!groupedData[hour]) {
          groupedData[hour] = {
            visitors: 0,
            wallets: 0,
            timestamp: new Date(now - (23 - hours.indexOf(hour)) * 60 * 60 * 1000).getTime()
          };
        }
      });
    }

    // Convert to array and sort by timestamp
    const sortedData = Object.entries(groupedData)
      .map(([time, data]) => ({
        time,
        ...data
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Debug logging for final data
    console.log('Final sorted data:', sortedData);

    const formattedData = {
      labels: sortedData.map(item => item.time),
      datasets: [
        {
          label: 'Visitors',
          data: sortedData.map(item => ({
            x: item.time,
            y: item.visitors
          })),
          backgroundColor: 'rgba(252, 211, 77, 0.5)',
          borderColor: '#fcd34d',
          borderWidth: 1
        },
        {
          label: 'Wallets',
          data: sortedData.map(item => ({
            x: item.time,
            y: item.wallets
          })),
          backgroundColor: 'rgba(139, 92, 246, 0.7)',
          borderColor: '#8b5cf6',
          borderWidth: 1
        }
      ]
    };

    console.log('Final formatted chart data:', formattedData);
    setChartData(formattedData);
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-2xl mt-4 w-full">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-2xl mt-4 w-full">
        <div className="h-64 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (!chartData || !chartData.labels.length) {
    return (
      <div className="bg-white p-4 rounded-2xl mt-4 w-full">
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-2xl mt-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Analytics Overview</h3>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="px-3 py-1 border rounded-md"
        >
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData.datasets[0].data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis />
            <Tooltip />
            <Legend />
            {chartData.datasets.map((dataset, index) => (
              <Area
                key={index}
                type="monotone"
                dataKey="y"
                name={dataset.label}
                stackId={index}
                stroke={dataset.borderColor}
                fill={dataset.backgroundColor}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsChart;
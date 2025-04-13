import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import axiosInstance from '../../axiosInstance';

const AnalyticsChart = ({ analytics, setAnalytics, isLoading, error }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });
  const [timeframe, setTimeframe] = useState('daily');

  // Format time key based on timeframe
  const formatTimeKey = (date, timeframe) => {
    switch (timeframe) {
      case 'daily':
        const hour = date.getHours();
        const minute = Math.floor(date.getMinutes() / 30) * 30;
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      case 'weekly':
        return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
      case 'monthly':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'yearly':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleTimeString();
    }
  };

  // Calculate interval for x-axis labels based on data length
  const getLabelInterval = (dataLength) => {
    if (dataLength <= 7) return 0; // Show all labels for small datasets
    if (dataLength <= 14) return 1; // Show every other label
    if (dataLength <= 30) return 2; // Show every third label
    return Math.ceil(dataLength / 10); // Show approximately 10 labels
  };

  useEffect(() => {
    if (!analytics || !analytics.sessions) {
      setChartData({
        labels: [],
        datasets: []
      });
      return;
    }

    const finalData = {};
    console.log('Raw Analytics Data:', analytics);
    console.log('Sessions:', analytics.sessions);
    console.log('Wallets:', analytics.wallets);

    // Generate empty buckets for all time slots in the selected timeframe
    const now = new Date();
    const startDate = new Date(now.getTime() - (
      timeframe === 'daily' ? 24 * 60 * 60 * 1000 :
      timeframe === 'weekly' ? 7 * 24 * 60 * 60 * 1000 :
      timeframe === 'monthly' ? 30 * 24 * 60 * 60 * 1000 :
      timeframe === 'yearly' ? 365 * 24 * 60 * 60 * 1000 :
      24 * 60 * 60 * 1000
    ));

    // Create buckets for all time slots based on timeframe
    let currentDate = new Date(startDate);
    while (currentDate <= now) {
      const timeKey = formatTimeKey(currentDate, timeframe);
      finalData[timeKey] = {
        timestamp: currentDate.getTime(),
        time: timeKey,
        visitors: 0,
        walletConnects: 0
      };

      // Increment date based on timeframe
      switch (timeframe) {
        case 'daily':
          currentDate = new Date(currentDate.getTime() + 30 * 60 * 1000); // 30 minutes
          break;
        case 'weekly':
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // 1 day
          break;
        case 'monthly':
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // 1 day
          break;
        case 'yearly':
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // 1 day
          break;
        default:
          currentDate = new Date(currentDate.getTime() + 30 * 60 * 1000);
      }
    }

    // Process sessions data
    analytics.sessions.forEach(session => {
      const date = new Date(session.startTime);
      const timeKey = formatTimeKey(date, timeframe);
      
      if (finalData[timeKey]) {
        finalData[timeKey].visitors++;
      }
    });

    // Process wallet connects data - track unique wallets per time slot
    analytics.wallets.forEach(wallet => {
      if (wallet.walletAddress && wallet.walletAddress !== '') {
        const date = new Date(wallet.timestamp || Date.now());
        const timeKey = formatTimeKey(date, timeframe);
        
        if (finalData[timeKey]) {
          // Initialize uniqueWallets Set if it doesn't exist
          if (!finalData[timeKey].uniqueWallets) {
            finalData[timeKey].uniqueWallets = new Set();
          }
          // Add wallet to this time slot's unique wallets
          finalData[timeKey].uniqueWallets.add(wallet.walletAddress);
          // Update the count
          finalData[timeKey].walletConnects = finalData[timeKey].uniqueWallets.size;
        }
      }
    });

    console.log('Processed Final Data:', finalData);

    // Convert to array and sort by timestamp
    const sortedData = Object.entries(finalData)
      .map(([time, data]) => ({
        time,
        ...data
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log('Sorted Data:', sortedData);

    const formattedData = {
      labels: sortedData.map(item => item.time),
      datasets: [
        {
          label: 'Visitors',
          data: sortedData.map(item => ({
            x: item.time,
            y: item.visitors || 0
          })),
          backgroundColor: 'rgba(252, 211, 77, 0.5)',
          borderColor: '#fcd34d',
          borderWidth: 1
        },
        {
          label: 'Wallets',
          data: sortedData.map(item => ({
            x: item.time,
            y: item.walletConnects || 0
          })),
          backgroundColor: 'rgba(139, 92, 246, 0.7)',
          borderColor: '#8b5cf6',
          borderWidth: 1
        }
      ]
    };

    console.log('Formatted Chart Data:', formattedData);
    setChartData(formattedData);
  }, [analytics, timeframe]);

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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Analytics Overview</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeframe('daily')}
            className={`px-3 py-1 rounded-md text-sm ${
              timeframe === 'daily'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeframe('weekly')}
            className={`px-3 py-1 rounded-md text-sm ${
              timeframe === 'weekly'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-3 py-1 rounded-md text-sm ${
              timeframe === 'monthly'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeframe('yearly')}
            className={`px-3 py-1 rounded-md text-sm ${
              timeframe === 'yearly'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData.datasets[0].data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x" 
              tick={{ fontSize: 12 }}
              interval={getLabelInterval(chartData.labels.length)}
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => {
                switch (timeframe) {
                  case 'daily':
                    return value;
                  case 'weekly':
                  case 'monthly':
                  case 'yearly':
                    return value.split(',')[0];
                  default:
                    return value;
                }
              }}
            />
            <YAxis />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const visitors = payload[0]?.value || 0;
                  const wallets = payload[1]?.value || 0;
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg">
                      <p className="font-semibold">{label}</p>
                      <p className="text-yellow-500">Visitors: {visitors}</p>
                      <p className="text-purple-500">Wallets: {wallets}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="y"
              name="Visitors"
              stackId="1"
              stroke="#fcd34d"
              fill="#fcd34d"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="y"
              name="Wallets"
              stackId="2"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsChart;
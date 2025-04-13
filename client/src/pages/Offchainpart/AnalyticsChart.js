import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import axiosInstance from '../../axiosInstance';

const AnalyticsChart = ({ analytics, setAnalytics, isLoading, error }) => {
  const [chartData, setChartData] = useState(null);
  const [timeframe, setTimeframe] = useState('daily');

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
    let startDate;

    switch (timeframe) {
      case 'daily':
        startDate = new Date(today);
        break;
      case 'weekly':
        startDate = new Date(today - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(today - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'yearly':
        startDate = new Date(today - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = today;
    }

    // Filter sessions based on timeframe
    const filteredSessions = analytics.sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= startDate && sessionDate <= now;
    });

    // Group sessions by time interval
    const groupedData = filteredSessions.reduce((acc, session) => {
      const date = new Date(session.startTime);
      let timeKey;

      switch (timeframe) {
        case 'daily':
          // Group by 30-minute intervals
          const minutes = date.getMinutes();
          const roundedMinutes = Math.floor(minutes / 30) * 30;
          const hour = date.getHours();
          timeKey = `${hour.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
          break;
        case 'weekly':
          timeKey = date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
          break;
        case 'monthly':
          timeKey = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          break;
        case 'yearly':
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
      
      // Only count as wallet if walletAddress exists and is not empty
      const hasWallet = session.wallet && 
                       session.wallet.walletAddress && 
                       session.wallet.walletAddress.trim() !== '' &&
                       session.wallet.walletAddress !== 'undefined' &&
                       session.wallet.walletAddress !== 'null';

      if (hasWallet) {
        acc[timeKey].wallets++;
      }

      return acc;
    }, {});

    // Generate empty buckets for the selected timeframe
    const emptyBuckets = {};
    const currentDate = new Date();

    switch (timeframe) {
      case 'daily':
        // Generate 48 30-minute intervals for the day
        for (let hour = 0; hour < 24; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            emptyBuckets[timeKey] = {
              visitors: 0,
              wallets: 0,
              timestamp: new Date(currentDate.setHours(hour, minute, 0, 0)).getTime()
            };
          }
        }
        break;
      case 'weekly':
        // Generate last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today - i * 24 * 60 * 60 * 1000);
          const timeKey = date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
          emptyBuckets[timeKey] = {
            visitors: 0,
            wallets: 0,
            timestamp: date.getTime()
          };
        }
        break;
      case 'monthly':
        // Generate last 30 days
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today - i * 24 * 60 * 60 * 1000);
          const timeKey = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          emptyBuckets[timeKey] = {
            visitors: 0,
            wallets: 0,
            timestamp: date.getTime()
          };
        }
        break;
      case 'yearly':
        // Generate last 12 months
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const timeKey = date.toLocaleDateString([], { month: 'short', year: 'numeric' });
          emptyBuckets[timeKey] = {
            visitors: 0,
            wallets: 0,
            timestamp: date.getTime()
          };
        }
        break;
    }

    // Merge actual data with empty buckets
    const finalData = { ...emptyBuckets, ...groupedData };

    // Convert to array and sort by timestamp
    const sortedData = Object.entries(finalData)
      .map(([time, data]) => ({
        time,
        ...data
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

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
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
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
            <YAxis 
              domain={[0, 'dataMax']}
              allowDataOverflow={false}
            />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="y"
              name="Visitors"
              data={chartData.datasets[0].data}
              stroke="#fcd34d"
              fill="rgba(252, 211, 77, 0.5)"
              fillOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="y"
              name="Wallets"
              data={chartData.datasets[1].data}
              stroke="#8b5cf6"
              fill="rgba(139, 92, 246, 0.7)"
              fillOpacity={0.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsChart;
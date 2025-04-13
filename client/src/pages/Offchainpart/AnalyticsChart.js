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

    const now = new Date();
    let startDate;
    let interval;

    switch (timeframe) {
      case 'daily':
        startDate = new Date(now - 24 * 60 * 60 * 1000); // 24 hours ago
        interval = 30 * 60 * 1000; // 30 minutes
        break;
      case 'weekly':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        interval = 24 * 60 * 60 * 1000; // 1 day
        break;
      case 'monthly':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        interval = 24 * 60 * 60 * 1000; // 1 day
        break;
      case 'yearly':
        startDate = new Date(now - 365 * 24 * 60 * 60 * 1000); // 365 days ago
        interval = 24 * 60 * 60 * 1000; // 1 day
        break;
      default:
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        interval = 30 * 60 * 1000;
    }

    // Filter sessions based on timeframe
    const filteredSessions = analytics.sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= startDate && sessionDate <= now;
    });

    // Generate empty buckets for the selected timeframe
    const emptyBuckets = {};
    let currentDate = new Date(startDate);

    while (currentDate <= now) {
      let timeKey;
      switch (timeframe) {
        case 'daily':
          const hour = currentDate.getHours();
          const minute = Math.floor(currentDate.getMinutes() / 30) * 30;
          timeKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          break;
        case 'weekly':
          timeKey = currentDate.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
          break;
        case 'monthly':
          timeKey = currentDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
          break;
        case 'yearly':
          timeKey = currentDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
          break;
      }

      emptyBuckets[timeKey] = {
        visitors: 0,
        wallets: 0,
        timestamp: currentDate.getTime()
      };

      currentDate = new Date(currentDate.getTime() + interval);
    }

    // Group sessions by time interval
    const groupedData = filteredSessions.reduce((acc, session) => {
      const date = new Date(session.startTime);
      let timeKey;

      switch (timeframe) {
        case 'daily':
          const hour = date.getHours();
          const minute = Math.floor(date.getMinutes() / 30) * 30;
          timeKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          break;
        case 'weekly':
          timeKey = date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
          break;
        case 'monthly':
          timeKey = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          break;
        case 'yearly':
          timeKey = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          break;
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

    // Merge actual data with empty buckets
    const finalData = { ...emptyBuckets, ...groupedData };

    // Convert to array and sort by timestamp
    const sortedData = Object.entries(finalData)
      .map(([time, data]) => ({
        time,
        ...data
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((item, index, self) => 
        index === self.findIndex((t) => t.time === item.time)
      );

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
              interval={0}
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
            <YAxis 
              domain={[0, 'dataMax']}
              allowDataOverflow={false}
            />
            <Tooltip 
              labelFormatter={(value) => {
                switch (timeframe) {
                  case 'daily':
                    return `Time: ${value}`;
                  default:
                    return `Date: ${value}`;
                }
              }}
            />
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
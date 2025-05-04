import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import axiosInstance from '../../axiosInstance';

// Updated styles to use Montserrat and Poppins fonts
const styles = {
  container: {},
  heading: {
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 600,
  },
  buttonActive: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    fontWeight: 500,
    fontFamily: "'Poppins', sans-serif",
  },
  buttonInactive: {
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    fontFamily: "'Poppins', sans-serif",
  }
};

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

    // Generate time range based on current time
    const now = new Date();
    const startDate = new Date(now.getTime() - (
      timeframe === 'daily' ? 24 * 60 * 60 * 1000 :
      timeframe === 'weekly' ? 7 * 24 * 60 * 60 * 1000 :
      timeframe === 'monthly' ? 30 * 24 * 60 * 60 * 1000 :
      timeframe === 'yearly' ? 365 * 24 * 60 * 60 * 1000 :
      24 * 60 * 60 * 1000
    ));

    // Filter sessions within the selected time range first
    const filteredSessions = analytics.sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= startDate && sessionDate <= now;
    });

    console.log('Filtered sessions for timeframe:', {
      timeframe,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalSessions: analytics.sessions.length,
      filteredCount: filteredSessions.length
    });

    // Create buckets for all time slots based on timeframe
    let currentDate = new Date(startDate);
    while (currentDate <= now) {
      const timeKey = formatTimeKey(currentDate, timeframe);
      finalData[timeKey] = {
        timestamp: currentDate.getTime(),
        time: timeKey,
        visitors: new Set(),
        walletConnects: new Set()
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

    // Process only the filtered sessions
    filteredSessions.forEach(session => {
      const date = new Date(session.startTime);
      const timeKey = formatTimeKey(date, timeframe);
      
      if (finalData[timeKey]) {
        // Add unique visitor ID (using device or userId)
        const visitorId = session.device || session.userId;
        finalData[timeKey].visitors.add(visitorId);
        
        // Check if this session has a wallet connection
        if (session.wallet && session.wallet.walletAddress && session.wallet.walletAddress !== '' && session.wallet.walletAddress !== 'No Wallet Detected') {
          finalData[timeKey].walletConnects.add(session.wallet.walletAddress);
          console.log(`Added wallet connection from session to time slot: ${timeKey}`, {
            address: session.wallet.walletAddress,
            sessionTime: date.toString()
          });
        }
      }
    });

    // Convert Sets to counts
    Object.keys(finalData).forEach(key => {
      finalData[key].visitors = finalData[key].visitors.size;
      finalData[key].walletConnects = finalData[key].walletConnects.size;
    });
    
    console.log('Final data after processing:', finalData);

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
        <h2 className="text-lg font-semibold text-gray-800 font-montserrat" style={styles.heading}>Analytics Overview</h2>
        <div className="flex space-x-2">
          {['daily', 'weekly', 'monthly', 'yearly'].map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1 rounded-md text-sm font-poppins`}
              style={timeframe === period ? styles.buttonActive : styles.buttonInactive}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData.datasets[0].data.map((item, index) => ({
              time: item.x,
              visitors: item.y,
              wallets: chartData.datasets[1].data[index].y
            }))}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              interval={getLabelInterval(chartData.labels.length)}
              tick={{ fill: '#6B7280', fontSize: 12 }}
            />
            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg">
                      <p className="font-semibold">{label}</p>
                      <p className="text-yellow-500">Visitors: {payload[0]?.value || 0}</p>
                      <p className="text-purple-500">Wallets Connected: {payload[1]?.value || 0}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="visitors"
              stackId="1"
              stroke="#fcd34d"
              fill="rgba(252, 211, 77, 0.5)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="wallets"
              stackId="2"
              stroke="#8b5cf6"
              fill="rgba(139, 92, 246, 0.7)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsChart;
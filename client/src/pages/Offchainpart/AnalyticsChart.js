import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import axiosInstance from '../../axiosInstance';

const AnalyticsChart = ({ analytics, setAnalytics, isLoading, error }) => {
  const [chartData, setChartData] = useState(null);
  const [timeframe, setTimeframe] = useState('hourly');
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: null,
    end: null
  });

  useEffect(() => {
    if (analytics && analytics.siteId) {
      fetchChartData();
    } else {
      setChartData(null);
    }
  }, [analytics, timeframe, selectedDateRange]);

  const fetchChartData = async () => {
    try {
      if (!analytics?.siteId) {
        console.error('No siteId available');
        return;
      }

      const response = await axiosInstance.get(`/analytics/chart`, {
        params: {
          siteId: analytics.siteId,
          timeframe,
          start: selectedDateRange.start,
          end: selectedDateRange.end
        }
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setChartData(response.data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData(null);
    }
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

  return (
    <div className="bg-white p-4 rounded-2xl mt-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <div className="flex space-x-4">
          <select 
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-300 mr-2"></div>
              <span className="text-xs">Visitors</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-purple-600 mr-2"></div>
              <span className="text-xs">Wallets</span>
            </div>
          </div>
        </div>
      </div>

      {chartData ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData.datasets[0].data.map((value, index) => ({
                time: chartData.labels[index],
                visitors: value,
                wallets: chartData.datasets[1].data[index]
              }))}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: '0.75rem' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: '0.75rem' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem'
                }}
                formatter={(value) => [value.toLocaleString(), '']}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="visitors"
                stackId="1"
                stroke="#fcd34d"
                fill="rgba(252, 211, 77, 0.5)"
              />
              <Area
                type="monotone"
                dataKey="wallets"
                stackId="1"
                stroke="#8b5cf6"
                fill="rgba(139, 92, 246, 0.7)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      )}
    </div>
  );
};

export default AnalyticsChart;
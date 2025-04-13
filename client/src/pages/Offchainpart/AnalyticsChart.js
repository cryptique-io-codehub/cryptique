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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    switch (timeframe) {
      case 'hourly':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'daily':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'weekly':
        return `Week ${Math.ceil(date.getDate() / 7)}`;
      case 'monthly':
        return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
      default:
        return date.toLocaleTimeString();
    }
  };

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

      // Format the data properly
      const formattedData = {
        labels: response.data.labels.map(label => formatDate(label)),
        datasets: response.data.datasets.map(dataset => ({
          ...dataset,
          data: dataset.data.map((value, index) => ({
            x: formatDate(response.data.labels[index]),
            y: value
          }))
        }))
      };

      setChartData(formattedData);
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
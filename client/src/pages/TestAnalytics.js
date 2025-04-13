import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TestAnalytics = () => {
  const [timeframe, setTimeframe] = useState('daily');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching data for timeframe:', timeframe);
      
      const response = await fetch(`http://localhost:5000/api/analytics/chart?siteId=test-site-1&timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Received non-JSON response:', text);
        throw new Error('Server did not return JSON');
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      // Transform data for the chart
      const transformedData = data.map(item => ({
        timestamp: item.timestamp,
        visitors: item.visitors,
        pageViews: item.pageViews
      }));
      
      setChartData(transformedData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data initially and then every 15 seconds
  useEffect(() => {
    fetchChartData();
    const interval = setInterval(fetchChartData, 15000);
    return () => clearInterval(interval);
  }, [timeframe]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (chartData.length === 0) return <div className="p-4">No data available</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Analytics Test Page</h1>
      
      <div className="mb-4">
        <label className="mr-2">Timeframe:</label>
        <select 
          value={timeframe} 
          onChange={(e) => setTimeframe(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
              formatter={(value, name) => [value, name === 'visitors' ? 'Visitors' : 'Page Views']}
            />
            <Area 
              type="monotone" 
              dataKey="visitors" 
              stackId="1" 
              stroke="#8884d8" 
              fill="#8884d8" 
              name="Visitors"
            />
            <Area 
              type="monotone" 
              dataKey="pageViews" 
              stackId="1" 
              stroke="#82ca9d" 
              fill="#82ca9d" 
              name="Page Views"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TestAnalytics; 
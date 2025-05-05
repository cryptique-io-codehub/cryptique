import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { isWeb3User } from '../../../utils/analyticsHelpers';

const Web3UsersByMedium = ({ analytics }) => {
  const [timeFrame, setTimeFrame] = useState('24h');
  const [chartData, setChartData] = useState([]);

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

        // Use the standardized isWeb3User function
        if (isWeb3User(session) && session.userId) {
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
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Web3 Users by Medium</h3>
        <select 
          className="border rounded px-2 py-1 text-sm"
          value={timeFrame}
          onChange={(e) => setTimeFrame(e.target.value)}
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="365d">Last 365 Days</option>
        </select>
      </div>

      {chartData.length > 0 ? (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="medium" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'conversion') {
                      return [`${value}%`, 'Conversion Rate'];
                    }
                    return [value, name === 'web3Users' ? 'Web3 Users' : 'Total Users'];
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="web3Users" 
                  name="Web3 Users" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalUsers" 
                  name="Total Users" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">Conversion Rates by Medium</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {chartData.map((item) => (
                <div key={item.medium} className="bg-gray-50 p-2 rounded">
                  <div className="text-sm font-medium">{item.medium}</div>
                  <div className="text-lg font-bold">{item.conversion}%</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available for the selected period
        </div>
      )}
    </div>
  );
};

export default Web3UsersByMedium; 
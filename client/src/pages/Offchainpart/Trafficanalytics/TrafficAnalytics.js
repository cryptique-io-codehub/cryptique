import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TrafficAnalytics = ({ analytics, setanalytics, trafficSources, setTrafficSources }) => {
  // Transform traffic sources data for the chart
  const chartData = trafficSources.map(source => ({
    name: source.source,
    visitors: source.visitors,
    wallets: source.wallets
  }));

  return (
    <div className="w-full bg-white p-4 md:p-6 rounded-xl md:rounded-2xl">
      <h2 className="text-lg md:text-xl font-semibold mb-4">Traffic Analytics</h2>
      <div className="h-64 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="visitors" fill="#8884d8" name="Visitors" />
            <Bar dataKey="wallets" fill="#82ca9d" name="Wallets" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrafficAnalytics; 
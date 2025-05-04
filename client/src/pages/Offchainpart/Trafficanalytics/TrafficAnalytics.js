import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Legend, ZAxis } from 'recharts';
import TrafficSourcesComponent from '../TrafficSourcesComponent';
import Web3UsersByMedium from './Web3UsersByMedium';
// ... existing code ...

const TrafficAnalytics = ({ analytics, setanalytics, trafficSources, setTrafficSources }) => {
  // State for metrics
  const [metrics, setMetrics] = useState({
    bestSource: '',
    totalSessions: 0,
    web3Users: 0,
    walletsConnected: 0,
    leastEffectiveSource: '',
    avgConversion: '0%',
    avgBounceRate: '0%',
    bestSourceByWeb3: '',
    bestSourceByWallets: '',
  });

  // State for traffic quality data
  const [trafficQualityData, setTrafficQualityData] = useState([]);

  // Helper function to format numbers (K, M)
  const formatNumber = (num) => {
    return num >= 1000000 
      ? `${(num / 1000000).toFixed(1)}M` 
      : num >= 1000 
        ? `${(num / 1000).toFixed(1)}K` 
        : num;
  };

  // MetricCard component for displaying metrics
  const MetricCard = ({ title, value, source }) => (
    <div className="bg-white rounded-lg shadow p-2 md:p-4">
      <div className="text-xs md:text-sm text-gray-500 mb-1">{title}</div>
      <div className="flex items-center justify-center h-12 md:h-24">
        <span className="text-lg md:text-xl font-bold">{value}</span>
      </div>
      {source && <div className="text-xs text-center text-gray-500">From {source}</div>}
    </div>
  );

  // Custom tooltip for the scatter plot
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-md rounded text-xs md:text-sm">
          <p className="font-semibold">{data.source}</p>
          <p>Engagement: {data.engagement} mins</p>
          <p>Conversion: {data.conversion}%</p>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    if (!analytics || !analytics.sessions || analytics.sessions.length === 0) return;
    
    // Process analytics data for traffic quality
    const processTrafficQualityData = () => {
      // ... existing traffic quality data processing ...
    };

    processTrafficQualityData();
  }, [analytics]);

  return (
    <div className="bg-gray-50 min-h-screen p-6 font-poppins">
      {/* Import the fonts in the head */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');
      `}</style>

      <h1 className="text-2xl font-bold mb-6 font-montserrat">Traffic Analytics</h1>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Traffic Sources Component */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Traffic Sources</h2>
          <TrafficSourcesComponent 
            analytics={analytics}
            setanalytics={setanalytics}
            trafficSources={trafficSources} 
            setTrafficSources={setTrafficSources} 
          />
        </div>
        
        {/* User Behavior Component */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">User Behavior</h2>
          {/* ... user behavior content ... */}
        </div>
        
        {/* Geographic Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Geographic Distribution</h2>
          {/* ... geographic distribution content ... */}
        </div>
        
        {/* Device Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Device Breakdown</h2>
          {/* ... device breakdown content ... */}
        </div>
        
      </div>
    </div>
  );
};

export default TrafficAnalytics; 
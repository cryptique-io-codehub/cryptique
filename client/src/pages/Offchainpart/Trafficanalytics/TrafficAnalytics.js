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
    <div className="p-2 md:p-4 max-w-full overflow-hidden">
      {/* Page Title */}
      <h1 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">TrafficAnalytics</h1>
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
        <MetricCard title="Total Sessions" value={formatNumber(metrics.totalSessions)} source={metrics.bestSource} />
        <MetricCard title="Web3 Users" value={formatNumber(metrics.web3Users)} source={metrics.bestSourceByWeb3} />
        <MetricCard title="Wallets Connected" value={formatNumber(metrics.walletsConnected)} source={metrics.bestSourceByWallets} />
        <div className="col-span-2 md:col-span-1 bg-white rounded-lg shadow p-2 md:p-4">
          <div className="text-xs md:text-sm text-gray-500 mb-1">Least effective source</div>
          <div className="flex items-center justify-center h-12 md:h-24">
            <span className="text-lg md:text-xl font-bold">{metrics.leastEffectiveSource}</span>
          </div>
        </div>
        <MetricCard title="Best Conversion" value={metrics.avgConversion} source={metrics.bestSource} />
        <MetricCard title="Avg Bounce Rate" value={metrics.avgBounceRate} source={metrics.bestSource} />
      </div>

      {/* Attribution Journey + Traffic Sources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="col-span-1 md:col-span-2 bg-white rounded-lg shadow">
          <AttributionJourneySankey analytics={analytics} setanalytics={setanalytics} />
        </div>
        <div className="col-span-1 md:col-span-1">
          <TrafficSourcesComponent 
            analytics={analytics}
            setanalytics={setanalytics}
            trafficSources={trafficSources} 
            setTrafficSources={setTrafficSources} 
          />
        </div>
      </div>

      {/* Traffic Quality + Web3 Users by Medium */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Traffic Quality Analysis */}
        <div className="bg-white rounded-lg shadow p-2 md:p-4">
          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4">Traffic Quality Analysis</h3>
          <div className="text-center text-xs md:text-sm text-gray-600 mb-1 md:mb-2">Value-Per-Traffic-Source</div>
          {trafficQualityData.length > 0 ? (
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="engagement" 
                    name="Engagement Time" 
                    unit=" mins"
                    domain={[0, 'dataMax + 1']}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="conversion" 
                    name="Conversion Rate" 
                    unit="%" 
                    domain={[0, 'dataMax + 5']}
                  />
                  <ZAxis type="category" dataKey="source" name="Source" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {trafficQualityData.map(entry => (
                    <Scatter 
                      key={entry.source} 
                      name={entry.source} 
                      data={[entry]} 
                      fill={entry.color} 
                      shape="circle"
                      legendType="circle"
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 md:h-64 flex items-center justify-center text-gray-500">
              No traffic source data available
            </div>
          )}
        </div>

        {/* Web3 Users by Medium */}
        <div className="col-span-1">
          <Web3UsersByMedium analytics={analytics} />
        </div>
      </div>
    </div>
  );
};

export default TrafficAnalytics; 
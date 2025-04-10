import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend, Cell } from "recharts";
import FunnelDashboard from "../Offchainpart/FunnelDashboard";
import GeoAnalyticsMap from "../Offchainpart/GeoAnalyticsMap";
export default function OnchainTraffic() {
  // Conversion funnel data
  const [analytics, setanalytics] = useState({});
  const funnelData = [
    { stage: "Unique Visitors", value: 5000 },
    { stage: "Wallet Users", value: 3000 },
    { stage: "Wallets Connected", value: 1500 },
    { stage: "Transaction Recorded", value: 300 }
  ];
  
  // Traffic sources data
  const trafficSourcesData = [
    { source: "Direct", value: 235, color: "#4BC0C0" },
    { source: "Google", value: 410, color: "#FF6384" },
    { source: "Facebook", value: 320, color: "#FFCE56" },
    { source: "Reddit", value: 185, color: "#badc58" },
    { source: "X", value: 110, color: "#36A2EB" },
    { source: "Discord", value: 278, color: "#9966FF" },
  ];
  
  // Traffic quality data
  const trafficQualityData = [
    { source: "Instagram", engagement: 15, ltv: 35, color: "#FF6384" },
    { source: "LinkedIn", engagement: 25, ltv: 25, color: "#36A2EB" },
    { source: "Facebook", engagement: 20, ltv: 37, color: "#FFCE56" },
    { source: "TikTok", engagement: 30, ltv: 10, color: "#4BC0C0" },
    { source: "Pinterest", engagement: 40, ltv: 30, color: "#FF6384" },
    { source: "Google", engagement: 35, ltv: 42, color: "#FF9F40" },
    { source: "Direct", engagement: 45, ltv: 50, color: "#9966FF" },
    { source: "X", engagement: 50, ltv: 38, color: "#C9CBCF" }
  ];
  
  // Traffic sources table data
  const trafficSourcesTableData = [
    { source: "Instagram", visitors: 387, impressions: 452, websConnected: 219, webRegistered: 173, tvl: 298 },
    { source: "LinkedIn", visitors: 276, impressions: 415, websConnected: 304, webRegistered: 182, tvl: 429 },
    { source: "Behance", visitors: 124, impressions: 217, websConnected: 193, webRegistered: 145, tvl: 312 },
    { source: "Dribbble", visitors: 342, impressions: 398, websConnected: 247, webRegistered: 156, tvl: 203 },
    { source: "Pinterest", visitors: 475, impressions: 321, websConnected: 278, webRegistered: 219, tvl: 354 }
  ];
  
  // Time to chain conversion data
  const timeToConversionData = [
    { day: "Day 1", users: 120 },
    { day: "Day 2", users: 220 },
    { day: "Day 3", users: 180 },
    { day: "Day 4", users: 100 },
    { day: "Day 5", users: 90 },
    { day: "Day 6", users: 150 },
    { day: "Day 7", users: 170 }
  ];

  // Creating the legend items for traffic quality analysis
  const CustomLegend = () => {
    return (
      <div className="flex flex-wrap gap-2 text-xs mt-2 justify-center">
        {trafficQualityData.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: item.color }}></div>
            <span>{item.source}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-8">Unified Intensity Analytics</h1>
      
      {/* Main layout with reorganized sections */}
      <div className="space-y-8">
        {/* Funnel Dashboard - Full Width */}
        <div className="bg-white rounded-lg shadow p-6">
          <FunnelDashboard analytics={analytics}/>
        </div>
        
        {/* Traffic Sources by On-Chain USD Volume - Full Width */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Traffic Sources by On-Chain USD Volume</h2>
          <div className="flex-grow w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={trafficSourcesData}
                margin={{ top: 10, right: 30, left: 80, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number"
                  domain={[0, 600]}  
                  ticks={[0, 150, 300, 450, 600]}
                />
                <YAxis 
                  dataKey="source" 
                  type="category" 
                  width={80}
                  tick={{ fontSize: 14 }} 
                />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  barSize={24}
                  radius={[0, 4, 4, 0]}
                >
                  {trafficSourcesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Second row - Analysis charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Traffic Quality Analysis */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col">
            <h2 className="text-lg font-semibold mb-3">Traffic Quality Analysis</h2>
            <p className="text-xs text-gray-500 mb-3">Value Per Traffic Source</p>
            <div className="flex-grow w-full h-full min-h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis 
                    type="number" 
                    dataKey="engagement" 
                    name="Engagement" 
                    unit="mins" 
                    label={{ value: "Engagement (mins)", position: "bottom", offset: 5 }}
                    domain={[0, 55]}
                    ticks={[0, 10, 20, 30, 40, 50]}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="ltv" 
                    name="LTV" 
                    domain={[0, 55]} 
                    ticks={[0, 10, 20, 30, 40, 50]} 
                    label={{ value: "LTV", angle: -90, position: "insideLeft", offset: 0 }}
                  />
                  <ZAxis range={[70, 70]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  {trafficQualityData.map((entry, index) => (
                    <Scatter key={index} name={entry.source} data={[entry]} fill={entry.color} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <CustomLegend />
          </div>
          
          {/* Time to Chain Conversion */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Time to Chain Conversion (Users)</h2>
            <div className="flex-grow w-full h-full min-h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeToConversionData}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 14 }} />
                  <YAxis domain={[0, 250]} ticks={[0, 50, 100, 150, 200, 250]} />
                  <Tooltip />
                  <Bar dataKey="users" fill="#2563EB" barSize={24} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Third row - Table and Map */}
        <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Traffic Sources Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Traffic Sources Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 text-left font-medium">Source</th>
                    <th className="p-3 text-center font-medium">Unique Visitors</th>
                    <th className="p-3 text-center font-medium">Web Users</th>
                    <th className="p-3 text-center font-medium">Wallets Connected</th>
                    <th className="p-3 text-center font-medium">Wallets Registered</th>
                    <th className="p-3 text-center font-medium">TVL</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficSourcesTableData.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{
                          backgroundColor: 
                            row.source === "Instagram" ? "#FF6384" :
                            row.source === "LinkedIn" ? "#36A2EB" :
                            row.source === "Behance" ? "#4BC0C0" :
                            row.source === "Dribbble" ? "#FF9F40" :
                            "#9966FF"
                        }}></div>
                        {row.source}
                      </td>
                      <td className="p-3 text-center">{row.visitors}</td>
                      <td className="p-3 text-center">{row.impressions}</td>
                      <td className="p-3 text-center">{row.websConnected}</td>
                      <td className="p-3 text-center">{row.webRegistered}</td>
                      <td className="p-3 text-center">{row.tvl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* On-chain Transaction by Country */}
         <GeoAnalyticsMap analytics={analytics}/>
        </div>
      </div>
    </div>
  );
}
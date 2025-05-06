import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend, Cell } from "recharts";
import FunnelDashboard2 from "./FunnelDashboard2";
import GeoAnalyticsMap from "../Offchainpart/GeoAnalyticsMap";
import { useContractData } from '../../contexts/ContractDataContext';

export default function OnchainTraffic() {
  // Get contract data from context
  const { 
    selectedContract, 
    contractTransactions, 
    showDemoData, 
    isLoadingTransactions,
    processContractTransactions
  } = useContractData();

  // Process real contract data if available
  const contractData = !showDemoData ? processContractTransactions() : null;

  // State for analytics (keeping this for compatibility)
  const [analytics, setanalytics] = useState({});
  
  // Conversion funnel demo data
  const demoFunnelData = [
    { stage: "Unique Visitors", value: 5000 },
    { stage: "Wallet Users", value: 3000 },
    { stage: "Wallets Connected", value: 1500 },
    { stage: "Wallets Recorded", value: 300 }
  ];
  
  // Traffic sources demo data
  const demoTrafficSourcesData = [
    { source: "Direct", value: 235, color: "#4BC0C0" },
    { source: "Google", value: 410, color: "#FF6384" },
    { source: "Facebook", value: 320, color: "#FFCE56" },
    { source: "Reddit", value: 185, color: "#badc58" },
    { source: "X", value: 110, color: "#36A2EB" },
    { source: "Discord", value: 278, color: "#9966FF" },
  ];
  
  // Traffic quality demo data
  const demoTrafficQualityData = [
    { source: "Instagram", engagement: 15, ltv: 35, color: "#FF6384" },
    { source: "LinkedIn", engagement: 25, ltv: 25, color: "#36A2EB" },
    { source: "Facebook", engagement: 20, ltv: 37, color: "#FFCE56" },
    { source: "TikTok", engagement: 30, ltv: 10, color: "#4BC0C0" },
    { source: "Pinterest", engagement: 40, ltv: 30, color: "#FF6384" },
    { source: "Google", engagement: 35, ltv: 42, color: "#FF9F40" },
    { source: "Direct", engagement: 45, ltv: 50, color: "#9966FF" },
    { source: "X", engagement: 50, ltv: 38, color: "#C9CBCF" }
  ];
  
  // Traffic sources table demo data
  const demoTrafficSourcesTableData = [
    { source: "Instagram", visitors: 387, impressions: 452, websConnected: 219, webRegistered: 173, tvl: 298 },
    { source: "LinkedIn", visitors: 276, impressions: 415, websConnected: 304, webRegistered: 182, tvl: 429 },
    { source: "Behance", visitors: 124, impressions: 217, websConnected: 193, webRegistered: 145, tvl: 312 },
    { source: "Dribbble", visitors: 342, impressions: 398, websConnected: 247, webRegistered: 156, tvl: 203 },
    { source: "Pinterest", visitors: 475, impressions: 321, websConnected: 278, webRegistered: 219, tvl: 354 }
  ];
  
  // Time to chain conversion demo data
  const demoTimeToConversionData = [
    { day: "0-1hr", users: 120 },
    { day: "1-6hr", users: 220 },
    { day: "6-24hr", users: 180 },
    { day: "Day 2", users: 100 },
    { day: "Day 3", users: 90 },
    { day: "Day 4", users: 150 },
    { day: "Day 5", users: 170 }
  ];

  // Choose which data to use based on whether we should show demo data
  const funnelData = showDemoData ? demoFunnelData : (contractData?.funnelData || demoFunnelData);
  const trafficSourcesData = showDemoData ? demoTrafficSourcesData : (contractData?.trafficSourcesData || demoTrafficSourcesData);
  const trafficQualityData = showDemoData ? demoTrafficQualityData : (contractData?.trafficQualityData || demoTrafficQualityData);
  const trafficSourcesTableData = showDemoData ? demoTrafficSourcesTableData : (contractData?.trafficSourcesTableData || demoTrafficSourcesTableData);
  const timeToConversionData = showDemoData ? demoTimeToConversionData : (contractData?.timeToConversionData || demoTimeToConversionData);

  // Creating the legend items for traffic quality analysis
  const CustomLegend = () => {
    return (
      <div className="flex flex-wrap gap-2 text-xs mt-2 justify-center font-poppins">
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
    <div className="bg-gray-50 min-h-screen p-6 font-poppins">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500&display=swap');
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Montserrat', sans-serif;
        }
        
        body, p, div, span, td, th {
          font-family: 'Poppins', sans-serif;
        }
      `}</style>
      
      <h1 className="text-2xl font-bold mb-8 font-montserrat">Unified Intensity Analytics</h1>
      
      {/* Data Source Banner */}
      {showDemoData ? (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 mb-4 rounded">
          <p className="text-sm">
            <span className="font-bold">Using demo data.</span> Select a smart contract from the dropdown to view real data.
          </p>
        </div>
      ) : isLoadingTransactions ? (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 mb-4 rounded">
          <p className="text-sm">
            <span className="font-bold">Loading transaction data...</span> Please wait while we process the data.
          </p>
        </div>
      ) : (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-2 mb-4 rounded">
          <p className="text-sm">
            <span className="font-bold">Using real data for:</span> {selectedContract.name} ({selectedContract.tokenSymbol || 'Unknown'}) 
            on {selectedContract.blockchain}. {contractTransactions.length} transactions loaded.
          </p>
        </div>
      )}
      
      {/* Main layout with reorganized sections */}
      <div className="space-y-8">
        {/* Funnel Dashboard - Full Width */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Conversion Funnel</h2>
          <FunnelDashboard2/>
        </div>
        
        {/* Traffic Sources by On-Chain USD Volume - Full Width */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Traffic Sources by On-Chain USD Volume</h2>
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
                  tick={{ fontSize: 14, fontFamily: 'Poppins' }} 
                />
                <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
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
            <h2 className="text-lg font-semibold mb-3 font-montserrat">Traffic Quality Analysis</h2>
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
                    label={{ value: "Engagement (mins)", position: "bottom", offset: 5, fontFamily: 'Poppins' }}
                    domain={[0, 55]}
                    ticks={[0, 10, 20, 30, 40, 50]}
                    tick={{ fontFamily: 'Poppins' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="ltv" 
                    name="LTV" 
                    domain={[0, 55]} 
                    ticks={[0, 10, 20, 30, 40, 50]} 
                    label={{ value: "LTV  ($ per million)", angle: -90, position: "insideLeft", offset: 0, fontFamily: 'Poppins' }}
                    tick={{ fontFamily: 'Poppins' }}
                  />
                  <ZAxis range={[70, 70]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontFamily: 'Poppins' }} />
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
            <h2 className="text-lg font-semibold mb-4 font-montserrat">Time to Chain Conversion (Users)</h2>
            <div className="flex-grow w-full h-full min-h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeToConversionData}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 14, fontFamily: 'Poppins' }} 
                  />
                  <YAxis 
                    domain={[0, 250]} 
                    ticks={[0, 50, 100, 150, 200, 250]} 
                    tick={{ fontFamily: 'Poppins' }}
                    label={{ value: "Users", angle: -90, position: "insideLeft", offset: -5, fontFamily: 'Poppins' }}
                  />
                  <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
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
            <h2 className="text-lg font-semibold mb-4 font-montserrat">Traffic Sources Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 font-montserrat">
                    <th className="p-3 text-left font-medium">Source</th>
                    <th className="p-3 text-center font-medium">Unique Visitors</th>
                    <th className="p-3 text-center font-medium">Web Users</th>
                    <th className="p-3 text-center font-medium">Wallets Connected</th>
                    <th className="p-3 text-center font-medium">Wallets Registered</th>
                    <th className="p-3 text-center font-medium">TVL</th>
                  </tr>
                </thead>
                <tbody className="font-poppins">
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
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 font-montserrat">On-chain Transaction by Country</h2>
            <GeoAnalyticsMap analytics={analytics}/>
          </div>
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend, Cell } from "recharts";
import FunnelDashboard2 from "./FunnelDashboard2";
import GeoAnalyticsMap from "../Offchainpart/GeoAnalyticsMap";
import { useContractData } from '../../contexts/ContractDataContext';
import ChainBanner from '../../components/ChainBanner';
import { getChainConfig } from '../../utils/chainRegistry';

export default function OnchainTraffic() {
  // Get contract data from context
  const { 
    selectedContract, 
    contractTransactions, 
    showDemoData, 
    isLoadingTransactions,
    updatingTransactions,
    loadingStatus,
    processContractTransactions
  } = useContractData();

  // Process real contract data if available
  const contractData = !showDemoData ? processContractTransactions() : null;

  // State for analytics (keeping this for compatibility)
  const [analytics, setanalytics] = useState({});
  // Track when contract or website selection changes
  const [lastContractId, setLastContractId] = useState(null);
  const [lastWebsiteId, setLastWebsiteId] = useState(null);
  
  // Load or simulate analytics data when contract changes
  useEffect(() => {
    const currentContractId = selectedContract?.id || null;
    const currentWebsiteId = localStorage.getItem('selected_website') || null;
    
    console.log("Contract or website selection changed:", {
      contractChanged: currentContractId !== lastContractId,
      websiteChanged: currentWebsiteId !== lastWebsiteId,
      contractId: currentContractId,
      websiteId: currentWebsiteId
    });
    
    // Update last seen IDs
    setLastContractId(currentContractId);
    setLastWebsiteId(currentWebsiteId);
    
    // Try to get analytics data from localStorage - specifically for the selected website
    let storedAnalytics = null;
    
    const loadAnalyticsData = async () => {
      try {
        // First try to get website-specific analytics from storage by idy
        const websiteId = localStorage.getItem('idy');
        if (websiteId) {
          console.log(`Looking for analytics data for website ID ${websiteId}`);
          
          // Try both formats of storage key
          let websiteAnalytics = localStorage.getItem(`analytics_${websiteId}`);
          if (!websiteAnalytics) {
            // Try the alternative format with website domain
            const websiteDomain = localStorage.getItem('selectedWebsite');
            if (websiteDomain) {
              websiteAnalytics = localStorage.getItem(`analytics_${websiteDomain}`);
            }
          }
          
          if (websiteAnalytics) {
            try {
              storedAnalytics = JSON.parse(websiteAnalytics);
              console.log(`Found analytics data for website ${websiteId}`);
            } catch (parseError) {
              console.error('Error parsing website analytics:', parseError);
            }
          }
        }
        
        // If no website-specific data, try the generic storage
        if (!storedAnalytics) {
          const genericAnalytics = localStorage.getItem('analytics_storage');
          if (genericAnalytics) {
            try {
              storedAnalytics = JSON.parse(genericAnalytics);
              console.log("Using generic analytics data");
            } catch (parseError) {
              console.error('Error parsing generic analytics:', parseError);
            }
          }
        }
        
        // If still no analytics, try to fetch it from off-chain analytics route
        if (!storedAnalytics && websiteId) {
          try {
            // You might need to adjust this based on your actual API structure
            const response = await fetch(`/api/analytics/${websiteId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.analytics) {
                storedAnalytics = data.analytics;
                console.log("Fetched analytics data from API");
              }
            }
          } catch (fetchError) {
            console.error('Error fetching analytics from API:', fetchError);
          }
        }
        
        if (storedAnalytics) {
          console.log("Setting analytics data:", storedAnalytics);
          setanalytics(storedAnalytics);
        } else {
          // No stored analytics, use demo data
          console.log("No real analytics found, using demo data");
          simulateDemoAnalytics();
        }
      } catch (error) {
        console.error('Error loading analytics data:', error);
        // Fall back to demo data if loading fails
        simulateDemoAnalytics();
      }
    };
    
    loadAnalyticsData();
  }, [selectedContract?.id, contractTransactions?.length]);
  
  // Save analytics data to localStorage when it changes
  useEffect(() => {
    // Only save if we have meaningful analytics data
    if (analytics && analytics.uniqueVisitors && analytics.sessions) {
      try {
        // Get the current website ID
        const websiteId = localStorage.getItem('idy');
        if (websiteId) {
          // Save to website-specific storage
          localStorage.setItem(`analytics_${websiteId}`, JSON.stringify(analytics));
          console.log(`Saved analytics data to localStorage for website ${websiteId}`);
        }
        
        // Also save to generic storage
        localStorage.setItem('analytics_storage', JSON.stringify(analytics));
      } catch (error) {
        console.error('Error saving analytics data to localStorage:', error);
      }
    }
  }, [analytics]);
  
  // Function to simulate demo analytics data
  const simulateDemoAnalytics = () => {
    console.log("Generating demo analytics data");
    
    // Create a realistic set of demo analytics data
    const demoAnalytics = {
      uniqueVisitors: 5000,
      sessions: Array(2000).fill().map((_, i) => ({
        userId: `user_${Math.floor(Math.random() * 5000)}`,
        device: `device_${Math.floor(Math.random() * 3000)}`,
        startTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        duration: Math.random() * 600,
        isBounce: Math.random() > 0.7,
        hasWeb3: Math.random() > 0.6,
        walletConnected: Math.random() > 0.7,
        wallet: Math.random() > 0.3 ? {
          walletAddress: Math.random() > 0.6 ? `0x${Array(40).fill().map(() => Math.floor(Math.random() * 16).toString(16)).join('')}` : '',
          walletType: Math.random() > 0.4 ? ['MetaMask', 'Coinbase', 'WalletConnect', 'Trust Wallet'][Math.floor(Math.random() * 4)] : 'Unknown',
          chainName: Math.random() > 0.4 ? ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'BNB Chain'][Math.floor(Math.random() * 5)] : 'Unknown Chain'
        } : null
      })),
      wallets: Array(900).fill().map((_, i) => ({
        walletAddress: `0x${Array(40).fill().map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        walletType: ['MetaMask', 'Coinbase', 'WalletConnect', 'Trust Wallet'][Math.floor(Math.random() * 4)],
        chainName: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'BNB Chain'][Math.floor(Math.random() * 5)]
      }))
    };
    
    // If we have a selected contract, make about 10% of the demo wallet addresses match transactions
    if (contractTransactions && contractTransactions.length > 0 && !showDemoData) {
      console.log("Customizing demo data to match contract transactions");
      
      // Extract real wallet addresses from transactions (up to 200)
      const realWalletAddresses = new Set();
      contractTransactions.slice(0, 1000).forEach(tx => {
        if (tx.from_address) {
          realWalletAddresses.add(tx.from_address.toLowerCase());
        }
      });
      
      const realAddressArray = Array.from(realWalletAddresses);
      
      // Replace about 10% of demo wallet addresses with real ones to show conversion
      if (realAddressArray.length > 0) {
        // Calculate a percentage based on the number of available addresses
        // This ensures we have a meaningful number of matches for the funnel
        const percentage = Math.min(0.1, realAddressArray.length / demoAnalytics.wallets.length);
        const walletCount = Math.floor(demoAnalytics.wallets.length * percentage);
        
        console.log(`Adding ${walletCount} real wallet addresses out of ${realAddressArray.length} available to demo data`);
        
        for (let i = 0; i < walletCount; i++) {
          if (i < demoAnalytics.wallets.length && i < realAddressArray.length) {
            demoAnalytics.wallets[i].walletAddress = realAddressArray[i];
          }
        }
      }
    }
    
    setanalytics(demoAnalytics);
  };
  
  // Get chain-specific information
  const chainName = selectedContract?.blockchain || 'Ethereum';
  const chainConfig = getChainConfig(chainName);
  const chainColor = !showDemoData && contractData?.contractInfo?.chainColor 
    ? contractData.contractInfo.chainColor 
    : (chainConfig?.color || '#627EEA'); // Default to Ethereum blue
  
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
      <ChainBanner 
        showDemoData={showDemoData}
        isLoading={isLoadingTransactions}
        isUpdating={updatingTransactions}
        loadingStatus={loadingStatus}
        contract={selectedContract}
        contractData={contractData}
        transactions={contractTransactions}
      />
      
      {/* Main layout with reorganized sections */}
      <div className="space-y-8">
        {/* Funnel Dashboard - Full Width */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Conversion Funnel</h2>
          <FunnelDashboard2 
            analytics={analytics} 
            contractData={{
              showDemoData,
              contractTransactions,
              contractId: selectedContract?.id,
              contract: selectedContract,
              processedData: contractData,
              chainId: selectedContract?.chainId,
              chainName: selectedContract?.blockchain
            }}
          />
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
                    unit="%" 
                    domain={[0, 60]}
                    tick={{ fontSize: 12, fontFamily: 'Poppins' }}
                    label={{ 
                      value: 'Engagement %', 
                      position: 'insideBottom', 
                      offset: -10,
                      fontFamily: 'Poppins',
                      fontSize: 12
                    }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="ltv" 
                    name="Lifetime Value" 
                    unit="K" 
                    domain={[0, 60]}
                    tick={{ fontSize: 12, fontFamily: 'Poppins' }}
                    label={{ 
                      value: 'Lifetime Value ($K)', 
                      angle: -90, 
                      position: 'insideLeft',
                      fontFamily: 'Poppins',
                      fontSize: 12
                    }}
                  />
                  <ZAxis range={[60, 400]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ fontFamily: 'Poppins' }}
                    formatter={(value, name) => [
                      `${value}${name === 'Engagement' ? '%' : 'K'}`, 
                      name
                    ]}
                  />
                  <Scatter 
                    name="Traffic Sources" 
                    data={trafficQualityData} 
                    fill="#8884d8"
                  >
                    {trafficQualityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <CustomLegend />
          </div>
          
          {/* Time to Conversion */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col">
            <h2 className="text-lg font-semibold mb-3 font-montserrat">Time to Conversion</h2>
            <p className="text-xs text-gray-500 mb-3">From Link Click to Chain Transaction</p>
            <div className="flex-grow w-full h-full min-h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeToConversionData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12, fontFamily: 'Poppins' }}
                    label={{ 
                      value: 'Time to Conversion', 
                      position: 'insideBottom', 
                      offset: -10, 
                      fontFamily: 'Poppins',
                      fontSize: 12
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fontFamily: 'Poppins' }}
                    label={{ 
                      value: 'Number of Users', 
                      angle: -90, 
                      position: 'insideLeft',
                      fontFamily: 'Poppins',
                      fontSize: 12
                    }}
                  />
                  <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
                  <Bar 
                    dataKey="users" 
                    fill={chainColor}
                    name="Users"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Geographic Map (Optional) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Geographic User Distribution</h2>
          <div className="h-96">
            <GeoAnalyticsMap />
          </div>
        </div>
        
        {/* Traffic Sources Table - Full Width */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Traffic Sources Detailed Analysis</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Visitors</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallets Connected</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Web Registered</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TVL (USD)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trafficSourcesTableData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">{item.source}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.visitors}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.impressions}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.websConnected}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.webRegistered}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${item.tvl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend, Cell } from "recharts";
import FunnelDashboard2 from "./FunnelDashboard2";
import GeoOnchainMap from "./GeoOnchainMap";
import CountryDetail from "./CountryDetail";
import { useContractData } from '../../contexts/ContractDataContext';
import ChainBanner from '../../components/ChainBanner';
import { getChainConfig } from '../../utils/chainRegistry';
import sdkApi from '../../utils/sdkApi';

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

  // State for analytics data
  const [analytics, setanalytics] = useState({});
  // Get website ID once on mount
  const [websiteId, setWebsiteId] = useState(() => localStorage.getItem('idy') || null);
  // Track when contract selection changes
  const [lastContractId, setLastContractId] = useState(null);
  // Add loading state
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  
  // Check for website ID changes
  useEffect(() => {
    const currentWebsiteId = localStorage.getItem('idy');
    if (currentWebsiteId !== websiteId) {
      setWebsiteId(currentWebsiteId);
    }
  }, [websiteId]);
  
  // Load analytics data when component mounts or when website/contract selection changes
  useEffect(() => {
    const currentContractId = selectedContract?.id || null;
    
    // Check if contract selection has changed
    const contractChanged = currentContractId !== lastContractId;
    
    // Update last seen contract ID
    setLastContractId(currentContractId);
    
    // Only fetch if we have a website ID
    if (!websiteId) {
      console.log("No website ID found, cannot fetch analytics");
      return;
    }
    
    const fetchAnalyticsData = async () => {
      setIsLoadingAnalytics(true);
      setAnalyticsError(null);
      
      try {
        console.log(`Fetching analytics data for website ID: ${websiteId}`);
        const response = await sdkApi.getAnalytics(websiteId);
        
        if (response.subscriptionError) {
          console.error("Subscription error:", response.message);
          setAnalyticsError(response.message);
          setanalytics({});
        } else if (response && response.analytics) {
          console.log("Successfully fetched analytics data:", {
            uniqueVisitors: response.analytics.uniqueVisitors,
            sessionsCount: response.analytics.sessions?.length,
            walletsCount: response.analytics.wallets?.length
          });
          
          // Store the analytics data in state
          setanalytics(response.analytics);
          
          // Also store in localStorage for future use
          try {
            localStorage.setItem(`analytics_${websiteId}`, JSON.stringify(response.analytics));
            localStorage.setItem('analytics_storage', JSON.stringify(response.analytics));
          } catch (storageError) {
            console.error("Failed to store analytics in localStorage:", storageError);
          }
        } else {
          console.error("Invalid response format:", response);
          setAnalyticsError("Invalid analytics data format");
          simulateDemoAnalytics();
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        setAnalyticsError("Failed to load analytics data");
        simulateDemoAnalytics();
      } finally {
        setIsLoadingAnalytics(false);
      }
    };
    
    // Always fetch data when the component mounts or when the website/contract changes
    fetchAnalyticsData();
    
  }, [websiteId, selectedContract?.id]);
  
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
    { source: "Instagram", visitors: 387, impressions: 452, websConnected: 219, webRegistered: 42, tvl: 1298 },
    { source: "LinkedIn", visitors: 276, impressions: 415, websConnected: 204, webRegistered: 36, tvl: 944 },
    { source: "Discord", visitors: 524, impressions: 617, websConnected: 313, webRegistered: 67, tvl: 2156 },
    { source: "Twitter", visitors: 342, impressions: 398, websConnected: 194, webRegistered: 29, tvl: 865 },
    { source: "Google", visitors: 475, impressions: 521, websConnected: 278, webRegistered: 53, tvl: 1772 }
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

  // Process analytics data to get traffic sources information
  const processTrafficSourcesData = () => {
    if (!analytics || !Array.isArray(analytics.sessions) || analytics.sessions.length === 0) {
      return [];
    }
    
    // Maps to track data by source
    const sourceData = new Map();
    const userFirstSource = {};
    const userWalletMap = {};
    
    // First pass: Determine each user's first source and wallet
    analytics.sessions.forEach(session => {
      if (!session || !session.userId) return;
      
      const userId = String(session.userId);
      
      // Track the first source for each user
      if (!userFirstSource[userId]) {
        let source = 'Direct'; // Default source
        
        // Determine source from UTM data or referrer
        if (session.utmData && session.utmData.source) {
          source = normalizeSource(session.utmData.source);
        } else if (session.referrer) {
          source = normalizeSource(session.referrer);
        }
        
        userFirstSource[userId] = source;
        
        // Initialize source in map if needed
        if (!sourceData.has(source)) {
          sourceData.set(source, {
            source,
            impressions: 0,
            visitors: new Set(),
            web3Users: new Set(),
            walletsConnected: new Set(),
            transactedWallets: new Set(),
            tvl: 0
          });
        }
        
        // Count this user as a visitor for their first source
        sourceData.get(source).visitors.add(userId);
      }
      
      // Track impression for the user's first source
      const source = userFirstSource[userId];
      if (source && sourceData.has(source)) {
        sourceData.get(source).impressions++;
      }
      
      // Track web3 users
      if (session.hasWeb3 || (session.wallet && session.wallet.walletType)) {
        const source = userFirstSource[userId];
        if (source && sourceData.has(source)) {
          sourceData.get(source).web3Users.add(userId);
        }
      }
      
      // Track wallet for this user if available
      if (session.wallet && session.wallet.walletAddress && 
          session.wallet.walletAddress.trim() !== '' && 
          session.wallet.walletAddress.length > 10 &&
          !['No Wallet Detected', 'No Wallet Connected', 'Not Connected', 
            'No Chain Detected', 'Error'].includes(session.wallet.walletAddress)) {
        
        const walletAddress = session.wallet.walletAddress.toLowerCase();
        userWalletMap[userId] = walletAddress;
        
        // Add to wallet connections for the user's first source
        const source = userFirstSource[userId];
        if (source && sourceData.has(source)) {
          sourceData.get(source).walletsConnected.add(userId);
        }
      }
    });
    
    // Extract contract wallet addresses for matching
    const contractWallets = new Set();
    let totalTokenVolume = 0;
    
    if (contractData?.contractTransactions) {
      contractData.contractTransactions.forEach(tx => {
        if (tx.from_address) {
          contractWallets.add(tx.from_address.toLowerCase());
          
          // Calculate token volume if value is available
          if (tx.value_eth) {
            const value = parseFloat(tx.value_eth);
            if (!isNaN(value)) {
              totalTokenVolume += value;
            }
          }
        }
      });
    }
    
    // Match wallets with transactions and calculate TVL
    Object.entries(userWalletMap).forEach(([userId, walletAddress]) => {
      if (contractWallets.has(walletAddress)) {
        const source = userFirstSource[userId];
        if (source && sourceData.has(source)) {
          sourceData.get(source).transactedWallets.add(userId);
          
          // Calculate token volume contribution for this wallet
          let walletVolume = 0;
          
          if (contractData?.contractTransactions) {
            contractData.contractTransactions.forEach(tx => {
              if (tx.from_address && tx.from_address.toLowerCase() === walletAddress && tx.value_eth) {
                const value = parseFloat(tx.value_eth);
                if (!isNaN(value)) {
                  walletVolume += value;
                }
              }
            });
          }
          
          sourceData.get(source).tvl += walletVolume;
        }
      }
    });
    
    // Convert to array format
    return Array.from(sourceData.values()).map(data => ({
      source: data.source,
      impressions: data.impressions,
      visitors: data.visitors.size,
      web3Users: data.web3Users.size,
      walletsConnected: data.walletsConnected.size,
      transactedWallets: data.transactedWallets.size,
      tvl: Math.round(data.tvl * 100) / 100
    })).sort((a, b) => b.visitors - a.visitors);
  };
  
  // Function to normalize source names
  const normalizeSource = (source) => {
    if (!source || typeof source !== 'string' || source.trim() === '') {
      return 'Direct';
    }
    
    const sourceStr = source.trim().toLowerCase();
    
    // Source mapping for common variations
    const sourceMapping = {
      'facebook': 'Facebook',
      'fb': 'Facebook',
      'instagram': 'Instagram',
      'ig': 'Instagram',
      'twitter': 'Twitter',
      'x': 'Twitter',
      'linkedin': 'LinkedIn',
      'google': 'Google',
      'youtube': 'YouTube',
      'reddit': 'Reddit',
      'tiktok': 'TikTok',
      'discord': 'Discord',
      'telegram': 'Telegram',
      'medium': 'Medium',
      'github': 'GitHub'
    };
    
    // Check direct mapping
    if (sourceMapping[sourceStr]) {
      return sourceMapping[sourceStr];
    }
    
    // Extract domain if it's a URL
    try {
      let domain;
      if (sourceStr.includes('://')) {
        domain = new URL(sourceStr).hostname.replace('www.', '');
      } else if (sourceStr.includes('.')) {
        domain = sourceStr.split('/')[0].replace('www.', '');
      } else {
        return sourceStr.charAt(0).toUpperCase() + sourceStr.slice(1);
      }
      
      // Check if domain matches any mapping
      for (const [key, value] of Object.entries(sourceMapping)) {
        if (domain.includes(key)) {
          return value;
        }
      }
      
      // Return capitalized domain
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch (e) {
      return sourceStr.charAt(0).toUpperCase() + sourceStr.slice(1);
    }
  };

  // Choose which data to use based on whether we should show demo data
  const funnelData = showDemoData ? demoFunnelData : (contractData?.funnelData || demoFunnelData);
  const trafficSourcesData = showDemoData ? demoTrafficSourcesData : (contractData?.trafficSourcesData || demoTrafficSourcesData);
  const trafficQualityData = showDemoData ? demoTrafficQualityData : (contractData?.trafficQualityData || demoTrafficQualityData);
  const trafficSourcesTableData = showDemoData ? demoTrafficSourcesTableData : processTrafficSourcesData();
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
          {isLoadingAnalytics ? (
            <div className="flex items-center justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
              <span className="ml-3 text-gray-600">Loading analytics data...</span>
            </div>
          ) : analyticsError ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
              <p className="font-medium">Error loading analytics data</p>
              <p className="text-sm">{analyticsError}</p>
              <p className="text-sm mt-2">Please try selecting a different website or refreshing the page.</p>
            </div>
          ) : (
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
          )}
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
        
        {/* Geographic Map - Full Width */}
        <div className="bg-white rounded-lg shadow p-6">
          
          {/* Map and country details side by side - use flex-col on mobile, flex-row on desktop */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className={`w-full ${selectedCountry ? 'lg:w-3/5' : 'lg:w-full'}`}>
              <GeoOnchainMap 
                analytics={analytics}
                contractData={{
                  showDemoData,
                  contractTransactions,
                  contractId: selectedContract?.id,
                  contract: selectedContract,
                  processedData: contractData
                }}
                selectedCountry={selectedCountry}
                setSelectedCountry={setSelectedCountry}
                hideTopCountries={selectedCountry !== null}
                isLoadingAnalytics={isLoadingAnalytics}
                isLoadingTransactions={isLoadingTransactions || updatingTransactions}
              />
            </div>
            
            {/* Country details section - only shown if a country is selected */}
            <div className={`w-full lg:w-2/5 bg-gray-50 rounded-lg p-4 h-96 overflow-auto ${!selectedCountry ? 'hidden' : ''}`}>
              <CountryDetail 
                countryCode={selectedCountry}
                analytics={analytics}
                contractData={{
                  showDemoData,
                  contractTransactions,
                  contractId: selectedContract?.id,
                  contract: selectedContract,
                  processedData: contractData
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Traffic Sources Table - Full Width */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Traffic Sources</h2>
          <div className="overflow-x-auto">
            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Visitors</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Web3 Users</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallets Connected</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallets Transacted</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TVL ({selectedContract?.tokenSymbol || 'Token'})</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trafficSourcesTableData.length > 0 ? (
                    trafficSourcesTableData.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">{item.source}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.impressions}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.visitors}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.web3Users}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.walletsConnected}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.transactedWallets}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.tvl}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                        {isLoadingAnalytics || isLoadingTransactions ? (
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-700 mr-2"></div>
                            <span>Loading data...</span>
                          </div>
                        ) : (
                          'No traffic sources data available'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
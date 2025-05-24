import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend, Cell } from "recharts";
import FunnelDashboard2 from "./FunnelDashboard2";
import GeoOnchainMap from "./GeoOnchainMap";
import CountryDetail from "./CountryDetail";
import { useContractData } from '../../contexts/ContractDataContext';
import ChainBanner from '../../components/ChainBanner';
import { getChainConfig } from '../../utils/chainRegistry';
import sdkApi from '../../utils/sdkApi';
import { isWeb3User } from '../../utils/analyticsHelpers';

export default function OnchainTraffic({ analytics, isLoadingAnalytics, error }) {
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

  // State for selected country
  const [selectedCountry, setSelectedCountry] = useState(null);
  
  // Get chain-specific information
  const chainName = selectedContract?.blockchain || 'Ethereum';
  const chainConfig = getChainConfig(chainName);
  const chainColor = !showDemoData && contractData?.contractInfo?.chainColor 
    ? contractData.contractInfo.chainColor 
    : (chainConfig?.color || '#627EEA'); // Default to Ethereum blue

  // Get analytics from props
  const analyticsData = analytics;
  
  // Process traffic sources using the analytics data
  const processTrafficSourcesDirectly = () => {
    const data = analyticsData;
    if (!data?.sessions?.length) return [];
    
    console.log(`Processing ${data.sessions.length} sessions directly`);
    
    // Maps to track data by source
    const sourceData = new Map();
    const userFirstSource = {};
    
    // First pass: Count unique users per source
    data.sessions.forEach(session => {
      if (!session?.userId) return;
      
      const userId = String(session.userId);
      
      // Only process first occurrence of each user
      if (!userFirstSource[userId]) {
        let source = 'Direct';
        if (session.utmData?.source) source = normalizeSource(session.utmData.source);
        else if (session.referrer) source = normalizeSource(session.referrer);
        
        userFirstSource[userId] = source;
        
        if (!sourceData.has(source)) {
          sourceData.set(source, {
            source,
            impressions: 0,
            visitors: new Set(),
            web3Users: new Set(),
            walletsConnected: new Set()
          });
        }
        
        sourceData.get(source).visitors.add(userId);
      }
      
      // Track impressions for source
      const source = userFirstSource[userId];
      if (source) sourceData.get(source).impressions++;
      
      // Track web3 users and wallets
      if (source && isWeb3User(session)) {
        sourceData.get(source).web3Users.add(userId);
      }
      
      // Check for wallet connection
      if (source && session.wallet?.walletAddress && 
          session.wallet.walletAddress.length > 10 &&
          !session.wallet.walletAddress.includes('No Wallet')) {
        sourceData.get(source).walletsConnected.add(userId);
      }
    });
    
    // Convert to array and sort
    return Array.from(sourceData.values())
      .map(data => ({
        source: data.source,
        impressions: data.impressions,
        visitors: data.visitors.size,
        web3Users: data.web3Users.size,
        walletsConnected: data.walletsConnected.size,
        transactedWallets: 0, // Will be populated when contract data is available
        tvl: 0
      }))
      .sort((a, b) => b.visitors - a.visitors);
  };
  
  // Always calculate real data if possible
  const realSourcesData = processTrafficSourcesDirectly();
  
  // Choose which data to use based on whether we should show demo data
  const funnelData = showDemoData ? demoFunnelData : (contractData?.funnelData || demoFunnelData);
  const trafficSourcesData = showDemoData ? demoTrafficSourcesData : (contractData?.trafficSourcesData || demoTrafficSourcesData);
  const trafficQualityData = showDemoData ? demoTrafficQualityData : (contractData?.trafficQualityData || demoTrafficQualityData);
  const timeToConversionData = showDemoData ? demoTimeToConversionData : (contractData?.timeToConversionData || demoTimeToConversionData);
  
  // ABSOLUTELY FORCE real data or fall back to demo
  const trafficSourcesTableData = 
    realSourcesData.length > 0
      ? realSourcesData
      : demoTrafficSourcesTableData;

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
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
              <p className="font-medium">Error loading analytics data</p>
              <p className="text-sm">{error}</p>
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
          {isLoadingAnalytics && realSourcesData.length === 0 && (
            <div className="py-3 text-center text-gray-500 text-sm">
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-700 mr-2"></div>
                <span>Loading analytics data...</span>
              </div>
            </div>
          )}
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
                        <td className="px-6 py-4 whitespace-nowrap">{item.transactedWallets || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.tvl || 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                        No traffic sources data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {selectedContract && isLoadingTransactions && (
            <div className="text-center text-xs text-gray-500 mt-3">
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-700 mr-2"></div>
                <span>Updating transaction data...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
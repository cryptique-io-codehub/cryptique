import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Legend, ZAxis } from 'recharts';
import TrafficSourcesComponent from '../TrafficSourcesComponent';
const AttributionJourneySankey = ({analytics}) => {
  // Process analytics data to generate Sankey diagram data
  const processAnalyticsData = () => {
    if (!analytics || !analytics.sessions || analytics.sessions.length === 0) {
      return [];
    }
    
    // Function to normalize domain names
    const normalizeDomain = (domain) => {
      if (!domain) return 'Direct';
      
      // Convert to lowercase
      domain = domain.toLowerCase();
      
      // Remove trailing slashes, www prefix, and common subdomains
      domain = domain.replace(/\/$/, '').replace(/^www\./, '');
      
      // Extract base domain for other cases
      const domainParts = domain.split('.');
      if (domainParts.length >= 2) {
        // For domains like abc.example.com or example.com
        const baseDomain = domainParts[domainParts.length - 2];
        // Capitalize first letter for display
        return baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1);
      }
      
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    };
    
    // First, determine the first source for each user
    const userFirstSources = {};
    const userOutcomes = {};
    
    // Sort sessions by timestamp to determine the first session per user
    const sortedSessions = [...analytics.sessions].sort((a, b) => {
      return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
    });
    
    // Determine the first source and final outcome for each user
    sortedSessions.forEach(session => {
      const userId = session.userId;
      
      // Skip if we already have the first source for this user
      if (!userFirstSources[userId]) {
        // Determine the source (utm source or referrer)
        let source = 'Direct';
        
        if (session.utmData && session.utmData.source && session.utmData.source.trim() !== '') {
          // Normalize UTM source
          source = normalizeDomain(session.utmData.source);
        } else if (session.referrer && session.referrer !== 'direct') {
          // Extract and normalize domain from referrer
          try {
            const url = new URL(session.referrer);
            source = normalizeDomain(url.hostname || url.host || session.referrer);
          } catch (e) {
            source = normalizeDomain(session.referrer);
          }
        }
        
        // Record the first source for this user
        userFirstSources[userId] = source;
      }
      
      // Update user outcome based on wallet connection
      if (session.wallet && session.wallet.walletAddress && session.wallet.walletAddress.trim() !== '') {
        userOutcomes[userId] = 'Wallet Connected';
      } else if (!userOutcomes[userId]) {
        userOutcomes[userId] = 'No Wallet';
      }
    });
    
    // Count users by source and outcome
    const sourceOutcomeCounts = {};
    
    Object.entries(userFirstSources).forEach(([userId, source]) => {
      const outcome = userOutcomes[userId] || 'No Wallet';
      
      if (!sourceOutcomeCounts[source]) {
        sourceOutcomeCounts[source] = {
          'Wallet Connected': 0,
          'No Wallet': 0,
          total: 0
        };
      }
      
      sourceOutcomeCounts[source][outcome]++;
      sourceOutcomeCounts[source].total++;
    });
    
    // Convert to Sankey data format
    const sankeyData = [];
    
    Object.entries(sourceOutcomeCounts).forEach(([source, counts]) => {
      if (counts['Wallet Connected'] > 0) {
        sankeyData.push({
          source,
          target: 'Wallet Connected',
          value: counts['Wallet Connected'],
          total: counts.total
        });
      }
      
      if (counts['No Wallet'] > 0) {
        sankeyData.push({
          source,
          target: 'No Wallet',
          value: counts['No Wallet'],
          total: counts.total
        });
      }
    });
    
    // Sort by total users and take top 5 sources
    return sankeyData
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Show top 5 sources (2 outcomes each = 10 flows)
  };
  
  // Get the Sankey data
  const attributionJourneyData = processAnalyticsData();
  
  // Use fallback data if no real data is available
  const finalData = attributionJourneyData.length > 0 ? attributionJourneyData : [
    { source: 'Direct', target: 'Wallet Connected', value: 3, total: 5 },
    { source: 'Direct', target: 'No Wallet', value: 2, total: 5 },
    { source: 'Google', target: 'Wallet Connected', value: 2, total: 4 },
    { source: 'Google', target: 'No Wallet', value: 2, total: 4 }
  ];
  
  // Calculate total values for scaling
  const totalValue = finalData.reduce((sum, item) => sum + item.value, 0);
  
  // Get unique sources and targets
  const uniqueSources = [...new Set(finalData.map(item => item.source))];
  const uniqueTargets = [...new Set(finalData.map(item => item.target))];
  
  // Define colors
  const sourceColors = {
    'Direct': '#7986cb', // Blue-ish
    'Google': '#9c7df3', // Purple
    'Twitter': '#5d9cf8', // Light Blue
    'Facebook': '#7de2d1', // Teal
    'Instagram': '#db77a2', // Pink
    'Reddit': '#f7b844', // Orange
    'Discord': '#66bb6a', // Green
    'Telegram': '#ef5350', // Red
  };

  // If source doesn't have defined color, use default color scheme
  const defaultColors = ['#9c7df3', '#7de2d1', '#5d9cf8', '#db77a2', '#f7b844', '#66bb6a', '#ef5350', '#7986cb'];
  
  // Define fixed colors for targets
  const targetColors = {
    'Wallet Connected': '#28a745', // Green for success
    'No Wallet': '#dc3545'        // Red for no wallet
  };

  // Calculate percentages for each source
  const sourcePercentages = {};
  uniqueSources.forEach(source => {
    const sourceData = finalData.filter(item => item.source === source);
    const connectedValue = sourceData.find(item => item.target === 'Wallet Connected')?.value || 0;
    const totalValue = sourceData[0].total;
    sourcePercentages[source] = {
      percentage: totalValue > 0 ? (connectedValue / totalValue) * 100 : 0,
      connected: connectedValue,
      total: totalValue
    };
  });

  return (
    <div className="w-full bg-white rounded-lg p-4 font-poppins">
      <div className="flex justify-between mb-6">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
          <span className="font-medium text-sm">Wallet Connected</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
          <span className="font-medium text-sm">No Wallet</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <h3 className="text-base font-semibold mb-4 text-gray-700 font-montserrat">Traffic Sources</h3>
          <div className="space-y-4">
            {uniqueSources.map((source, index) => {
              const sourceData = sourcePercentages[source];
              const color = sourceColors[source] || defaultColors[index % defaultColors.length];
              
              return (
                <div key={source} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{source}</span>
                    <span className="text-sm text-gray-600">{sourceData.total} users</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="h-2.5 rounded-full" 
                      style={{ 
                        width: `${sourceData.percentage}%`, 
                        backgroundColor: color 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-600">
                    <span>{sourceData.connected} connected ({sourceData.percentage.toFixed(1)}%)</span>
                    <span>{sourceData.total - sourceData.connected} no wallet</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-2">
          <h3 className="text-base font-semibold mb-4 text-gray-700 font-montserrat">Attribution Journey</h3>
          <div className="relative h-80">
            <svg width="100%" height="100%" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet">
              {/* Source Nodes */}
              {uniqueSources.map((source, index) => {
                const sourceData = finalData.filter(item => item.source === source);
                const totalSourceValue = sourceData.reduce((sum, item) => sum + item.value, 0);
                const heightScale = 250 / uniqueSources.length;
                const height = Math.max(20, Math.min(40, heightScale * 0.8));
                const y = 20 + index * (heightScale);
                const color = sourceColors[source] || defaultColors[index % defaultColors.length];
                
                return (
                  <g key={`source-${source}`}>
                    <rect 
                      x={50} 
                      y={y} 
                      width={100} 
                      height={height} 
                      fill={color} 
                      rx={4} 
                      ry={4}
                    />
                    <text 
                      x={100} 
                      y={y - 8} 
                      textAnchor="middle" 
                      fontSize="12" 
                      fontWeight="500" 
                      fill="#333"
                    >
                      {source}
                    </text>
                    <text 
                      x={100} 
                      y={y + height + 16} 
                      textAnchor="middle" 
                      fontSize="10" 
                      fill="#666"
                    >
                      {sourceData[0].total} users
                    </text>
                  </g>
                );
              })}
              
              {/* Target Nodes */}
              {uniqueTargets.map((target, index) => {
                const targetData = finalData.filter(item => item.target === target);
                const totalTargetValue = targetData.reduce((sum, item) => sum + item.value, 0);
                const y = index === 0 ? 80 : 180; // Position targets vertically spaced
                const color = targetColors[target];
                const percentage = ((totalTargetValue / totalValue) * 100).toFixed(1);
                
                return (
                  <g key={`target-${target}`}>
                    <rect 
                      x={450} 
                      y={y} 
                      width={100} 
                      height={50} 
                      fill={color} 
                      rx={4} 
                      ry={4}
                    />
                    <text 
                      x={500} 
                      y={y - 10} 
                      textAnchor="middle" 
                      fontSize="12" 
                      fontWeight="500" 
                      fill="#333"
                    >
                      {target}
                    </text>
                    <text 
                      x={500} 
                      y={y + 30} 
                      textAnchor="middle" 
                      fontSize="14" 
                      fontWeight="bold" 
                      fill="#fff"
                    >
                      {totalTargetValue} ({percentage}%)
                    </text>
                  </g>
                );
              })}
              
              {/* Flow Paths */}
              {finalData.map((flow, index) => {
                const sourceIndex = uniqueSources.indexOf(flow.source);
                const targetIndex = uniqueTargets.indexOf(flow.target);
                const heightScale = 250 / uniqueSources.length;
                const sourceY = 20 + sourceIndex * heightScale + (Math.max(20, Math.min(40, heightScale * 0.8)) / 2);
                const targetY = targetIndex === 0 ? 105 : 205; // Center of target nodes
                
                // Calculate opacity based on value
                const opacity = 0.7 + (flow.value / totalValue) * 0.3;
                
                // Determine color based on target
                const flowColor = targetColors[flow.target];
                
                // Calculate curvature
                const distance = 450 - 150; // Distance between right edge of source and left edge of target
                const curvature = distance * 0.5;
                
                // Create bezier curve path
                const path = `
                  M 150 ${sourceY}
                  C ${150 + curvature} ${sourceY}, ${450 - curvature} ${targetY}, ${450} ${targetY}
                `;
                
                // Scale stroke width based on flow value, but keep it reasonable
                const maxStrokeWidth = 20;
                const minStrokeWidth = 2;
                const strokeWidth = Math.max(minStrokeWidth, 
                                     Math.min(maxStrokeWidth, 
                                     (flow.value / Math.max(...finalData.map(d => d.value))) * maxStrokeWidth));
                
                return (
                  <g key={`flow-${index}`}>
                    <path 
                      d={path} 
                      fill="none" 
                      stroke={flowColor} 
                      strokeWidth={strokeWidth} 
                      strokeOpacity={opacity}
                      strokeLinecap="round"
                    />
                    {flow.value > 1 && (
                      <text>
                        <textPath 
                          href={`#flow-path-${index}`}
                          startOffset="50%" 
                          fontSize="10" 
                          fontWeight="500" 
                          fill="#333" 
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {flow.value}
                        </textPath>
                      </text>
                    )}
                    {/* Invisible path for text alignment */}
                    <path 
                      id={`flow-path-${index}`}
                      d={path}
                      fill="none"
                      stroke="none"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};


      

// Helper component for responsive metric cards
const MetricCard = ({ title, value, source }) => (
  <div className="bg-white rounded-lg shadow p-4 flex flex-col text-center">
    <div className="text-base text-gray-500 mb-2 font-montserrat">{title}</div>
    <div className="text-xl font-bold mb-2 font-montserrat">{value}</div>
    <div className="text-sm flex items-center justify-center text-gray-600 font-poppins">
      <span className="font-medium">Best source:</span>
      <span className="ml-1">{source || 'N/A'}</span>
    </div>
  </div>
);


const TrafficAnalytics = ({ analytics, setanalytics, trafficSources, setTrafficSources }) => {
  // State for metrics
  const [metrics, setMetrics] = useState({
    bestSource: 'N/A',
    totalSessions: 0,
    web3Users: 0,
    walletsConnected: 0,
    leastEffectiveSource: 'N/A',
    avgConversion: '0%',
    avgBounceRate: '0%',
    bestSourceByWeb3: 'N/A',
    bestSourceByWallets: 'N/A',
    bestSourceByConversion: 'N/A',
    sourceWithHighestBounce: 'N/A',
  });

  // State for traffic quality data
  const [trafficQualityData, setTrafficQualityData] = useState([]);

  // Function to normalize domain names
  const normalizeDomain = (domain) => {
    if (!domain) return 'Direct';
    
    // Convert to lowercase
    domain = domain.toLowerCase();
    
    // Remove trailing slashes, www prefix, and common subdomains
    domain = domain.replace(/\/$/, '').replace(/^www\./, '');
    
    // Extract base domain for other cases
    const domainParts = domain.split('.');
    if (domainParts.length >= 2) {
      // For domains like abc.example.com or example.com
      const baseDomain = domainParts[domainParts.length - 2];
      // Capitalize first letter for display
      return baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1);
    }
    
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  };

  // Helper function to extract normalized source from session
  const getSourceFromSession = (session) => {
    // Check UTM source first
    if (session.utmData && session.utmData.source && session.utmData.source !== '') {
      return normalizeDomain(session.utmData.source);
    }
    
    // Then check referrer
    if (session.referrer && session.referrer !== 'direct') {
      // Extract domain from referrer URL
      try {
        const url = new URL(session.referrer);
        return normalizeDomain(url.hostname || url.host || session.referrer);
      } catch (e) {
        // If referrer is not a valid URL, normalize as is
        return normalizeDomain(session.referrer);
      }
    }
    
    // Default to direct if no source found
    return 'Direct';
  };

  // Calculate metrics based on analytics data
  useEffect(() => {
    if (!analytics || !analytics.sessions || analytics.sessions.length === 0) return;
    
    // Track user's first source
    const userFirstSource = {};
    
    // Count sessions by source
    const sourceCounts = {};
    const sourceBounceCounts = {};
    const web3UsersBySource = {};
    const walletsBySource = {};
    const uniqueUserIdsBySource = {};
    const sourceDurations = {};
    
    // Sort sessions by timestamp to ensure consistent assignment of first source
    const sortedSessions = [...analytics.sessions].sort((a, b) => 
      new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
    );
    
    // First pass: identify each user's first source
    sortedSessions.forEach(session => {
      if (!session.userId) return;
      
      // Only record the first source for each user
      if (!userFirstSource[session.userId]) {
        userFirstSource[session.userId] = getSourceFromSession(session);
      }
    });
    
    // Second pass: count metrics, but attribute activities to the user's first source only
    sortedSessions.forEach(session => {
      if (!session.userId) return;
      
      // Get the user's first source
      const firstSource = userFirstSource[session.userId];
      if (!firstSource) return;
      
      // Count sessions by first source
      sourceCounts[firstSource] = (sourceCounts[firstSource] || 0) + 1;
      
      // Sum durations by first source
      if (session.duration) {
        sourceDurations[firstSource] = (sourceDurations[firstSource] || 0) + session.duration;
      }
      
      // Count bounces by first source
      if (session.isBounce) {
        sourceBounceCounts[firstSource] = (sourceBounceCounts[firstSource] || 0) + 1;
      }
      
      // Track unique users by first source
      if (!uniqueUserIdsBySource[firstSource]) {
        uniqueUserIdsBySource[firstSource] = new Set();
      }
      uniqueUserIdsBySource[firstSource].add(session.userId);
      
      // Track unique web3 users by first source (wallet type not "No Wallet Detected")
      if (session.wallet && session.wallet.walletType !== 'No Wallet Detected') {
        if (!web3UsersBySource[firstSource]) {
          web3UsersBySource[firstSource] = new Set();
        }
        web3UsersBySource[firstSource].add(session.userId);
      }
      
      // Track unique wallets by first source (wallet address not empty)
      if (session.wallet && session.wallet.walletAddress && session.wallet.walletAddress !== '' && session.wallet.walletAddress !== 'No Wallet Detected') {
        if (!walletsBySource[firstSource]) {
          walletsBySource[firstSource] = new Set();
        }
        walletsBySource[firstSource].add(session.userId);
      }
    });

    // Find the source with the highest number of sessions
    let maxSessionsSource = 'N/A';
    let maxSessionsCount = 0;
    
    Object.entries(sourceCounts).forEach(([source, count]) => {
      if (count > maxSessionsCount) {
        maxSessionsCount = count;
        maxSessionsSource = source;
      }
    });
    
    // Calculate conversion rates and bounce rates for each source
    const conversionRates = {};
    const bounceRates = {};
    
    Object.entries(uniqueUserIdsBySource).forEach(([source, userIds]) => {
      const totalVisitors = userIds.size;
      const web3Users = web3UsersBySource[source] ? web3UsersBySource[source].size : 0;
      const wallets = walletsBySource[source] ? walletsBySource[source].size : 0;
      
      // Calculate conversion rate (wallets connected / number of visitors)
      conversionRates[source] = totalVisitors > 0 ? (wallets / totalVisitors) * 100 : 0;
      
      // Calculate bounce rate (bounces / sessions)
      const sourceBounces = sourceBounceCounts[source] || 0;
      const sourceSessionCount = sourceCounts[source] || 0;
      bounceRates[source] = sourceSessionCount > 0 ? (sourceBounces / sourceSessionCount) * 100 : 0;
    });
    
    // Calculate total unique web3 users and wallets connected across all sources
    const totalWeb3Users = Object.values(web3UsersBySource).reduce((total, users) => total + users.size, 0);
    const totalWallets = Object.values(walletsBySource).reduce((total, users) => total + users.size, 0);
    
    // Find sources with best metrics
    let bestSourceByWeb3 = 'N/A';
    let maxWeb3Count = 0;
    let bestSourceByWallets = 'N/A';
    let maxWalletsCount = 0;
    let bestSourceByConversion = 'N/A';
    let maxConversionRate = 0;
    let leastEffectiveSource = 'N/A';
    let minConversionRate = Infinity;
    let sourceWithHighestBounce = 'N/A';
    let maxBounceRate = 0;
    
    Object.entries(uniqueUserIdsBySource).forEach(([source, userIds]) => {
      // Only consider sources with at least 5 users to avoid statistical outliers
      const totalVisitors = userIds.size;
      if (totalVisitors < 5) return;
      
      const web3Count = web3UsersBySource[source] ? web3UsersBySource[source].size : 0;
      const walletsCount = walletsBySource[source] ? walletsBySource[source].size : 0;
      const conversionRate = conversionRates[source] || 0;
      const bounceRate = bounceRates[source] || 0;
      
      // Update best source by Web3 users
      if (web3Count > maxWeb3Count) {
        maxWeb3Count = web3Count;
        bestSourceByWeb3 = source;
      }
      
      // Update best source by wallets
      if (walletsCount > maxWalletsCount) {
        maxWalletsCount = walletsCount;
        bestSourceByWallets = source;
      }
      
      // Update best source by conversion rate
      if (conversionRate > maxConversionRate) {
        maxConversionRate = conversionRate;
        bestSourceByConversion = source;
      }
      
      // Update least effective source
      if (conversionRate < minConversionRate && totalVisitors >= 10) {
        minConversionRate = conversionRate;
        leastEffectiveSource = source;
      }
      
      // Update source with highest bounce rate
      if (bounceRate > maxBounceRate) {
        maxBounceRate = bounceRate;
        sourceWithHighestBounce = source;
      }
    });
    
    // Calculate average conversion and bounce rates across all sources
    const avgConversionNum = Object.values(conversionRates).length > 0 
      ? Object.values(conversionRates).reduce((sum, rate) => sum + rate, 0) / Object.values(conversionRates).length 
      : 0;
    
    const avgBounceNum = Object.values(bounceRates).length > 0 
      ? Object.values(bounceRates).reduce((sum, rate) => sum + rate, 0) / Object.values(bounceRates).length 
      : 0;
    
    // Update metrics state
    setMetrics({
      bestSource: maxSessionsSource,
      totalSessions: analytics.sessions.length,
      web3Users: totalWeb3Users,
      walletsConnected: totalWallets,
      leastEffectiveSource: leastEffectiveSource,
      avgConversion: `${avgConversionNum.toFixed(1)}%`,
      avgBounceRate: `${avgBounceNum.toFixed(1)}%`,
      bestSourceByWeb3: bestSourceByWeb3,
      bestSourceByWallets: bestSourceByWallets,
      bestSourceByConversion: bestSourceByConversion,
      sourceWithHighestBounce: sourceWithHighestBounce
    });

    // Generate colors for sources
    const colorPalette = [
      '#4caf50', '#2196f3', '#f44336', '#7e57c2', '#03a9f4', 
      '#ff80ab', '#ba68c8', '#0d47a1', '#ff9800', '#9c27b0'
    ];
    
    // Generate traffic quality data for the scatter chart
    const qualityData = Object.keys(uniqueUserIdsBySource).map((source, index) => {
      // Get unique users for this source
      const sourceUniqueUsers = uniqueUserIdsBySource[source] ? uniqueUserIdsBySource[source].size : 0;
      if (sourceUniqueUsers === 0) return null;
      
      // Calculate average engagement time in minutes
      const totalDuration = sourceDurations[source] || 0;
      const sessionCount = sourceCounts[source] || 0;
      const engagement = sessionCount > 0 
        ? (totalDuration / sessionCount) / 60  // Convert seconds to minutes
        : 0;
      
      // Calculate conversion rate (wallets connected / unique visitors)
      const web3Users = web3UsersBySource[source] ? web3UsersBySource[source].size : 0;
      const wallets = walletsBySource[source] ? walletsBySource[source].size : 0;
      const conversion = sourceUniqueUsers > 0 ? (wallets / sourceUniqueUsers) * 100 : 0;
      
      // Calculate bounce rate (100 - (wallets / web3 users))
      const bounceRate = web3Users > 0 ? 100 - ((wallets / web3Users) * 100) : 100;
      
      return {
        source,
        engagement: parseFloat(engagement.toFixed(2)),
        conversion: parseFloat(conversion.toFixed(2)),
        bounceRate: parseFloat(bounceRate.toFixed(2)),
        uniqueUsers: sourceUniqueUsers,
        web3Users,
        wallets,
        color: colorPalette[index % colorPalette.length]
      };
    }).filter(item => item !== null); // Remove null entries
    
    setTrafficQualityData(qualityData);
  }, [analytics]);

  // Helper function to format numbers (K, M)
  const formatNumber = (num) => {
    return num >= 1000000 
      ? `${(num / 1000000).toFixed(1)}M` 
      : num >= 1000 
        ? `${(num / 1000).toFixed(1)}K` 
        : num;
  };

  // Process Web3 Users by Medium data
  const processWeb3UsersByMedium = () => {
    // Always return some data, either real or sample
    const sampleData = [
      { time: '00:00', 'Paid/Ads': 35, 'Organic': 20, 'Social': 115, 'KOL & Partnerships': 145, 'Events': 150, 'Others': 120 },
      { time: '04:00', 'Paid/Ads': 50, 'Organic': 28, 'Social': 50, 'KOL & Partnerships': 120, 'Events': 80, 'Others': 155 },
      { time: '08:00', 'Paid/Ads': 25, 'Organic': 35, 'Social': 165, 'KOL & Partnerships': 100, 'Events': 120, 'Others': 45 },
      { time: '12:00', 'Paid/Ads': 40, 'Organic': 20, 'Social': 100, 'KOL & Partnerships': 130, 'Events': 110, 'Others': 30 },
      { time: '16:00', 'Paid/Ads': 55, 'Organic': 12, 'Social': 50, 'KOL & Partnerships': 145, 'Events': 90, 'Others': 125 },
      { time: '20:00', 'Paid/Ads': 65, 'Organic': 55, 'Social': 75, 'KOL & Partnerships': 55, 'Events': 45, 'Others': 80 },
      { time: '23:59', 'Paid/Ads': 35, 'Organic': 62, 'Social': 120, 'KOL & Partnerships': 130, 'Events': 135, 'Others': 125 }
    ];

    if (!analytics || !analytics.sessions || analytics.sessions.length === 0) {
      return sampleData;
    }

    // Group sessions by time and medium
    const timeGroups = {};
    const mediumCategories = {
      'Paid/Ads': ['google', 'facebook', 'twitter', 'linkedin', 'ad', 'sponsored'],
      'Organic': ['organic', 'search', 'google', 'bing', 'yahoo'],
      'Social': ['facebook', 'twitter', 'instagram', 'linkedin', 'reddit', 'social'],
      'KOL & Partnerships': ['partner', 'kol', 'influencer', 'affiliate'],
      'Events': ['event', 'conference', 'meetup', 'hackathon'],
      'Others': [] // Default category
    };

    // Process each session
    analytics.sessions.forEach(session => {
      if (!session.userId || !session.timestamp) return;

      // Get the time group (hour)
      const date = new Date(session.timestamp);
      const hour = date.getHours();
      const timeKey = `${hour.toString().padStart(2, '0')}:00`;

      // Initialize time group if not exists
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = {
          'Paid/Ads': new Set(),
          'Organic': new Set(),
          'Social': new Set(),
          'KOL & Partnerships': new Set(),
          'Events': new Set(),
          'Others': new Set()
        };
      }

      // Determine the medium
      let medium = 'Others';
      const source = session.utmData?.source?.toLowerCase() || 
                    session.referrer?.toLowerCase() || 
                    'direct';

      // Check if user has a wallet
      const hasWallet = session.wallet && 
                       session.wallet.walletAddress && 
                       session.wallet.walletAddress.trim() !== '';

      if (!hasWallet) return;

      // Categorize the source
      for (const [category, keywords] of Object.entries(mediumCategories)) {
        if (keywords.some(keyword => source.includes(keyword))) {
          medium = category;
          break;
        }
      }

      // Add user to the appropriate medium group
      timeGroups[timeKey][medium].add(session.userId);
    });

    // Convert to chart data format
    const chartData = Object.entries(timeGroups).map(([time, mediums]) => {
      const dataPoint = { time };
      Object.entries(mediums).forEach(([medium, users]) => {
        dataPoint[medium] = users.size;
      });
      return dataPoint;
    });

    // Sort by time
    const sortedData = chartData.sort((a, b) => a.time.localeCompare(b.time));
    
    // If we have no real data points, return sample data
    return sortedData.length > 0 ? sortedData : sampleData;
  };

  // Get the Web3 Users by Medium data
  const web3UsersByTimeData = processWeb3UsersByMedium();
  const isSampleData = !analytics || !analytics.sessions || analytics.sessions.length === 0;

  // Colors for the Web3 Users chart
  const webUsersColors = {
    'Paid/Ads': '#4285F4',    // Google Blue
    'Organic': '#EA4335',      // Google Red
    'Social': '#FBBC05',       // Google Yellow
    'KOL & Partnerships': '#34A853', // Google Green
    'Events': '#0F9D58',      // Darker Green
    'Others': '#00BCD4'       // Cyan
  };

  // Custom tooltip for the Web3 Users chart
  const Web3UsersTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + entry.value, 0);
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded text-sm md:text-base">
          <p className="font-bold mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="py-1 font-medium" style={{ color: entry.color }}>
              {entry.name}: {entry.value} ({((entry.value / total) * 100).toFixed(1)}%)
            </p>
          ))}
          <p className="font-bold mt-2 pt-1 border-t border-gray-100">Total: {total}</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for the scatter plot
  const TrafficQualityTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded text-sm md:text-base">
          <p className="font-bold mb-2">{data.source}</p>
          <div className="space-y-1">
            <p className="font-medium">Engagement: <span className="font-semibold">{data.engagement} mins</span></p>
            <p className="font-medium">Conversion: <span className="font-semibold">{data.conversion}%</span></p>
            <p className="font-medium">Bounce Rate: <span className="font-semibold">{data.bounceRate}%</span></p>
            <p className="font-medium">Unique Users: <span className="font-semibold">{data.uniqueUsers}</span></p>
            <p className="font-medium">Web3 Users: <span className="font-semibold">{data.web3Users}</span></p>
            <p className="font-medium">Wallets: <span className="font-semibold">{data.wallets}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 max-w-full overflow-hidden">
      {/* Page Title */}
      <h1 className="text-xl font-bold mb-6 font-montserrat">Traffic Analytics</h1>
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        <MetricCard title="Total Sessions" value={formatNumber(metrics.totalSessions)} source={metrics.bestSource} />
        <MetricCard title="Web3 Users" value={formatNumber(metrics.web3Users)} source={metrics.bestSourceByWeb3} />
        <MetricCard title="Wallets Connected" value={formatNumber(metrics.walletsConnected)} source={metrics.bestSourceByWallets} />
        <MetricCard title="Least effective source" value={metrics.leastEffectiveSource} source={`${metrics.leastEffectiveSource}`} />
        <MetricCard title="Best Conversion" value={metrics.avgConversion} source={metrics.bestSourceByConversion} />
        <MetricCard title="Avg Bounce Rate" value={metrics.avgBounceRate} source={metrics.sourceWithHighestBounce} />
      </div>

      {/* Attribution Journey Sankey - Full Width */}
      <div className="w-full bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 font-montserrat">Attribution Journey</h3>
        <AttributionJourneySankey analytics={analytics} setanalytics={setanalytics} />
      </div>

      {/* Web3 Users by Medium (60%) + Traffic Sources (40%) - In one line */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Web3 Users by Medium - 60% width on md screens and up */}
        <div className="w-full md:w-3/5 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 font-montserrat">Web3 Users by Medium</h3>
          <div className="text-center text-sm text-gray-600 mb-2 font-poppins">
            {isSampleData ? (
              <span className="text-yellow-600">Sample Data - No real data available yet</span>
            ) : (
              "Distribution of Web3 Users Across Traffic Sources"
            )}
          </div>
          {/* Increased height by 30% */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={web3UsersByTimeData} 
                margin={{ top: 10, right: 5, bottom: 20, left: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={[0, 'dataMax + 5']} 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<Web3UsersTooltip />} />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="top" 
                  align="center" 
                  wrapperStyle={{ paddingBottom: '5px', fontSize: '0.7rem' }}
                  iconSize={8}
                />
                {Object.keys(webUsersColors).map((key) => (
                  <Line 
                    type="monotone" 
                    dataKey={key} 
                    stroke={webUsersColors[key]} 
                    key={key}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name={key}
                    strokeDasharray={isSampleData ? "5 5" : "0"}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Traffic Sources - 40% width on md screens and up */}
        {/* Adding a fixed height that matches the Web3 Users card */}
        <div className="w-full md:w-2/5">
          <TrafficSourcesComponent 
            analytics={analytics}
            setanalytics={setanalytics}
            trafficSources={trafficSources} 
            setTrafficSources={setTrafficSources} 
          />
        </div>
      </div>

      {/* Traffic Quality Analysis - Full Width */}
      <div className="w-full bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 font-montserrat">Traffic Quality Analysis</h3>
        <div className="text-center text-sm text-gray-600 mb-2 font-poppins">
          Value-Per-Traffic-Source (Engagement vs Conversion)
        </div>
        {trafficQualityData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 10, right: 10, bottom: 30, left: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="engagement" 
                  name="Engagement" 
                  label={{ 
                    value: 'Avg. Engagement (mins)', 
                    position: 'bottom',
                    offset: 0,
                    style: { fontSize: '0.75rem', fontFamily: "'Poppins', sans-serif" }
                  }}
                  domain={[0, 'dataMax + 5']}
                  tickCount={6}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="conversion" 
                  name="Conversion" 
                  label={{ 
                    value: 'Conversion Rate (%)', 
                    angle: -90, 
                    position: 'left',
                    style: { fontSize: '0.75rem', fontFamily: "'Poppins', sans-serif" }
                  }}
                  domain={[0, 'dataMax + 5']}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<TrafficQualityTooltip />} />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="top" 
                  align="center"
                  wrapperStyle={{ paddingBottom: '5px', fontSize: '0.7rem' }}
                />
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
          <div className="h-64 flex items-center justify-center text-gray-500 font-poppins">
            No traffic source data available
          </div>
        )}
      </div>
    </div>
  );
};
export default TrafficAnalytics;
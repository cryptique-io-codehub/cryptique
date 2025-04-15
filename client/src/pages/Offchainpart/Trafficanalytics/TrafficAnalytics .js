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
    { source: 'Direct', target: 'Wallet Connected', value: 1, total: 1 },
    { source: 'Direct', target: 'No Wallet', value: 1, total: 1 }
  ];
  
  // Calculate total values for scaling
  const totalValue = finalData.reduce((sum, item) => sum + item.value, 0);
  
  // Get unique sources and targets
  const uniqueSources = [...new Set(finalData.map(item => item.source))];
  const uniqueTargets = [...new Set(finalData.map(item => item.target))];
  
  // Calculate vertical spacing for nodes
  const verticalSpacing = 700 / (uniqueSources.length + 1);
  const targetVerticalSpacing = 700 / (uniqueTargets.length + 1);
  
  // Define fixed colors for targets
  const targetColors = {
    'Wallet Connected': '#28a745', // Green for success
    'No Wallet': '#dc3545'        // Red for no wallet
  };
  
  // Define node positions and dimensions dynamically
  const nodes = {};
  
  // Position source nodes
  uniqueSources.forEach((source, index) => {
    const sourceData = finalData.filter(item => item.source === source);
    const totalSourceValue = sourceData.reduce((sum, item) => sum + item.value, 0);
    const totalVisitors = sourceData[0].total; // All entries for this source have the same total
    const heightRatio = totalSourceValue / totalValue;
    
    nodes[source] = {
      x: 0,
      y: (index + 1) * verticalSpacing - (heightRatio * 100),
      height: Math.max(80, heightRatio * 300),
      color: getColorForIndex(index),
      totalVisitors: totalVisitors
    };
  });
  
  // Position target nodes
  uniqueTargets.forEach((target, index) => {
    const targetData = finalData.filter(item => item.target === target);
    const totalTargetValue = targetData.reduce((sum, item) => sum + item.value, 0);
    const heightRatio = totalTargetValue / totalValue;
    
    nodes[target] = {
      x: 720,
      y: (index + 1) * targetVerticalSpacing - (heightRatio * 100),
      height: Math.max(80, heightRatio * 300),
      color: targetColors[target] || getColorForIndex(index + uniqueSources.length)
    };
  });
  
  // Helper function to generate colors
  function getColorForIndex(index) {
    const colors = [
      '#9c7df3', '#7de2d1', '#5d9cf8', '#db77a2', 
      '#f7b844', '#66bb6a', '#ef5350', '#7986cb'
    ];
    return colors[index % colors.length];
  }
  
  // Create source groups for proper flow ordering
  const sourceGroups = {};
  finalData.forEach(d => {
    if (!sourceGroups[d.source]) {
      sourceGroups[d.source] = { total: 0, flows: [] };
    }
    sourceGroups[d.source].flows.push(d);
    sourceGroups[d.source].total += d.value;
  });

  // Create target groups for proper flow ordering
  const targetGroups = {};
  finalData.forEach(d => {
    if (!targetGroups[d.target]) {
      targetGroups[d.target] = { total: 0, flows: [] };
    }
    targetGroups[d.target].flows.push(d);
    targetGroups[d.target].total += d.value;
  });

  // Calculate vertical offsets for each flow
  Object.keys(sourceGroups).forEach(source => {
    let currentOffset = 0;
    sourceGroups[source].flows.forEach(flow => {
      flow.sourceY = nodes[source].y + currentOffset;
      flow.sourceHeight = (flow.value / sourceGroups[source].total) * nodes[source].height;
      currentOffset += flow.sourceHeight;
    });
  });

  Object.keys(targetGroups).forEach(target => {
    let currentOffset = 0;
    targetGroups[target].flows.forEach(flow => {
      flow.targetY = nodes[target].y + currentOffset;
      flow.targetHeight = (flow.value / targetGroups[target].total) * nodes[target].height;
      currentOffset += flow.targetHeight;
    });
  });

  // Generate SVG paths for each flow
  const createSankeyPath = (flow) => {
    const sourceX = nodes[flow.source].x + 100; // Extra wide nodes
    const sourceY = flow.sourceY;
    const sourceHeight = flow.sourceHeight;
    
    const targetX = nodes[flow.target].x;
    const targetY = flow.targetY;
    const targetHeight = flow.targetHeight;
    
    // Control point distance (1/3 of the total distance)
    const cpDistance = (targetX - sourceX) / 3;
    
    // Start and end points
    const startTop = { x: sourceX, y: sourceY };
    const startBottom = { x: sourceX, y: sourceY + sourceHeight };
    
    const endTop = { x: targetX, y: targetY };
    const endBottom = { x: targetX, y: targetY + targetHeight };
    
    // Control points
    const cp1Top = { x: startTop.x + cpDistance, y: startTop.y };
    const cp2Top = { x: endTop.x - cpDistance, y: endTop.y };
    
    const cp1Bottom = { x: startBottom.x + cpDistance, y: startBottom.y };
    const cp2Bottom = { x: endBottom.x - cpDistance, y: endBottom.y };
    
    // Generate path
    return `
      M ${startTop.x} ${startTop.y}
      C ${cp1Top.x} ${cp1Top.y}, ${cp2Top.x} ${cp2Top.y}, ${endTop.x} ${endTop.y}
      L ${endBottom.x} ${endBottom.y}
      C ${cp2Bottom.x} ${cp2Bottom.y}, ${cp1Bottom.x} ${cp1Bottom.y}, ${startBottom.x} ${startBottom.y}
      Z
    `;
  };
  
  // Color blending logic for flows
  const getFlowColor = (source, target) => {
    if (target === 'Wallet Connected') {
      return '#28a745'; // Green for wallet connect flows
    } else if (target === 'No Wallet') {
      return '#dc3545'; // Red for no wallet flows
    } else {
      // Blend colors for other flows
      const sourceColor = nodes[source].color;
      const targetColor = nodes[target].color;
      
      // Simple linear interpolation of colors
      const r1 = parseInt(sourceColor.substring(1, 3), 16);
      const g1 = parseInt(sourceColor.substring(3, 5), 16);
      const b1 = parseInt(sourceColor.substring(5, 7), 16);
      
      const r2 = parseInt(targetColor.substring(1, 3), 16);
      const g2 = parseInt(targetColor.substring(3, 5), 16);
      const b2 = parseInt(targetColor.substring(5, 7), 16);
      
      const r = Math.round(r1 * 0.3 + r2 * 0.7);
      const g = Math.round(g1 * 0.3 + g2 * 0.7);
      const b = Math.round(b1 * 0.3 + b2 * 0.7);
      
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Calculate opacity based on value relative to total
  const calculateOpacity = (value) => {
    return 0.75 + (value / totalValue) * 0.25; // Increased base opacity for more prominence
  };

  return (
    <div className="bg-white rounded-lg w-full">
      <h3 className="text-lg md:text-xl font-bold px-4 pt-4 pb-2">Top 5 First-Source Attribution Journey</h3>
      <div className="w-full">
        {/* Make SVG responsive with proper aspect ratio */}
        <div className="w-full aspect-[4/3] md:aspect-[16/9] relative overflow-hidden">
          <svg width="100%" height="100%" viewBox="0 0 800 750" preserveAspectRatio="xMidYMid meet">
            {/* Background highlight for sources */}
            {Object.entries(nodes).filter(([name]) => uniqueSources.includes(name)).map(([name, node]) => (
              <rect
                key={`highlight-${name}`}
                x={node.x - 10}
                y={node.y - 10}
                width="120"
                height={node.height + 20}
                fill="#f8f9fa"
                rx="12"
                ry="12"
              />
            ))}
            
            {/* Background highlight for targets */}
            {Object.entries(nodes).filter(([name]) => uniqueTargets.includes(name)).map(([name, node]) => (
              <rect
                key={`highlight-${name}`}
                x={node.x - 10}
                y={node.y - 10}
                width="110"
                height={node.height + 20}
                fill="#f8f9fa"
                rx="12"
                ry="12"
              />
            ))}
            
            {/* Flow paths with target-colored flows */}
            {finalData.map((flow, index) => (
              <path
                key={`flow-${index}`}
                d={createSankeyPath(flow)}
                fill={getFlowColor(flow.source, flow.target)}
                opacity={calculateOpacity(flow.value)}
                stroke="white"
                strokeWidth="2"
              />
            ))}
            
            {/* Node rectangles - wider and more prominent */}
            {Object.entries(nodes).map(([name, node]) => (
              <rect
                key={`node-${name}`}
                x={node.x}
                y={node.y}
                width="100"
                height={node.height}
                fill={node.color}
                rx="8"
                ry="8"
                stroke="#ffffff"
                strokeWidth="2"
              />
            ))}
            
            {/* Node labels with enhanced visibility */}
            {Object.entries(nodes).map(([name, node]) => {
              // Check if it's a source or target node
              const isSource = uniqueSources.includes(name);
              const textX = node.x + (isSource ? 50 : 50);
              const textAnchor = "middle";
              
              return (
                <g key={`label-group-${name}`}>
                  <text
                    key={`label-${name}`}
                    x={textX}
                    y={node.y + node.height/2}
                    textAnchor={textAnchor}
                    alignmentBaseline="middle"
                    className="text-sm md:text-base font-bold"
                    style={{ 
                      fill: "#ffffff",
                      filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.5))"
                    }}
                  >
                    {name}
                  </text>
                  
                  {/* Show total visitors count for source nodes */}
                  {isSource && (
                    <text
                      key={`visitors-${name}`}
                      x={textX}
                      y={node.y + node.height/2 + 20}
                      textAnchor={textAnchor}
                      alignmentBaseline="middle"
                      className="text-xs md:text-sm"
                      style={{ 
                        fill: "#ffffff",
                        filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.5))"
                      }}
                    >
                      ({node.totalVisitors} visitors)
                    </text>
                  )}
                </g>
              );
            })}
            
            {/* Value labels on paths with better visibility */}
            {finalData.map((flow, index) => {
              const centerX = (nodes[flow.source].x + 100 + nodes[flow.target].x) / 2;
              const centerY = (flow.sourceY + flow.sourceHeight/2 + flow.targetY + flow.targetHeight/2) / 2;
              
              return (
                <text
                  key={`value-${index}`}
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className="text-xs md:text-sm font-bold"
                  style={{ 
                    fill: "#ffffff",
                    filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.5))"
                  }}
                >
                  {flow.value}
                </text>
              );
            })}
            
            {/* Legend */}
            <g transform="translate(20, 20)">
              <rect x="0" y="0" width="15" height="15" fill="#28a745" />
              <text x="20" y="12" className="text-xs" style={{ fill: "#333333" }}>Wallet Connected</text>
              
              <rect x="0" y="25" width="15" height="15" fill="#dc3545" />
              <text x="20" y="37" className="text-xs" style={{ fill: "#333333" }}>No Wallet</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};


      

// Helper component for responsive metric cards
const MetricCard = ({ title, value, source }) => (
  <div className="bg-white rounded-lg shadow p-2 md:p-4 flex flex-col">
    <div className="text-xs md:text-sm text-gray-500 mb-1">{title}</div>
    <div className="text-lg md:text-xl font-bold mb-1 md:mb-2">{value}</div>
    <div className="text-xs flex items-center text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
      <span>Best source: </span>
      <span className="flex items-center ml-1">{source}</span>
    </div>
  </div>
);


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
    bestSourceByConversion: '',
    sourceWithHighestBounce: '',
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
      if (session.wallet && session.wallet.walletAddress && session.wallet.walletAddress !== '') {
        if (!walletsBySource[firstSource]) {
          walletsBySource[firstSource] = new Set();
        }
        walletsBySource[firstSource].add(session.userId);
      }
    });

    // Find the source with the highest number of sessions
    let maxSessionsSource = '';
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
      
      // Calculate bounce rate (100 - (wallets connected / web3 users))
      bounceRates[source] = web3Users > 0 ? 100 - ((wallets / web3Users) * 100) : 100;
    });
    
    // Find the source with the lowest conversion rate (least effective)
    let lowestConversionSource = '';
    let lowestConversionRate = 100;
    let lowestConversionVisitors = 0;
    
    Object.entries(conversionRates).forEach(([source, rate]) => {
      const visitors = uniqueUserIdsBySource[source] ? uniqueUserIdsBySource[source].size : 0;
      if (rate < lowestConversionRate || (rate === lowestConversionRate && visitors > lowestConversionVisitors)) {
        lowestConversionRate = rate;
        lowestConversionSource = source;
        lowestConversionVisitors = visitors;
      }
    });
    
    // Find the source with the best conversion rate
    let bestConversionSource = '';
    let bestConversionRate = 0;
    
    Object.entries(conversionRates).forEach(([source, rate]) => {
      if (rate > bestConversionRate) {
        bestConversionRate = rate;
        bestConversionSource = source;
      }
    });
    
    // Find the source with the highest bounce rate
    let highestBounceSource = '';
    let highestBounceRate = 0;
    
    Object.entries(bounceRates).forEach(([source, rate]) => {
      if (rate > highestBounceRate) {
        highestBounceRate = rate;
        highestBounceSource = source;
      }
    });
    
    // Find the source with the highest number of unique web3 users
    let maxWeb3Source = '';
    let maxWeb3Count = 0;
    
    Object.entries(web3UsersBySource).forEach(([source, users]) => {
      const uniqueWeb3Users = users.size;
      if (uniqueWeb3Users > maxWeb3Count) {
        maxWeb3Count = uniqueWeb3Users;
        maxWeb3Source = source;
      }
    });
    
    // Find the source with the most unique wallet connections
    let maxWalletSource = '';
    let maxWalletCount = 0;
    
    Object.entries(walletsBySource).forEach(([source, wallets]) => {
      const uniqueWallets = wallets.size;
      if (uniqueWallets > maxWalletCount) {
        maxWalletCount = uniqueWallets;
        maxWalletSource = source;
      }
    });
    
    // Set default values if no sources found
    if (maxSessionsSource === '') {
      maxSessionsSource = 'Direct';
    }
    if (bestConversionSource === '') {
      bestConversionSource = 'Direct';
    }
    if (lowestConversionSource === '') {
      lowestConversionSource = 'Direct';
    }
    if (maxWeb3Source === '') {
      maxWeb3Source = 'Direct';
    }
    if (maxWalletSource === '') {
      maxWalletSource = 'Direct';
    }
    if (highestBounceSource === '') {
      highestBounceSource = 'Direct';
    }
    
    // Get metrics for the best source by sessions
    const totalSessions = sourceCounts[maxSessionsSource] || 0;
    const uniqueUsers = uniqueUserIdsBySource[maxSessionsSource] ? uniqueUserIdsBySource[maxSessionsSource].size : 0;
    
    setMetrics({
      bestSource: maxSessionsSource,
      totalSessions,
      web3Users: maxWeb3Count,
      walletsConnected: maxWalletCount,
      leastEffectiveSource: lowestConversionSource,
      avgConversion: `${bestConversionRate.toFixed(2)}%`,
      avgBounceRate: `${highestBounceRate.toFixed(2)}%`,
      bestSourceByWeb3: maxWeb3Source,
      bestSourceByWallets: maxWalletSource,
      bestSourceByConversion: bestConversionSource,
      sourceWithHighestBounce: highestBounceSource
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
    if (!analytics || !analytics.sessions || analytics.sessions.length === 0) {
      return [];
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
    return chartData.sort((a, b) => a.time.localeCompare(b.time));
  };

  // Get the Web3 Users by Medium data
  const web3UsersByTimeData = processWeb3UsersByMedium();

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
        <div className="bg-white p-2 border border-gray-200 shadow-md rounded text-xs md:text-sm">
          <p className="font-semibold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value} ({((entry.value / total) * 100).toFixed(1)}%)
            </p>
          ))}
          <p className="font-semibold mt-1">Total: {total}</p>
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
        <div className="bg-white p-2 border border-gray-200 shadow-md rounded text-xs md:text-sm">
          <p className="font-semibold">{data.source}</p>
          <p>Engagement: {data.engagement} mins</p>
          <p>Conversion: {data.conversion}%</p>
          <p>Bounce Rate: {data.bounceRate}%</p>
          <p>Unique Users: {data.uniqueUsers}</p>
          <p>Web3 Users: {data.web3Users}</p>
          <p>Wallets: {data.wallets}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-2 md:p-4 max-w-full overflow-hidden">
      {/* Page Title */}
      <h1 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">TrafficAnalytics</h1>
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
        <MetricCard title="Total Sessions" value={formatNumber(metrics.totalSessions)} source={metrics.bestSource} />
        <MetricCard title="Web3 Users" value={formatNumber(metrics.web3Users)} source={metrics.bestSourceByWeb3} />
        <MetricCard title="Wallets Connected" value={formatNumber(metrics.walletsConnected)} source={metrics.bestSourceByWallets} />
        <MetricCard title="Least effective source" value={metrics.leastEffectiveSource} source={`${metrics.leastEffectiveSource}`} />
        <MetricCard title="Best Conversion" value={metrics.avgConversion} source={metrics.bestSourceByConversion} />
        <MetricCard title="Avg Bounce Rate" value={metrics.avgBounceRate} source={metrics.sourceWithHighestBounce} />
      </div>

      {/* Attribution Journey + Traffic Sources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 md:mb-6">
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

      {/* Traffic Quality Analysis */}
      <div className="bg-white rounded-lg shadow p-2 md:p-4">
        <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4">Traffic Quality Analysis</h3>
        <div className="text-center text-xs md:text-sm text-gray-600 mb-1 md:mb-2">
          Value-Per-Traffic-Source (Engagement vs Conversion)
        </div>
        {trafficQualityData.length > 0 ? (
          <div className="h-48 md:h-64">
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
                    style: { fontSize: '0.75rem' }
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
                    style: { fontSize: '0.75rem' }
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
          <div className="h-48 md:h-64 flex items-center justify-center text-gray-500">
            No traffic source data available
          </div>
        )}
      </div>

      {/* Web3 Users by Medium */}
      <div className="bg-white rounded-lg shadow p-2 md:p-4">
        <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4">Web3 Users by Medium</h3>
        <div className="text-center text-xs md:text-sm text-gray-600 mb-1 md:mb-2">
          Distribution of Web3 Users Across Traffic Sources
        </div>
        <div className="h-48 md:h-64">
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
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TrafficAnalytics;
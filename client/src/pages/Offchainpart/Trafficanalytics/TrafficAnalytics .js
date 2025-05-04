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
    
    // Data structure to track all users
    const users = {};
    
    // First, group all sessions by user ID
    for (const session of analytics.sessions) {
      if (!session.userId) continue;
      
      if (!users[session.userId]) {
        users[session.userId] = {
          firstSource: null,
          hasConnectedWallet: false,
          firstSessionTimestamp: null,
          sessions: []
        };
      }
      
      users[session.userId].sessions.push(session);
    }
    
    // Sort each user's sessions by timestamp and determine first source and wallet status
    for (const userId in users) {
      const user = users[userId];
      
      // Sort sessions by timestamp (oldest first)
      user.sessions.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
      
      // Set the first session timestamp
      if (user.sessions.length > 0) {
        user.firstSessionTimestamp = user.sessions[0].timestamp;
      }
      
      // Determine first source from the earliest session
      const firstSession = user.sessions[0];
      let source = 'Direct';
      
      if (firstSession.utmData && firstSession.utmData.source && firstSession.utmData.source.trim() !== '') {
        source = normalizeDomain(firstSession.utmData.source);
      } else if (firstSession.referrer && firstSession.referrer !== 'direct') {
        try {
          const url = new URL(firstSession.referrer);
          source = normalizeDomain(url.hostname || url.host || firstSession.referrer);
        } catch (e) {
          source = normalizeDomain(firstSession.referrer);
        }
      }
      
      user.firstSource = source;
      
      // Check if user has ever connected a wallet in any session
      user.hasConnectedWallet = user.sessions.some(session => 
        session.wallet && 
        session.wallet.walletAddress && 
        session.wallet.walletAddress.trim() !== '' && 
        session.wallet.walletAddress !== 'No Wallet Detected'
      );
    }
    
    // Count users by source and outcome
    const sourceOutcomeCounts = {};
    
    // Process all users
    for (const userId in users) {
      const user = users[userId];
      const source = user.firstSource;
      const outcome = user.hasConnectedWallet ? 'Wallet Connected' : 'Dropped Off';
      
      if (!sourceOutcomeCounts[source]) {
        sourceOutcomeCounts[source] = {
          'Wallet Connected': 0,
          'Dropped Off': 0,
          total: 0
        };
      }
      
      sourceOutcomeCounts[source][outcome]++;
      sourceOutcomeCounts[source].total++;
    }
    
    // Convert to Sankey data format
    const sankeyData = [];
    
    for (const source in sourceOutcomeCounts) {
      const counts = sourceOutcomeCounts[source];
      
      if (counts['Wallet Connected'] > 0) {
        sankeyData.push({
          source,
          target: 'Wallet Connected',
          value: counts['Wallet Connected'],
          total: counts.total
        });
      }
      
      if (counts['Dropped Off'] > 0) {
        sankeyData.push({
          source,
          target: 'Dropped Off',
          value: counts['Dropped Off'],
          total: counts.total
        });
      }
    }
    
    // Sort sources by total users and limit to top 7 sources
    const uniqueSources = [...new Set(sankeyData.map(item => item.source))];
    const sourceWithTotals = uniqueSources.map(source => {
      const total = sourceOutcomeCounts[source].total;
      return { source, total };
    });
    
    // Sort by total and get top 7
    const topSources = sourceWithTotals
      .sort((a, b) => b.total - a.total)
      .slice(0, 7)
      .map(item => item.source);
    
    // Filter data to only include flows from top sources
    return sankeyData.filter(item => topSources.includes(item.source));
  };
  
  // Get the Sankey data
  const attributionJourneyData = processAnalyticsData();
  
  // Debugging check
  console.log('Attribution data:', attributionJourneyData);
  
  // Use fallback data if no real data is available
  const finalData = attributionJourneyData.length > 0 ? attributionJourneyData : [
    { source: 'Direct', target: 'Wallet Connected', value: 3, total: 10 },
    { source: 'Direct', target: 'Dropped Off', value: 7, total: 10 }
  ];
  
  // Calculate total values for scaling
  const totalValue = finalData.reduce((sum, item) => sum + item.value, 0);
  
  // Get unique sources and targets
  const uniqueSources = [...new Set(finalData.map(item => item.source))];
  const uniqueTargets = [...new Set(finalData.map(item => item.target))];
  
  // Define fixed colors for targets
  const targetColors = {
    'Wallet Connected': '#28a745', // Green for success
    'Dropped Off': '#dc3545'      // Red for drop-offs
  };
  
  // Calculate better spacing for diagram
  const svgHeight = 600; // Increased height for more vertical spacing
  const svgWidth = 900;  // Increased width for better horizontal spacing
  const nodeWidth = 130; // Wider nodes to fit text better
  const diagramPadding = 70; // More padding around the diagram
  const nodeMargin = 35; // Increased margin between nodes for better spacing
  const minNodeHeight = 40; // Increased minimum height for better text display
  
  // Helper function to generate colors - moved up before it's used
  const getColorForIndex = (index) => {
    const colors = [
      '#9c7df3', '#7de2d1', '#5d9cf8', '#db77a2', 
      '#f7b844', '#66bb6a', '#ef5350', '#7986cb'
    ];
    return colors[index % colors.length];
  };
  
  // Define node positions and dimensions dynamically
  const nodes = {};
  
  // Position source nodes on the left side with better spacing
  // Calculate node placement to prevent overflow
  const calculateNodePositions = () => {
    // Get unique sources and targets for layout planning
    const allSources = [...new Set(finalData.map(item => item.source))];
    const allTargets = [...new Set(finalData.map(item => item.target))];
    
    // Create source nodes first
    let maxSourceNodeHeight = 0;
    const totalValueBySource = {};
    
    // Calculate total value for each source for scaling
    allSources.forEach(source => {
      const sourceData = finalData.filter(item => item.source === source);
      totalValueBySource[source] = sourceData.reduce((sum, item) => sum + item.value, 0);
    });
    
    // Create scaled node heights based on values
    // but ensure minimum spacing between nodes
    const availableHeight = svgHeight - (2 * diagramPadding);
    const totalNodesHeight = allSources.length * minNodeHeight;
    const totalMarginHeight = (allSources.length - 1) * nodeMargin;
    const remainingHeight = availableHeight - totalNodesHeight - totalMarginHeight;
    
    // Distribute remaining height proportionally based on values
    const valueSum = Object.values(totalValueBySource).reduce((sum, val) => sum + val, 0);
    let currentY = diagramPadding;
    
    // Position source nodes
    allSources.forEach((source, index) => {
      const sourceData = finalData.filter(item => item.source === source);
      const totalVisitors = sourceData[0].total;
      
      // Calculate height based on value proportion plus minimum height
      const valueRatio = totalValueBySource[source] / valueSum;
      const additionalHeight = remainingHeight * valueRatio;
      const nodeHeight = minNodeHeight + additionalHeight;
      
      nodes[source] = {
        x: diagramPadding,
        y: currentY,
        width: nodeWidth,
        height: nodeHeight,
        color: getColorForIndex(index),
        totalVisitors: totalVisitors
      };
      
      // Update for next node
      currentY += nodeHeight + nodeMargin;
      maxSourceNodeHeight = Math.max(maxSourceNodeHeight, nodeHeight);
    });
    
    // Now position target nodes with similar logic
    let targetY = diagramPadding;
    const targetValueSum = {};
    allTargets.forEach(target => {
      const targetData = finalData.filter(item => item.target === target);
      targetValueSum[target] = targetData.reduce((sum, item) => sum + item.value, 0);
    });
    
    const totalTargetValueSum = Object.values(targetValueSum).reduce((sum, val) => sum + val, 0);
    
    // Position target nodes
    allTargets.forEach((target, index) => {
      const valueRatio = targetValueSum[target] / totalTargetValueSum;
      const additionalHeight = remainingHeight * valueRatio;
      const nodeHeight = minNodeHeight + additionalHeight;
      
      nodes[target] = {
        x: svgWidth - diagramPadding - nodeWidth,
        y: targetY,
        width: nodeWidth,
        height: nodeHeight,
        color: targetColors[target]
      };
      
      // Update for next node
      targetY += nodeHeight + nodeMargin;
    });
  };
  
  // Calculate node positions once we have the finalData
  // We need to defer this since finalData depends on attributionJourneyData
  // But only calculate after finalData is ready
  if (finalData && finalData.length > 0) {
    calculateNodePositions();
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
    const sourceX = nodes[flow.source].x + nodeWidth;
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
  
  // Helper function to truncate long source names
  const truncateText = (text, maxChars = 15) => {
    if (!text) return '';
    return text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
  };
  
  // Get flow color - simplified color logic
  const getFlowColor = (target) => {
    return target === 'Wallet Connected' ? '#28a745' : '#dc3545';
  };

  return (
    <div className="w-full">
      <div className="font-poppins">
        <div className="text-center text-sm text-gray-600 mb-4">
          User journey from traffic source to conversion or drop-off
        </div>
        <div className="h-[600px]"> {/* Increased height to match SVG height */}
          <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
            {/* Flows (render first so they appear behind nodes) */}
            <g className="flows">
              {finalData.map((flow, index) => (
                <g key={`flow-${index}`}>
                  <path 
                    d={createSankeyPath(flow)}
                    fill={getFlowColor(flow.target)}
                    fillOpacity={0.3}
                    stroke={getFlowColor(flow.target)}
                    strokeWidth={1}
                  />
                  {/* Only show flow value if significant enough */}
                  {flow.value > 2 && (
                    <text 
                      x={(nodes[flow.source].x + nodeWidth + nodes[flow.target].x) / 2}
                      y={(flow.sourceY + flow.sourceHeight / 2 + flow.targetY + flow.targetHeight / 2) / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-poppins"
                      fontSize="12"
                      fontWeight="500"
                      fill="#333333"
                    >
                      {flow.value}
                    </text>
                  )}
                </g>
              ))}
            </g>
            
            {/* Source Nodes */}
            <g className="source-nodes">
              {Object.keys(nodes).filter(key => !['Wallet Connected', 'Dropped Off'].includes(key)).map(key => (
                <g key={`source-${key}`}>
                  <rect 
                    x={nodes[key].x}
                    y={nodes[key].y}
                    width={nodeWidth}
                    height={nodes[key].height}
                    fill={nodes[key].color}
                    rx={4}
                    ry={4}
                  />
                  <text 
                    x={nodes[key].x + nodeWidth/2} 
                    y={nodes[key].y + nodes[key].height/2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="'Montserrat', sans-serif"
                    fontSize="12"
                    fontWeight="600"
                    fill="#FFFFFF"
                  >
                    {truncateText(key, 12)}
                  </text>
                  {/* Show total count for source nodes slightly more compact */}
                  <text 
                    x={nodes[key].x + nodeWidth/2} 
                    y={nodes[key].y - 8}
                    textAnchor="middle"
                    fontFamily="'Poppins', sans-serif"
                    fontSize="11"
                    fontWeight="500"
                    fill="#666666"
                  >
                    {nodes[key].totalVisitors} users
                  </text>
                </g>
              ))}
            </g>
            
            {/* Target Nodes */}
            <g className="target-nodes">
              {['Wallet Connected', 'Dropped Off'].map(key => nodes[key] && (
                <g key={`target-${key}`}>
                  <rect 
                    x={nodes[key].x}
                    y={nodes[key].y}
                    width={nodeWidth}
                    height={nodes[key].height}
                    fill={nodes[key].color}
                    rx={4}
                    ry={4}
                  />
                  <text 
                    x={nodes[key].x + nodeWidth/2} 
                    y={nodes[key].y + nodes[key].height/2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="'Montserrat', sans-serif"
                    fontSize="13"
                    fontWeight="600"
                    fill="#FFFFFF"
                  >
                    {key}
                  </text>
                </g>
              ))}
            </g>
          </svg>
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

      {/* Web3 Users by Medium (50%) + Traffic Sources (50%) - Evenly split */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Web3 Users by Medium - 50% width on md screens and up */}
        <div className="w-full md:w-1/2 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 font-montserrat">Web3 Users by Medium</h3>
          <div className="text-center text-sm text-gray-600 mb-2 font-poppins">
            {isSampleData ? (
              <span className="text-yellow-600">Sample Data - No real data available yet</span>
            ) : (
              "Distribution of Web3 Users Across Traffic Sources"
            )}
          </div>
          {/* Maintain height for good visualization */}
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
        
        {/* Traffic Sources - 50% width on md screens and up */}
        <div className="w-full md:w-1/2 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 font-montserrat">Traffic Sources</h3>
          <div className="overflow-auto max-h-[350px]"> {/* Added scroll for vertical overflow */}
            <TrafficSourcesComponent 
              analytics={analytics}
              setanalytics={setanalytics}
              trafficSources={trafficSources} 
              setTrafficSources={setTrafficSources} 
            />
          </div>
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
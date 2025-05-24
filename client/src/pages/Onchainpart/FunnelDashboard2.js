import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  FunnelChart, 
  Funnel, 
  LabelList, 
  Tooltip
} from 'recharts';
import { isWeb3User, walletConnected } from '../../utils/analyticsHelpers';

// Session storage key for persisting data
const SESSION_FUNNEL_DATA_KEY = 'onchain_funnel_dashboard_data';

const HorizontalFunnelVisualization = ({ analytics, contractData }) => {
  // State to hold the funnel data
  const [data, setData] = useState([
    { name: 'Unique Visitors', value: 200, fill: '#1D0C46' },
    { name: 'Web3 Users', value: 130, fill: '#8B5CF6' },
    { name: 'Wallets connected', value: 90, fill: '#FFB95A' },
    { name: 'Wallets transacted', value: 60, fill: '#CAA968' }
  ]);
  
  // State for conversion metrics and Web3 stats
  const [metrics, setMetrics] = useState({
    conversion: "0.00",
    webUsers: "0.00"
  });
  
  // State to hold web3Stats directly
  const [web3Stats, setWeb3Stats] = useState({
    web3Users: 0,
    web3Percentage: "0.00",
    walletsConnected: 0,
    walletsPercentage: "0.00"
  });
  
  // State to hold processed data
  const [processedData, setProcessedData] = useState(() => {
    // Try to load from session storage first
    try {
      const sessionData = sessionStorage.getItem(SESSION_FUNNEL_DATA_KEY);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        console.log("Restored funnel data from session storage");
        return parsed;
      }
    } catch (e) {
      console.error("Error loading funnel data from session storage:", e);
    }
    return null;
  });
  
  // Update data when analytics or contractData changes
  useEffect(() => {
    console.log("FunnelDashboard - Updating with new data:", {
      analyticsExists: !!analytics,
      uniqueVisitors: analytics?.uniqueVisitors,
      sessionsCount: analytics?.sessions?.length,
      walletsCount: analytics?.wallets?.length,
      contractDataExists: !!contractData,
      contractId: contractData?.contractId,
      contractName: contractData?.contract?.name,
      contractTransactionsCount: contractData?.contractTransactions?.length,
      processedDataExists: !!contractData?.processedData,
      showDemoData: contractData?.showDemoData
    });
    
    // If we already have processed data, use it
    if (processedData) {
      console.log("Using previously processed funnel data");
      setData(processedData);
      return;
    }
    
    // If no analytics data, use demo data
    if (!analytics || !analytics.sessions || !Array.isArray(analytics.sessions)) {
      console.log("No valid analytics data for funnel, using demo data");
      const demoData = [
        { stage: "Unique Visitors", value: 5000 },
        { stage: "Wallet Users", value: 3000 },
        { stage: "Wallets Connected", value: 1500 },
        { stage: "Wallets Recorded", value: 300 }
      ];
      setData(demoData);
      return;
    }
    
    console.log(`Processing ${analytics.sessions.length} sessions for funnel data`);
    
    // Count unique visitors
    const uniqueVisitors = new Set();
    analytics.sessions.forEach(session => {
      if (session.userId) {
        uniqueVisitors.add(session.userId);
      }
    });
    
    // Count web3 users (users with wallet capability)
    const web3Users = new Set();
    analytics.sessions.forEach(session => {
      if (session.userId && isWeb3User(session)) {
        web3Users.add(session.userId);
      }
    });
    
    // Count users who connected wallets
    const walletsConnectedUsers = new Set();
    analytics.sessions.forEach(session => {
      if (session.userId && walletConnected(session)) {
        walletsConnectedUsers.add(session.userId);
      }
    });
    
    // Count wallet addresses that match transactions (if contract data available)
    let walletsRecorded = 0;
    
    if (contractData && 
        !contractData.showDemoData && 
        contractData.contractTransactions && 
        contractData.contractTransactions.length > 0) {
      
      console.log("Contract data available, calculating transaction match rate");
      
      // Extract all wallet addresses from transactions
      const transactionWallets = new Set();
      contractData.contractTransactions.forEach(tx => {
        if (tx.from_address) {
          transactionWallets.add(tx.from_address.toLowerCase());
        }
      });
      
      console.log(`Found ${transactionWallets.size} unique wallet addresses in transactions`);
      
      // Count how many connected wallets appear in transactions
      if (analytics.wallets && Array.isArray(analytics.wallets)) {
        let matchCount = 0;
        analytics.wallets.forEach(walletData => {
          if (walletData.walletAddress && 
              transactionWallets.has(walletData.walletAddress.toLowerCase())) {
            matchCount++;
          }
        });
        
        walletsRecorded = matchCount;
        console.log(`Found ${matchCount} wallets that match transaction addresses`);
      }
    } else {
      console.log("No contract transaction data available, using simulated match rate");
      // Simulate a reasonable conversion rate
      walletsRecorded = Math.floor(walletsConnectedUsers.size * 0.2);
    }
    
    // Create funnel data
    const funnelData = [
      { stage: "Unique Visitors", value: uniqueVisitors.size },
      { stage: "Wallet Users", value: web3Users.size },
      { stage: "Wallets Connected", value: walletsConnectedUsers.size },
      { stage: "Wallets Recorded", value: walletsRecorded }
    ];
    
    console.log("Generated funnel data:", funnelData);
    setData(funnelData);
    setProcessedData(funnelData);
    
    // Save to session storage for persistence between navigations
    try {
      sessionStorage.setItem(SESSION_FUNNEL_DATA_KEY, JSON.stringify(funnelData));
      console.log("Saved funnel data to session storage");
    } catch (error) {
      console.error("Error saving funnel data to session storage:", error);
    }
  }, [analytics, contractData, processedData]);

  // Helper function to calculate ratios for display
  const calculateRatios = () => {
    if (!data || data.length < 4) return {};
    
    const visitors = data[0].value;
    const web3Users = data[1].value;
    const walletsConnected = data[2].value;
    const walletsRecorded = data[3].value;
    
    return {
      web3Ratio: visitors > 0 ? ((web3Users / visitors) * 100).toFixed(1) : 0,
      connectionRatio: web3Users > 0 ? ((walletsConnected / web3Users) * 100).toFixed(1) : 0,
      transactionRatio: walletsConnected > 0 ? ((walletsRecorded / walletsConnected) * 100).toFixed(1) : 0,
      overallConversion: visitors > 0 ? ((walletsRecorded / visitors) * 100).toFixed(1) : 0
    };
  };
  
  const getDefaultColor = (index) => {
    const colors = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d'];
    return colors[index % colors.length];
  };
  
  const conversionRate = (data && data.length >= 2) ? 
    ((data[1].value / data[0].value) * 100).toFixed(1) : 0;
    
  const web3UsersRate = (data && data.length >= 2) ? 
    data[1].value : 0;
    
  const ratios = calculateRatios();
  
  // Custom tooltip for funnel chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip bg-white p-3 shadow-md rounded-md border border-gray-200">
          <p className="font-semibold">{data.stage}</p>
          <p>Count: <span className="font-medium">{data.value.toLocaleString()}</span></p>
          {data.stage === "Wallet Users" && (
            <p>Ratio: <span className="font-medium">{ratios.web3Ratio}% of visitors</span></p>
          )}
          {data.stage === "Wallets Connected" && (
            <p>Ratio: <span className="font-medium">{ratios.connectionRatio}% of web3 users</span></p>
          )}
          {data.stage === "Wallets Recorded" && (
            <p>Ratio: <span className="font-medium">{ratios.transactionRatio}% of connected wallets</span></p>
          )}
        </div>
      );
    }
  
    return null;
  };

  return (
    <div className="flex flex-col w-full max-w-5xl p-6 bg-white rounded-lg shadow">
      {/* Stats display */}
      <div className="flex justify-end w-full mb-6">
        <div className="flex space-x-4 p-4 bg-gray-900 text-white rounded-lg">
          <div className="px-4 py-2 bg-amber-200 text-gray-900 rounded">
            <p className="text-sm">Conversion</p>
            <p className="text-xl font-bold">{ratios.overallConversion}%</p>
          </div>
          <div className="px-4 py-2">
            <p className="text-sm">Web3 users</p>
            <p className="text-xl font-bold">{ratios.web3Ratio}%</p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Custom horizontal funnel using SVG */}
        <div className="w-full h-64 relative">
          <HorizontalFunnel data={data} analytics={analytics} web3Stats={web3Stats} />
        </div>
      </div>
      
      {/* Labels below the chart */}
      <div className="flex flex-col mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center">
            <div 
              className="w-4 h-4 mr-2" 
              style={{ backgroundColor: item.fill }}
            ></div>
            <p className="text-sm">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Custom horizontal funnel component
const HorizontalFunnel = ({ data, analytics, web3Stats }) => {
  if (!data || data.length === 0) return null;
  
  // Calculate dimensions
  const width = 600;
  const height = 200;
  const maxHeight = height * 0.8;
  const minHeight = maxHeight * 0.2;
  
  // Calculate segment widths
  const totalWidth = width;
  const segmentWidth = totalWidth / data.length;
  
  // Calculate heights based on values
  const maxValue = Math.max(...data.map(d => d.value)) || 1;
  const heights = data.map(d => {
    const ratio = d.value / maxValue;
    return minHeight + (maxHeight - minHeight) * ratio;
  });
  
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {data.map((item, index) => {
        // For the last segment, make it a triangle that ends in a point
        if (index === data.length - 1) {
          const startX = index * segmentWidth;
          const startHeight = heights[index];
          const startY = (height - startHeight) / 2;
          
          // Create a triangle that ends in a point
          return (
            <path 
              key={index}
              d={`M ${startX} ${startY}
                  L ${startX} ${startY + startHeight}
                  L ${startX + segmentWidth} ${height / 2}
                  Z`}
              fill={item.fill}
            />
          );
        }
        
        // For other segments, create trapezoids
        const startX = index * segmentWidth;
        const endX = (index + 1) * segmentWidth;
        const startHeight = heights[index];
        const endHeight = heights[index + 1];
        const startY = (height - startHeight) / 2;
        const endY = (height - endHeight) / 2;
        
        return (
          <path 
            key={index}
            d={`M ${startX} ${startY}
                L ${startX} ${startY + startHeight}
                L ${endX} ${endY + endHeight}
                L ${endX} ${endY}
                Z`}
            fill={item.fill}
          />
        );
      })}
      
      {/* Add value labels */}
      {data.map((item, index) => {
        const x = index * segmentWidth + segmentWidth / 2;
        const y = height / 2;

        // Determine the text value based on item.name
        let textValue;
        if (item.name === 'Unique Visitors') {
          textValue = analytics?.uniqueVisitors || item.value;
        } else if (item.name === 'Web3 Users') {
          textValue = web3Stats?.web3Users || item.value;
        } else if (item.name === 'Wallets connected') {
          textValue = web3Stats?.walletsConnected || item.value;
        } else if (item.name === 'Wallets transacted') {
          textValue = item.value;
        } else {
          textValue = item.value;
        }

        return (
          <text 
            key={`label-${index}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontWeight="bold"
            fontFamily="'Montserrat', sans-serif"
          >
            {textValue}
          </text>
        );
      })}
    </svg>
  );
};

// Example usage
const FunnelDashboard2 = ({ analytics, contractData }) => {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">User Conversion Funnel</h2>
      <HorizontalFunnelVisualization 
        analytics={analytics} 
        contractData={contractData}
      />
    </div>
  );
};

export default FunnelDashboard2;
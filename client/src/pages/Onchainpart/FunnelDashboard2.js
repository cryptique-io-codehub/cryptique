import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  FunnelChart, 
  Funnel, 
  LabelList, 
  Tooltip
} from 'recharts';
import { calculateWeb3Stats } from '../../utils/analyticsHelpers';

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
    
    // If we have real data from website analytics, use it
    if (analytics?.sessions) {
      // Calculate Web3 stats using the analytics helper
      const calculatedWeb3Stats = calculateWeb3Stats(analytics.sessions, analytics.uniqueVisitors);
      setWeb3Stats(calculatedWeb3Stats);
      
      console.log("Web3 stats calculated:", calculatedWeb3Stats);
      
      // Determine wallets transacted count - wallets that interacted with our contract
      // This would need to match wallet addresses from sessions with wallet addresses from transactions
      let walletsTransacted = 0;
      
      // Only try to match real data if we have a selected contract and it's not demo data
      if (contractData && 
          !contractData.showDemoData && 
          contractData.contractId &&
          contractData.contractTransactions && 
          contractData.contractTransactions.length > 0) {
        // Get unique wallet addresses from the website data
        const websiteWallets = new Set();
        
        // Process both wallets array and any wallets found in sessions
        // First check the wallets array
        if (Array.isArray(analytics.wallets)) {
          analytics.wallets.forEach(wallet => {
            if (wallet.walletAddress && wallet.walletAddress.length > 10) {
              websiteWallets.add(wallet.walletAddress.toLowerCase());
            }
          });
        }
        
        // Then check sessions for any additional wallets
        if (Array.isArray(analytics.sessions)) {
          analytics.sessions.forEach(session => {
            if (session.wallet && session.wallet.walletAddress && 
                session.wallet.walletAddress.length > 10) {
              websiteWallets.add(session.wallet.walletAddress.toLowerCase());
            }
          });
        }
        
        // Get unique wallet addresses from contract transactions
        const contractWallets = new Set();
        if (contractData.contractTransactions) {
          contractData.contractTransactions.forEach(tx => {
            if (tx.from_address) {
              contractWallets.add(tx.from_address.toLowerCase());
            }
          });
        }
        
        console.log("Wallet matching stats:", {
          websiteWalletsCount: websiteWallets.size,
          contractWalletsCount: contractWallets.size
        });
        
        // Count the intersection of these sets
        if (websiteWallets.size > 0 && contractWallets.size > 0) {
          // Log some sample wallets for debugging
          const websiteSamples = Array.from(websiteWallets).slice(0, 3);
          const contractSamples = Array.from(contractWallets).slice(0, 3);
          
          console.log("Sample website wallets:", websiteSamples);
          console.log("Sample contract wallets:", contractSamples);
          
          websiteWallets.forEach(address => {
            if (contractWallets.has(address)) {
              walletsTransacted++;
            }
          });
        }
        
        console.log("Wallets transacted count:", walletsTransacted);
      } else {
        // For demo data, show a reasonable conversion rate
        walletsTransacted = Math.floor(calculatedWeb3Stats.walletsConnected * 0.66);
        console.log("Using demo conversion rate, wallets transacted:", walletsTransacted);
      }
      
      // Update funnel data - use calculated values directly for better accuracy
      const newData = [
        { name: 'Unique Visitors', value: analytics.uniqueVisitors || 0, fill: '#1D0C46' },
        { name: 'Web3 Users', value: calculatedWeb3Stats.web3Users || 0, fill: '#8B5CF6' },
        { name: 'Wallets connected', value: calculatedWeb3Stats.walletsConnected || 0, fill: '#FFB95A' },
        { name: 'Wallets transacted', value: walletsTransacted || 0, fill: '#CAA968' }
      ];
      
      console.log("Setting new funnel data:", newData);
      setData(newData);
      
      // Calculate conversion metrics
      const conversion = calculatedWeb3Stats.walletsConnected > 0 
        ? ((walletsTransacted / calculatedWeb3Stats.walletsConnected) * 100).toFixed(2)
        : "0.00";
        
      const webUsers = analytics.uniqueVisitors > 0 
        ? ((calculatedWeb3Stats.web3Users / analytics.uniqueVisitors) * 100).toFixed(2)
        : "0.00";
        
      setMetrics({
        conversion,
        webUsers
      });
    } else {
      // For demo data without real analytics
      const uniqueVisitors = 200;
      const web3Users = 130;
      const walletsConnected = 90;
      const walletsTransacted = 60;
      
      setData([
        { name: 'Unique Visitors', value: uniqueVisitors, fill: '#1D0C46' },
        { name: 'Web3 Users', value: web3Users, fill: '#8B5CF6' },
        { name: 'Wallets connected', value: walletsConnected, fill: '#FFB95A' },
        { name: 'Wallets transacted', value: walletsTransacted, fill: '#CAA968' }
      ]);
      
      // Set demo Web3 stats
      setWeb3Stats({
        web3Users,
        web3Percentage: ((web3Users / uniqueVisitors) * 100).toFixed(2),
        walletsConnected,
        walletsPercentage: ((walletsConnected / uniqueVisitors) * 100).toFixed(2)
      });
      
      // Calculate conversion metrics for demo data
      const conversion = ((walletsTransacted / walletsConnected) * 100).toFixed(2);
      const webUsers = ((web3Users / uniqueVisitors) * 100).toFixed(2);
      
      setMetrics({
        conversion,
        webUsers
      });
    }
  }, [analytics, contractData, contractData?.contractTransactions]);

  return (
    <div className="flex flex-col w-full max-w-5xl p-6 bg-white rounded-lg shadow">
      {/* Stats display */}
      <div className="flex justify-end w-full mb-6">
        <div className="flex space-x-4 p-4 bg-gray-900 text-white rounded-lg">
          <div className="px-4 py-2 bg-amber-200 text-gray-900 rounded">
            <p className="text-sm">Conversion</p>
            <p className="text-xl font-bold">{metrics.conversion}%</p>
          </div>
          <div className="px-4 py-2">
            <p className="text-sm">Web3 users</p>
            <p className="text-xl font-bold">{metrics.webUsers}%</p>
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
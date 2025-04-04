import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  FunnelChart, 
  Funnel, 
  LabelList, 
  Tooltip
} from 'recharts';

const HorizontalFunnelVisualization = ({analytics}) => {
  // console.log(analytics)
  // const[analytics,setanalytics]=useState(() => localStorage.getItem('analytics_storage') || {});
  // useEffect(()=>{
  // setanalytics(analytics);
  // },[analytics]);
  // console.log(analytics);
  // State to hold the funnel data - can be updated from props or API
  
  // Update data when initialData changes (if provided as a prop)
  // Helper function to get default colors if not provided
  const [data, setData] = useState([
    { name: 'Unique Visitors', value:200, fill: '#1D0C46' },
    { name: 'Web3 Users', value: 130, fill: '#8B5CF6' },
    { name: 'Wallets connected', value: 90, fill: '#FFB95A' }
  ]);
  const getDefaultColor = (index) => {
    const defaultColors = ['#1a1053', '#7e57ff', '#ffc168'];
    return defaultColors[index % defaultColors.length];
  };
  
  // Stats calculated from the current data state
  const conversionRate = data.length >= 3 ? 
    ((data[data.length-1].value / data[0].value) * 100).toFixed(2) : 
    0;
    
  const web3UsersRate = data.length >= 2 ? 
    ((data[1].value / data[0].value) * 100).toFixed(2) : 
    0;

  return (
    <div className="flex flex-col w-full max-w-5xl p-6 bg-white rounded-lg shadow">
      {/* Stats display */}
      <div className="flex justify-end w-full mb-6">
        <div className="flex space-x-4 p-4 bg-gray-900 text-white rounded-lg">
          <div className="px-4 py-2 bg-amber-200 text-gray-900 rounded">
            <p className="text-sm">Conversion</p>
            <p className="text-xl font-bold">{analytics?.walletsConnected/analytics?.uniqueVisitors}%</p>
          </div>
          <div className="px-4 py-2">
            <p className="text-sm">Web3 users</p>
            <p className="text-xl font-bold">{analytics?.web3Visitors/analytics?.uniqueVisitors}%</p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Custom horizontal funnel using SVG */}
        <div className="w-full h-64 relative">
          <HorizontalFunnel data={data} analytics={analytics} />
          
          {/* Value displayed at the end of the funnel */}
          <div className="absolute right-2 top-24 text-4xl font-bold">
            
          </div>
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
const HorizontalFunnel = ({ data,analytics }) => {
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
  const maxValue = data[0].value;
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
    textValue = analytics?.uniqueVisitors;
  } else if (item.name === 'Web3 Users') {
    textValue = analytics?.web3Visitors;
  } else if (item.name === 'Wallets connected') {
    textValue = analytics?.walletsConnected;
  } else if (item.name === 'Transaction recorded') {
    textValue = 0;
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
    >
      {textValue}
    </text>
  );
})}
    </svg>
  );
};

// Example usage
const FunnelDashboard = ({analytics}) => {
  // console.log(analytics);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">User Funnel Dashboard</h1>
      <HorizontalFunnelVisualization analytics={analytics}/>

    </div>
  );
};

export default FunnelDashboard;
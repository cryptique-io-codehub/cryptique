import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Legend, ZAxis } from 'recharts';

const AttributionJourneySankey = () => {
  // Data for the Sankey diagram
  const attributionJourneyData = [
    { source: 'Ads', target: 'Wallet Connect', value: 2500 },
    { source: 'Ads', target: 'Drop off', value: 1500 },
    { source: 'Facebook', target: 'Wallet Connect', value: 1800 },
    { source: 'Facebook', target: 'Drop off', value: 2200 },
    { source: 'X', target: 'Wallet Connect', value: 900 },
    { source: 'X', target: 'Drop off', value: 1100 }
  ];

  // Calculate total values for scaling
  const totalValue = attributionJourneyData.reduce((sum, item) => sum + item.value, 0);
  
  // Define node positions and dimensions - further increased heights and adjusted positions
  const nodes = {
    'Ads': { x: 0, y: 100, height: 180, color: '#9c7df3' },
    'Facebook': { x: 0, y: 340, height: 180, color: '#7de2d1' },
    'X': { x: 0, y: 580, height: 90, color: '#5d9cf8' },
    'Wallet Connect': { x: 720, y: 120, height: 280, color: '#db77a2' },
    'Drop off': { x: 720, y: 450, height: 240, color: '#7de2d1' }
  };

  // Create source groups for proper flow ordering
  const sourceGroups = {};
  attributionJourneyData.forEach(d => {
    if (!sourceGroups[d.source]) {
      sourceGroups[d.source] = { total: 0, flows: [] };
    }
    sourceGroups[d.source].flows.push(d);
    sourceGroups[d.source].total += d.value;
  });

  // Create target groups for proper flow ordering
  const targetGroups = {};
  attributionJourneyData.forEach(d => {
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
    const sourceX = nodes[flow.source].x + 80; // Extra wide nodes
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
  
  // Color blending logic
  const blendColors = (source, target, ratio = 0.5) => {
    // Get source and target colors
    const sourceColor = nodes[source].color;
    const targetColor = nodes[target].color;
    
    // Simple linear interpolation of colors
    const r1 = parseInt(sourceColor.substring(1, 3), 16);
    const g1 = parseInt(sourceColor.substring(3, 5), 16);
    const b1 = parseInt(sourceColor.substring(5, 7), 16);
    
    const r2 = parseInt(targetColor.substring(1, 3), 16);
    const g2 = parseInt(targetColor.substring(3, 5), 16);
    const b2 = parseInt(targetColor.substring(5, 7), 16);
    
    const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
    const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
    const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Calculate opacity based on value relative to total
  const calculateOpacity = (value) => {
    return 0.7 + (value / totalValue) * 0.3; // Increased base opacity for more prominence
  };

  return (
    <div className="bg-white rounded-lg shadow-lg w-full">
      <h3 className="text-lg md:text-xl font-bold px-2 pt-2">Attribution Journey</h3>
      <div className="w-full">
        {/* Make SVG responsive with proper aspect ratio */}
        <div className="w-full aspect-[4/3] md:aspect-[16/9] relative overflow-hidden">
          <svg width="100%" height="100%" viewBox="0 0 800 750" preserveAspectRatio="xMidYMid meet">
            {/* Node labels */}
            {Object.entries(nodes).map(([name, node]) => (
              <text
                key={`label-${name}`}
                x={node.x + (node.x === 0 ? 40 : -40)}
                y={node.y + node.height/2}
                textAnchor={node.x === 0 ? "start" : "end"}
                alignmentBaseline="middle"
                className="text-sm md:text-lg font-semibold"
                style={{ fill: "#333333" }}
              >
                {name}
              </text>
            ))}
            
            {/* Flow paths with extra thickness */}
            {attributionJourneyData.map((flow, index) => (
              <path
                key={`flow-${index}`}
                d={createSankeyPath(flow)}
                fill={blendColors(flow.source, flow.target)}
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
                width="80"
                height={node.height}
                fill={node.color}
                rx="8"
                ry="8"
                stroke="#ffffff"
                strokeWidth="2"
              />
            ))}
            
            {/* Value labels on paths - only show on larger screens */}
            {attributionJourneyData.map((flow, index) => {
              const centerX = (nodes[flow.source].x + 80 + nodes[flow.target].x) / 2;
              const centerY = (flow.sourceY + flow.sourceHeight/2 + flow.targetY + flow.targetHeight/2) / 2;
              
              return flow.value > 1500 ? (
                <text
                  key={`value-${index}`}
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className="text-xs md:text-sm font-semibold"
                  style={{ fill: "#ffffff" }}
                >
                  {flow.value}
                </text>
              ) : null;
            })}
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

const TrafficAnalytics = () => {
  // Sample data for the charts
  const attributionJourneyData = [
    { source: 'Ads', target: 'Wallet Connect', value: 2500 },
    { source: 'Ads', target: 'Drop off', value: 1500 },
    { source: 'Facebook', target: 'Wallet Connect', value: 1800 },
    { source: 'Facebook', target: 'Drop off', value: 2200 },
    { source: 'X', target: 'Wallet Connect', value: 900 },
    { source: 'X', target: 'Drop off', value: 1100 }
  ];
  
  // Traffic quality data updated to match the image
  const trafficQualityData = [
    { engagement: 2, conversion: 10, source: 'Google', color: '#4caf50' },
    { engagement: 2.5, conversion: 20, source: 'Facebook', color: '#2196f3' },
    { engagement: 3, conversion: 37, source: 'X', color: '#f44336' },
    { engagement: 3.5, conversion: 42, source: 'Discord', color: '#7e57c2' },
    { engagement: 5, conversion: 25, source: 'LinkedIn', color: '#03a9f4' },
    { engagement: 8, conversion: 30, source: 'Ads', color: '#ff80ab' },
    { engagement: 9, conversion: 38, source: 'Organic', color: '#ba68c8' },
    { engagement: 10, conversion: 52, source: 'Direct', color: '#0d47a1' }
  ];

  // Updated Web3 Users by Medium data to match the time-based chart in the image
  const web3UsersByTimeData = [
    { time: '00:00', 'Paid/Ads': 35, 'Organic': 20, 'Social': 115, 'KOL & Partnerships': 145, 'Events': 150, 'Others': 120 },
    { time: '04:00', 'Paid/Ads': 50, 'Organic': 28, 'Social': 50, 'KOL & Partnerships': 120, 'Events': 80, 'Others': 155 },
    { time: '08:00', 'Paid/Ads': 25, 'Organic': 35, 'Social': 165, 'KOL & Partnerships': 100, 'Events': 120, 'Others': 45 },
    { time: '12:00', 'Paid/Ads': 40, 'Organic': 20, 'Social': 100, 'KOL & Partnerships': 130, 'Events': 110, 'Others': 30 },
    { time: '16:00', 'Paid/Ads': 55, 'Organic': 12, 'Social': 50, 'KOL & Partnerships': 145, 'Events': 90, 'Others': 125 },
    { time: '20:00', 'Paid/Ads': 65, 'Organic': 55, 'Social': 75, 'KOL & Partnerships': 55, 'Events': 45, 'Others': 80 },
    { time: '23:59', 'Paid/Ads': 35, 'Organic': 62, 'Social': 120, 'KOL & Partnerships': 130, 'Events': 135, 'Others': 125 }
  ];

  // Traffic sources data
  const trafficMediumSources = [
    { source: 'Twitter', visitors: 450000, wallets: 28000, web3Users: 120000 },
    { source: 'Instagram', visitors: 380000, wallets: 18000, web3Users: 95000 },
    { source: 'LinkedIn', visitors: 290000, wallets: 14000, web3Users: 75000 },
    { source: 'Dribbble', visitors: 180000, wallets: 9000, web3Users: 45000 },
    { source: 'Behance', visitors: 120000, wallets: 5500, web3Users: 32000 },
    { source: 'Pinterest', visitors: 90000, wallets: 4200, web3Users: 25000 }
  ];

  // Updated colors to match the image
  const webUsersColors = {
    'Paid/Ads': '#4285F4',
    'Organic': '#EA4335',
    'Social': '#FBBC05',
    'KOL & Partnerships': '#34A853',
    'Events': '#0F9D58',
    'Others': '#00BCD4'
  };

  // Helper function to format numbers
  const formatNumber = (num) => {
    return num >= 1000000 
      ? `${(num / 1000000).toFixed(1)}M` 
      : num >= 1000 
        ? `${(num / 1000).toFixed(1)}K` 
        : num;
  };

  // Custom tooltip for the scatter plot
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-md rounded text-xs md:text-sm">
          <p className="font-semibold">{data.source}</p>
          <p>Engagement: {data.engagement} mins</p>
          <p>Conversion: {data.conversion}%</p>
        </div>
      );
    }
    return null;
  };

  // For responsive chart rendering
  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
          {payload.name}
        </text>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none"/>
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none"/>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`Value: ${value}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
          {`(${(percent * 100).toFixed(2)}%)`}
        </text>
      </g>
    );
  };

  return (
    <div className="p-2 md:p-4 max-w-full overflow-hidden">
      {/* Metrics Row */}
      <h1 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">TrafficAnalytics</h1>
      
      {/* Responsive grid for metrics - changes to 2 columns on small screens */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        <MetricCard title="Total Sessions" value="10,000,000" source="LinkedIn" />
        <MetricCard title="Web3 Users" value="10,000,000" source="LinkedIn" />
        <MetricCard title="Wallets Connected" value="10,000,000" source="LinkedIn" />
        <div className="col-span-2 md:col-span-1 bg-white rounded-lg shadow p-2 md:p-4">
          <div className="text-xs md:text-sm text-gray-500 mb-1">Least effective source</div>
          <div className="flex items-center justify-center h-12 md:h-24">
            <span className="text-lg md:text-xl font-bold">LinkedIn</span>
          </div>
        </div>
        <MetricCard title="Avg Conversions" value="40.53%" source="LinkedIn" />
        <MetricCard title="Avg Bounce Rate" value="60.43%" source="LinkedIn" />
      </div>

      {/* Attribution Journey + Traffic Medium Sources - goes to full width on small screens */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 md:mb-6">
        <div className="col-span-1 md:col-span-2 bg-white rounded-lg shadow">
          <AttributionJourneySankey/>
        </div>
        <div className="col-span-1 bg-white rounded-lg shadow p-1 md:p-2">
          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4 px-2">Traffic medium/sources</h3>
          <div className="overflow-auto max-h-48 md:max-h-96">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-1 md:px-2 py-1 md:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-1 md:px-2 py-1 md:py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Visitors</th>
                  <th className="px-1 md:px-2 py-1 md:py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Web3 Users</th>
                  <th className="px-1 md:px-2 py-1 md:py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Wallets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trafficMediumSources.map((source, idx) => (
                  <tr key={idx}>
                    <td className="px-1 md:px-2 py-1 md:py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="h-2 w-2 rounded-full bg-blue-500 mr-1 md:mr-2"></span>
                        <span className="text-xs md:text-sm">{source.source}</span>
                      </div>
                    </td>
                    <td className="px-1 md:px-2 py-1 md:py-2 whitespace-nowrap text-right text-xs md:text-sm text-gray-500">
                      {formatNumber(source.visitors)}
                    </td>
                    <td className="px-1 md:px-2 py-1 md:py-2 whitespace-nowrap text-right text-xs md:text-sm text-gray-500 hidden sm:table-cell">
                      {formatNumber(source.web3Users)}
                    </td>
                    <td className="px-1 md:px-2 py-1 md:py-2 whitespace-nowrap text-right text-xs md:text-sm text-gray-500 hidden md:table-cell">
                      {formatNumber(source.wallets)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Traffic Quality + Web3 Users by Medium - goes to full width on small screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-2 md:p-4">
          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4">Traffic Quality Analysis</h3>
          <div className="text-center text-xs md:text-sm text-gray-600 mb-1 md:mb-2">Value-Per-Traffic-Source</div>
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
                    value: 'Engagement (mins)', 
                    position: 'bottom',
                    offset: 0,
                    style: { fontSize: '0.75rem' }
                  }}
                  domain={[0, 11]}
                  tickCount={6}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="conversion" 
                  name="Conversion" 
                  label={{ 
                    value: 'Conversion (%)', 
                    angle: -90, 
                    position: 'left',
                    style: { fontSize: '0.75rem' }
                  }}
                  domain={[0, 55]}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
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
        </div>
        <div className="bg-white rounded-lg shadow p-2 md:p-4">
          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4">Web3 Users by Medium</h3>
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
                  domain={[0, 200]} 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip wrapperStyle={{ fontSize: '0.75rem' }} />
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
    </div>
  );
};

export default TrafficAnalytics;
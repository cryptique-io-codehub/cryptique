import React, { useState, useEffect } from 'react';

const AnalyticsChart = ({ analytics, setAnalytics, isLoading, error }) => {
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);
  const [chartData, setChartData] = useState(null);

  // Initialize empty chart data on component mount to ensure we always show something
  useEffect(() => {
    createEmptyChartData();
  }, []);

  // Process analytics data whenever it changes
  useEffect(() => {
    if (analytics && analytics.hourlyStats && analytics.hourlyStats.analyticsSnapshot 
        && analytics.hourlyStats.analyticsSnapshot.length > 0) {
      processAnalyticsData();
    } else {
      createEmptyChartData();
    }
  }, [analytics]);

  // Create empty chart data with zero values
  const createEmptyChartData = () => {
    const visitors = Array(24).fill(0);
    const wallets = Array(24).fill(0);
    const timeLabels = Array(24).fill().map((_, i) => `${i.toString().padStart(2, '0')}:00`);
    const dataPoints = Array(24).fill().map((_, i) => ({
      time: timeLabels[i],
      visitors: 0,
      wallets: 0,
      absoluteVisitors: 0,
      absoluteWallets: 0
    }));

    setChartData({
      datasets: {
        visitors: visitors,
        wallets: wallets,
        absoluteVisitors: Array(24).fill(0),
        absoluteWallets: Array(24).fill(0)
      },
      timeLabels: timeLabels,
      dataPoints: dataPoints
    });
  };

  const processAnalyticsData = () => {
    try {
      // Extract and format hourly stats from the data structure
      const hourlySnapshotData = analytics.hourlyStats.analyticsSnapshot.map(snapshot => ({
        timeStamp: snapshot.hour,
        stats: {
          totalVisitors: snapshot.analyticsId.totalVisitors || 0,
          walletsConnected: snapshot.analyticsId.walletsConnected || 0
        }
      }));
      
      // Sort hourlyStats by timestamp to ensure chronological order
      const sortedStats = [...hourlySnapshotData].sort((a, b) => 
        new Date(a.timeStamp) - new Date(b.timeStamp)
      );

      // Extract actual timestamps as labels
      const actualTimeLabels = sortedStats.map(stat => {
        const date = new Date(stat.timeStamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      });

      // Get absolute values for visitors and wallets
      const absoluteVisitors = sortedStats.map(stat => stat.stats.totalVisitors || 0);
      const absoluteWallets = sortedStats.map(stat => stat.stats.walletsConnected || 0);
      
      // Calculate new visitors and wallets (differences)
      const visitors = [];
      const wallets = [];
      
      // First timestamp: new visitors and wallets are zero
      visitors.push(0);
      wallets.push(0);
      
      // Subsequent timestamps: calculate difference from previous
      for (let i = 1; i < sortedStats.length; i++) {
        visitors.push(Math.max(0, absoluteVisitors[i] - absoluteVisitors[i-1]));
        wallets.push(Math.max(0, absoluteWallets[i] - absoluteWallets[i-1]));
      }
      
      // Create dataPoints array with the actual data
      const dataPoints = sortedStats.map((stat, i) => ({
        time: actualTimeLabels[i],
        visitors: visitors[i],
        wallets: wallets[i],
        absoluteVisitors: absoluteVisitors[i],
        absoluteWallets: absoluteWallets[i],
        timestamp: new Date(stat.timeStamp)
      }));

      // Create chart data object
      const processedChartData = {
        datasets: {
          visitors: visitors,
          wallets: wallets,
          absoluteVisitors: absoluteVisitors,
          absoluteWallets: absoluteWallets
        },
        timeLabels: actualTimeLabels,
        dataPoints: dataPoints
      };

      setChartData(processedChartData);
    } catch (error) {
      console.error('Error processing analytics data:', error);
      createEmptyChartData();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-2xl mt-4 w-full">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-2xl mt-4 w-full">
        <div className="h-64 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  // Calculate max values for scaling
  const maxVisitors = chartData?.datasets.visitors.length > 0 ? Math.max(...chartData.datasets.visitors, 1) : 1;
  const maxWallets = chartData?.datasets.wallets.length > 0 ? Math.max(...chartData.datasets.wallets, 1) : 1;
  const overallMax = Math.max(maxVisitors, maxWallets);
  
  // Generate Y-axis with dynamic values based on data
  const yAxisMax = Math.max(5, Math.ceil(overallMax * 1.2)); // At least 5 for empty data
  const yAxisSteps = 5; // Number of steps on Y-axis
  const yAxisValues = Array(yAxisSteps).fill().map((_, i) => 
    Math.round((yAxisMax / (yAxisSteps - 1)) * i)
  ).reverse(); // Reverse to start from top

  // Calculate positions for both SVG paths and point markers
  const calculatePoints = (data, dataPointCount) => {
    if (!data || data.length === 0) return [];
    
    return data.map((value, index) => {
      // Calculate x position based on index divided by total points
      const x = (index / (dataPointCount - 1)) * 100; // Percentage of width
      const y = 100 - (value / yAxisMax) * 100; // Percentage of height from top
      return { x, y, value };
    });
  };
  
  const dataPointCount = chartData?.datasets.visitors.length || 0;
  const visitorPoints = chartData ? calculatePoints(chartData.datasets.visitors, dataPointCount) : [];
  const walletPoints = chartData ? calculatePoints(chartData.datasets.wallets, dataPointCount) : [];

  // Generate SVG area path
  const generateAreaPath = (points) => {
    if (!points || points.length === 0) return '';
    
    // Start at the bottom left
    let path = `M0,100`;
    
    // Add the first data point
    path += ` L${points[0].x},${points[0].y}`;
    
    // Add the lines between points
    for (let i = 1; i < points.length; i++) {
      path += ` L${points[i].x},${points[i].y}`;
    }
    
    // Close the path by going to the bottom right and then bottom left
    path += ` L100,100 Z`;
    
    return path;
  };

  // Generate SVG line path
  const generateLinePath = (points) => {
    if (!points || points.length === 0) return '';
    
    // Start at the first point
    let path = `M${points[0].x},${points[0].y}`;
    
    // Add lines to each subsequent point
    for (let i = 1; i < points.length; i++) {
      path += ` L${points[i].x},${points[i].y}`;
    }
    
    return path;
  };

  // Handle data point selection or hover
  const handleDataPointClick = (dataPoint) => {
    setSelectedDataPoint(dataPoint);
  };

  // Show a tooltip when hovering over the chart area
  const handleChartHover = (e) => {
    if (!chartData || !chartData.dataPoints || chartData.dataPoints.length === 0) return;
    
    // Get mouse position relative to chart container
    const chartRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - chartRect.left;
    const chartWidth = chartRect.width;
    
    // Calculate which data point this corresponds to
    const index = Math.min(
      Math.floor((mouseX / chartWidth) * chartData.dataPoints.length),
      chartData.dataPoints.length - 1
    );
    
    // Set the selected data point
    setSelectedDataPoint(chartData.dataPoints[index]);
  };

  return (
    <div className="bg-white p-4 rounded-2xl mt-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-300 mr-2"></div>
            <span className="text-xs">Visitors count</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-purple-600 mr-2"></div>
            <span className="text-xs">Wallets count</span>
          </div>
        </div>
      </div>
      
      <div className="h-64 relative flex">
        {/* Y-axis labels */}
        <div className="w-10 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
          {yAxisValues.map((value, index) => (
            <div key={index} className="flex items-center justify-end">
              {value}
            </div>
          ))}
        </div>
        
        {/* Chart area */}
        <div className="flex-1 relative" 
             onMouseMove={handleChartHover} 
             onMouseLeave={() => setSelectedDataPoint(null)}>
          
          {/* Data point tooltip */}
          {selectedDataPoint && (
            <div className="absolute top-0 right-0 bg-white p-2 rounded-lg shadow-md border text-xs z-10">
              <div className="font-semibold">{selectedDataPoint.time}</div>
              <div>New visitors: <span className="font-medium">{selectedDataPoint.visitors}</span></div>
              <div>New wallets: <span className="font-medium">{selectedDataPoint.wallets}</span></div>
              <div className="mt-1 pt-1 border-t border-gray-200">
                <div>Total visitors: <span className="font-medium">{selectedDataPoint.absoluteVisitors}</span></div>
                <div>Total wallets: <span className="font-medium">{selectedDataPoint.absoluteWallets}</span></div>
              </div>
            </div>
          )}
          
          {/* Chart with horizontal grid lines */}
          <div className="h-full w-full bg-white rounded-lg relative">
            {/* SVG chart with percentages for responsive scaling */}
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Horizontal grid lines */}
              <g className="grid-lines">
                {yAxisValues.map((_, index) => {
                  const y = (index / (yAxisValues.length - 1)) * 100;
                  return (
                    <line 
                      key={index} 
                      x1="0" 
                      y1={y} 
                      x2="100" 
                      y2={y} 
                      stroke="#f0f0f0" 
                      strokeWidth="0.5" 
                    />
                  );
                })}
              </g>
              
              {/* Vertical grid lines for data points */}
              <g className="grid-lines">
                {chartData && chartData.timeLabels && chartData.timeLabels.map((_, index) => {
                  if (chartData.timeLabels.length <= 1) return null;
                  const x = (index / (chartData.timeLabels.length - 1)) * 100;
                  return (
                    <line 
                      key={index} 
                      x1={x} 
                      y1="0" 
                      x2={x} 
                      y2="100" 
                      stroke="#f0f0f0" 
                      strokeWidth="0.5" 
                    />
                  );
                })}
              </g>
              
              {/* X-axis line */}
              <line 
                x1="0" 
                y1="100" 
                x2="100" 
                y2="100" 
                stroke="#e5e7eb" 
                strokeWidth="1" 
              />
              
              {/* Visitors area (yellow) */}
              <path 
                d={generateAreaPath(visitorPoints)}
                fill="rgba(252, 211, 77, 0.5)" 
                stroke="none"
              />
              
              {/* Wallets area (purple) */}
              <path 
                d={generateAreaPath(walletPoints)}
                fill="rgba(124, 58, 237, 0.7)" 
                stroke="none"
              />
              
              {/* Visitors line */}
              <path 
                d={generateLinePath(visitorPoints)}
                fill="none"
                stroke="#f6d667"
                strokeWidth="0.7"
                strokeLinejoin="round"
              />
              
              {/* Wallets line */}
              <path 
                d={generateLinePath(walletPoints)}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="0.7"
                strokeLinejoin="round"
              />
              
              {/* Data point markers */}
              {visitorPoints.map((point, index) => (
                <circle
                  key={`visitor-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="0.8"
                  fill={selectedDataPoint === (chartData?.dataPoints?.[index] || null) ? "#eab308" : "#fcd34d"}
                  stroke={selectedDataPoint === (chartData?.dataPoints?.[index] || null) ? "#fef3c7" : "none"}
                  strokeWidth="0.3"
                  className="cursor-pointer"
                  onClick={() => handleDataPointClick(chartData?.dataPoints?.[index])}
                />
              ))}
              
              {walletPoints.map((point, index) => (
                <circle
                  key={`wallet-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="0.8"
                  fill={selectedDataPoint === (chartData?.dataPoints?.[index] || null) ? "#7c3aed" : "#8b5cf6"}
                  stroke={selectedDataPoint === (chartData?.dataPoints?.[index] || null) ? "#ede9fe" : "none"}
                  strokeWidth="0.3"
                  className="cursor-pointer"
                  onClick={() => handleDataPointClick(chartData?.dataPoints?.[index])}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
      
      {/* X-axis time labels */}
      <div className="mt-2 flex justify-between text-xs text-gray-500 px-10">
        {chartData && chartData.timeLabels.map((label, index) => {
          // Show labels distributed across the chart
          if (chartData.timeLabels.length <= 7 || index % Math.ceil(chartData.timeLabels.length / 7) === 0) {
            return <span key={index}>{label}</span>;
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default AnalyticsChart;
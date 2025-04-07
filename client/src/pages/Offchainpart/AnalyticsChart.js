import React, { useState, useEffect } from 'react';

const AnalyticsChart = ({ analytics, setAnalytics, isLoading, error }) => {
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (analytics && analytics.hourlyStats && analytics.hourlyStats.length > 0) {
      processAnalyticsData();
    }
  }, [analytics]);

  const processAnalyticsData = () => {
    // Initialize arrays for 24 hours
    const visitors = Array(24).fill(0);
    const wallets = Array(24).fill(0);
    const timeLabels = [];
    const dataPoints = [];

    // Sort hourlyStats by timestamp to ensure chronological order
    const sortedStats = [...analytics.hourlyStats].sort((a, b) => 
      new Date(a.timeStamp) - new Date(b.timeStamp)
    );

    // Track previous values for calculating differences
    let prevVisitors = 0;
    let prevWallets = 0;

    // Process each hourly stat
    sortedStats.forEach((hourStat, index) => {
      const timestamp = new Date(hourStat.timeStamp);
      const hour = timestamp.getHours();
      
      // Get current values
      const currentVisitors = hourStat.stats.totalVisitors || 0;
      const currentWallets = hourStat.stats.walletsConnected || 0;
      
      // Calculate the difference from previous values
      // For the first entry, the difference is the value itself
      const visitorsDiff = index === 0 ? currentVisitors : currentVisitors - prevVisitors;
      const walletsDiff = index === 0 ? currentWallets : currentWallets - prevWallets;
      
      // Update the arrays at the corresponding hour
      visitors[hour] = visitorsDiff;
      wallets[hour] = walletsDiff;
      
      // Update previous values for next iteration
      prevVisitors = currentVisitors;
      prevWallets = currentWallets;
      
      // Format time label (e.g., "9:00")
      const formattedHour = hour.toString().padStart(2, '0');
      timeLabels[hour] = `${formattedHour}:00`;
      
      // Create datapoint for this hour
      dataPoints[hour] = {
        time: timeLabels[hour],
        visitors: visitorsDiff,
        wallets: walletsDiff
      };
    });

    // Fill in missing time labels
    for (let i = 0; i < 24; i++) {
      if (!timeLabels[i]) {
        const formattedHour = i.toString().padStart(2, '0');
        timeLabels[i] = `${formattedHour}:00`;
        
        // Ensure dataPoints is populated for all hours
        if (!dataPoints[i]) {
          dataPoints[i] = {
            time: timeLabels[i],
            visitors: 0,
            wallets: 0
          };
        }
      }
    }

    // Create chart data object
    const processedChartData = {
      datasets: {
        visitors: visitors,
        wallets: wallets
      },
      timeLabels: timeLabels,
      dataPoints: dataPoints
    };

    setChartData(processedChartData);
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

  if (!chartData) {
    return (
      <div className="bg-white p-4 rounded-2xl mt-4 w-full">
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">No data available</div>
        </div>
      </div>
    );
  }

  // Calculate max values for scaling
  const maxVisitors = Math.max(...chartData.datasets.visitors);
  const maxWallets = Math.max(...chartData.datasets.wallets);
  const overallMax = Math.max(maxVisitors, maxWallets);
  const scalingFactor = 1.2; // Add some padding at the top
  const maxValue = overallMax * scalingFactor || 1; // Prevent division by zero
  
  // Calculate positions for both SVG paths and point markers
  const calculatePoints = (data) => {
    return data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100; // Percentage of width
      const y = 100 - (value / maxValue) * 100; // Percentage of height from top
      return { x, y, value };
    });
  };
  
  const visitorPoints = calculatePoints(chartData.datasets.visitors);
  const walletPoints = calculatePoints(chartData.datasets.wallets);

  // Generate SVG area path
  const generateAreaPath = (points) => {
    if (points.length === 0) return '';
    
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
    if (points.length === 0) return '';
    
    // Start at the first point
    let path = `M${points[0].x},${points[0].y}`;
    
    // Add lines to each subsequent point
    for (let i = 1; i < points.length; i++) {
      path += ` L${points[i].x},${points[i].y}`;
    }
    
    return path;
  };

  // Handle data point selection
  const handleDataPointClick = (dataPoint, index) => {
    setSelectedDataPoint(dataPoint);
  };

  // Display only a subset of hours to avoid crowding
  const displayLabels = chartData.timeLabels.filter((_, index) => index % 4 === 0);

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
      
      <div className="h-64 relative">
        {/* Data point tooltip */}
        {selectedDataPoint && (
          <div className="absolute top-0 right-0 bg-white p-2 rounded-lg shadow-sm border text-xs z-10">
            <div className="font-semibold">{selectedDataPoint.time}</div>
            <div>Visitors count: <span className="font-medium">{selectedDataPoint.visitors}</span></div>
            <div>Wallet count: <span className="font-medium">{selectedDataPoint.wallets}</span></div>
          </div>
        )}
        
        {/* Area chart */}
        <div className="h-full w-full bg-white rounded-lg relative">
          {/* SVG chart with percentages for responsive scaling */}
          <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Horizontal grid lines */}
            <g className="grid-lines">
              {[0, 25, 50, 75, 100].map((y) => (
                <line 
                  key={y} 
                  x1="0" 
                  y1={y} 
                  x2="100" 
                  y2={y} 
                  stroke="#f0f0f0" 
                  strokeWidth="0.5" 
                />
              ))}
            </g>
            
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
            
            {/* Data point markers - drawn directly in SVG for perfect alignment */}
            {visitorPoints.map((point, index) => (
              <circle
                key={`visitor-${index}`}
                cx={point.x}
                cy={point.y}
                r="0.8"
                fill={selectedDataPoint === chartData.dataPoints[index] ? "#eab308" : "#fcd34d"}
                stroke={selectedDataPoint === chartData.dataPoints[index] ? "#fef3c7" : "none"}
                strokeWidth="0.3"
                className="cursor-pointer"
                onClick={() => handleDataPointClick(chartData.dataPoints[index], index)}
              />
            ))}
            
            {walletPoints.map((point, index) => (
              <circle
                key={`wallet-${index}`}
                cx={point.x}
                cy={point.y}
                r="0.8"
                fill={selectedDataPoint === chartData.dataPoints[index] ? "#7c3aed" : "#8b5cf6"}
                stroke={selectedDataPoint === chartData.dataPoints[index] ? "#ede9fe" : "none"}
                strokeWidth="0.3"
                className="cursor-pointer"
                onClick={() => handleDataPointClick(chartData.dataPoints[index], index)}
              />
            ))}
          </svg>
          
          {/* Time labels - only show every 4 hours to avoid crowding */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-2">
            {displayLabels.map((time, index) => (
              <span key={index}>{time}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsChart;
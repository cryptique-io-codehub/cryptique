import React, { useState, useEffect } from 'react';

const AnalyticsChart = ({ chartData, selectedDataPoint, setSelectedDataPoint, isLoading, error }) => {
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

  // Generate SVG path for smooth curve
  const generateCurvePath = (data, maxValue, height, width) => {
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (value / maxValue) * height;
      return `${x},${y}`;
    });
    
    // Generate a smooth curve using bezier curves
    let path = `M0,${height}`;
    
    // Add the first point
    path += ` L0,${height - (data[0] / maxValue) * height}`;
    
    // Add the curves
    for (let i = 0; i < points.length; i++) {
      path += ` L${points[i]}`;
    }
    
    // Close the path
    path += ` L${width},${height} L0,${height}`;
    
    return path;
  };

  // Calculate max values for scaling
  const maxVisitors = Math.max(...chartData.datasets.visitors);
  const maxWallets = Math.max(...chartData.datasets.wallets);
  const overallMax = Math.max(maxVisitors, maxWallets);

  // Handle data point selection
  const handleDataPointClick = (dataPoint, index) => {
    setSelectedDataPoint(dataPoint);
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
      
      <div className="h-64 relative">
        {/* Data point tooltip */}
        {selectedDataPoint && (
          <div className="absolute top-0 right-16 bg-white p-2 rounded-lg shadow-sm border text-xs z-10">
            <div className="font-semibold">{selectedDataPoint.time}</div>
            <div>Visitors count: <span className="font-medium">{selectedDataPoint.visitors}</span></div>
            <div>Wallet count: <span className="font-medium">{selectedDataPoint.wallets}</span></div>
          </div>
        )}
        
        {/* Area chart */}
        <div className="h-full w-full bg-white rounded-lg relative overflow-hidden">
          {/* Chart visualization */}
          <svg className="w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
            {/* Horizontal grid lines */}
            <g className="grid-lines">
              {[0, 1, 2, 3, 4].map((i) => (
                <line 
                  key={i} 
                  x1="0" 
                  y1={80 + i * 60} 
                  x2="800" 
                  y2={80 + i * 60} 
                  stroke="#f0f0f0" 
                  strokeWidth="1" 
                />
              ))}
            </g>
            
            {/* Visitors area (yellow) */}
            <path 
              d={generateCurvePath(chartData.datasets.visitors, overallMax * 1.2, 320, 800)}
              fill="rgba(252, 211, 77, 0.5)" 
              stroke="none"
            />
            
            {/* Wallets area (purple) */}
            <path 
              d={generateCurvePath(chartData.datasets.wallets, overallMax * 1.2, 320, 800)}
              fill="rgba(124, 58, 237, 0.7)" 
              stroke="none"
            />
            
            {/* Visitors line */}
            <path 
              d={generateCurvePath(chartData.datasets.visitors, overallMax * 1.2, 320, 800).split('L0,320')[0]}
              fill="none"
              stroke="#f6d667"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            
            {/* Wallets line */}
            <path 
              d={generateCurvePath(chartData.datasets.wallets, overallMax * 1.2, 320, 800).split('L800,320')[0]}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          
          {/* Data point markers */}
          <div className="absolute inset-0 flex justify-between items-end px-2 pt-8 pb-8">
            {chartData.dataPoints.map((point, index) => {
              const visitorHeight = (point.visitors / (overallMax * 1.2)) * 280;
              const walletHeight = (point.wallets / (overallMax * 1.2)) * 280;
              
              return (
                <div key={index} className="relative flex flex-col items-center">
                  {/* Visitor point */}
                  <button 
                    className={`w-3 h-3 rounded-full cursor-pointer ${
                      selectedDataPoint === point ? 'bg-yellow-400 ring-2 ring-yellow-200' : 'bg-yellow-300'
                    }`}
                    onClick={() => handleDataPointClick(point, index)}
                    style={{ 
                      marginBottom: `${visitorHeight}px` 
                    }}
                  />
                  
                  {/* Wallet point (positioned below) */}
                  <button 
                    className={`w-3 h-3 rounded-full cursor-pointer absolute ${
                      selectedDataPoint === point ? 'bg-purple-600 ring-2 ring-purple-200' : 'bg-purple-500'
                    }`}
                    onClick={() => handleDataPointClick(point, index)}
                    style={{ 
                      bottom: `${walletHeight}px` 
                    }}
                  />
                </div>
              );
            })}
          </div>
          
          {/* Time labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-2">
            {chartData.timeLabels.map((time, index) => (
              <span key={index}>{time}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsChart;
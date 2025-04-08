import React, { useState, useEffect } from 'react';

const TrafficSourcesComponent = ({ setanalytics, analytics }) => {
  const [selectedMonth, setSelectedMonth] = useState('This Month');
  const [processedData, setProcessedData] = useState({});
  const [allSources, setAllSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reset state when analytics changes
    setError(null);
    setIsLoading(true);

    try {
      if (analytics && Array.isArray(analytics.sessions)) {
        // Process analytics data
        const result = processAnalytics(analytics);
        setProcessedData(result);
        
        // Get all sources by visitors, sorted by visitor count
        const sortedSources = Object.entries(result)
          .map(([source, data]) => ({
            source: source || 'Direct', // Add fallback for empty sources
            visitors: data?.visitors || 0,
            web3users: data?.web3users || 0,
            walletsConnected: data?.walletsConnected || 0
          }))
          .sort((a, b) => b.visitors - a.visitors);
        
        setAllSources(sortedSources);
      } else {
        // Handle case where analytics or sessions is undefined
        setAllSources([]);
        setProcessedData({});
      }
    } catch (err) {
      console.error("Error processing analytics data:", err);
      setError("Failed to process analytics data");
      setAllSources([]);
    } finally {
      setIsLoading(false);
    }
  }, [analytics, selectedMonth]);

  // Function to normalize source URLs and domains
  function normalizeSource(source) {
    if (!source || typeof source !== 'string' || source.trim() === '') {
      return 'Direct';
    }
    
    const sourceStr = source.trim();
    
    // Domain mapping for known redirects and variations
    const domainMapping = {
      'l.instagram.com': 'Instagram',
      'lm.instagram.com': 'Instagram',
      'l.facebook.com': 'Facebook',
      'lm.facebook.com': 'Facebook',
      't.co': 'Twitter',
      'x.com': 'Twitter'
    };
    
    try {
      let hostname;
      
      if (sourceStr.includes('://')) {
        // Full URL with protocol
        const url = new URL(sourceStr);
        hostname = url.hostname;
      } else if (sourceStr.includes('.')) {
        // Domain without protocol
        hostname = sourceStr.split('/')[0];
      } else {
        // Not a URL or domain
        return sourceStr;
      }
      
      // Remove www. prefix
      hostname = hostname.replace(/^www\./, '');
      
      // Check if it's a known redirect domain
      if (domainMapping[hostname]) {
        return domainMapping[hostname];
      }
      
      return hostname;
    } catch (e) {
      // If URL parsing fails, return the original source
      return sourceStr;
    }
  }

  function processAnalytics(analytics) {
    if (!analytics || !Array.isArray(analytics.sessions)) {
      return {};
    }

    const resultMap = new Map();
    
    for (const session of analytics.sessions) {
      // Skip if session is undefined or null
      if (!session) continue;
      
      let source = 'Direct'; // Default to 'Direct' instead of empty string
      
      // Safely access nested properties
      if (session.utmData && typeof session.utmData === 'object' && 
          session.utmData.source && session.utmData.source !== '') {
        source = normalizeSource(session.utmData.source);
      }
      else if (session.referrer && typeof session.referrer === 'string' && session.referrer !== '') {
        source = normalizeSource(session.referrer);  
      }
      
      // Ensure source is a string
      if (typeof source !== 'string') {
        source = 'Direct';
      }
      
      if (!resultMap.has(source)) {
        resultMap.set(source, {
          visitors: new Set(),
          web3users: new Set(),
          walletsConnected: new Set()
        });
      }
      
      // Only add userId if it exists and is a valid string/number
      if (session.userId && (typeof session.userId === 'string' || typeof session.userId === 'number')) {
        resultMap.get(source).visitors.add(String(session.userId));
      }
      
      // Safely check wallet properties
      const hasWallet = session.wallet && typeof session.wallet === 'object';
      const walletType = hasWallet && session.wallet.walletType ? session.wallet.walletType : null;
      const walletAddress = hasWallet && session.wallet.walletAddress ? session.wallet.walletAddress : null;
      
      if (session.userId && walletType && walletType !== 'No Wallet Detected') {
        resultMap.get(source).web3users.add(String(session.userId));
      }
      
      if (session.userId && walletAddress && walletAddress !== '') {
        resultMap.get(source).walletsConnected.add(String(session.userId));
      }
    }
    
    const finalResult = {};
    for (const [source, data] of resultMap.entries()) {
      finalResult[source] = {
        visitors: data.visitors.size,
        web3users: data.web3users.size,
        walletsConnected: data.walletsConnected.size
      };
    }
    
    return finalResult;
  }
  
  // Function to format source name for display
  const formatSourceName = (source) => {
    if (source === null || source === undefined || source === '') {
      return 'Direct';
    }
    
    // Capitalize first letter for better display
    return source.charAt(0).toUpperCase() + source.slice(1);
  };
  
  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    // In a real app, you would filter analytics data based on month selection
  };
  
  // Safe number formatting
  const formatNumber = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    try {
      return num.toLocaleString();
    } catch (e) {
      return num.toString();
    }
  };

  if (error) {
    return (
      <div className="mt-1 pt-4 border-t bg-white rounded-lg shadow p-4">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }
  
  return (
    <div className="mt-1 pt-4 border-t bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold pl-3">Traffic sources</h3>
        <div className="relative">
          <select 
            className="text-sm bg-gray-50 border border-gray-200 rounded-md px-2 py-1 pr-8 appearance-none"
            value={selectedMonth}
            onChange={handleMonthChange}
            disabled={isLoading}
          >
            <option>This Month</option>
            <option>Last Month</option>
            <option>Last 3 Months</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-4 bg-gray-100 p-3 pl-3 text-sm font-medium text-gray-600 sticky top-0">
          <div>Traffic source</div>
          <div className="text-right">Visitors</div>
          <div className="text-right">Web3 Users</div>
          <div className="text-right">Wallets Connected</div>
        </div>
        
        {/* Table rows - scrollable container */}
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading data...</div>
          ) : (
            <div className="divide-y divide-dashed divide-blue-200 border-t border-b border-blue-200">
              {allSources.length > 0 ? (
                allSources.map((source, index) => (
                  <div key={index} className="grid grid-cols-4 p-3 text-sm hover:bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <span className="truncate">{formatSourceName(source.source)}</span>
                    </div>
                    <div className="text-right">{formatNumber(source.visitors)}</div>
                    <div className="text-right">{formatNumber(source.web3users)}</div>
                    <div className="text-right">{formatNumber(source.walletsConnected)}</div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No data available</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrafficSourcesComponent;
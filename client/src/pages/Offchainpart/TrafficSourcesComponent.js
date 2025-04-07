import React, { useState, useEffect } from 'react';

const TrafficSourcesComponent = ({ setanalytics, analytics }) => {
  const [selectedMonth, setSelectedMonth] = useState('This Month');
  const [processedData, setProcessedData] = useState({});
  const [allSources, setAllSources] = useState([]);

  useEffect(() => {
    if (analytics && analytics.sessions) {
      // Process analytics data
      const result = processAnalytics(analytics);
      setProcessedData(result);
      
      // Get all sources by visitors, sorted by visitor count
      const sortedSources = Object.entries(result)
        .map(([source, data]) => ({
          source: source,
          visitors: data.visitors,
          web3users: data.web3users,
          walletsConnected: data.walletsConnected
        }))
        .sort((a, b) => b.visitors - a.visitors);
      
      setAllSources(sortedSources);
    }
  }, [analytics, selectedMonth]);

  function processAnalytics(analytics) {
    const resultMap = new Map();
    
    for (const session of analytics.sessions) {
      let source = '';
      if (session.utmData.source !== '') {
        source = session.utmData.source;
      }
      else {
        source = session.referrer;  
      }
      
      if (!resultMap.has(source)) {
        resultMap.set(source, {
          visitors: new Set(),
          web3users: new Set(),
          walletsConnected: new Set()
        });
      }
      
      if (session.userId) {
        resultMap.get(source).visitors.add(session.userId);
      }
      
      if (session.wallet && session.wallet.walletType !== 'No Wallet Detected' && session.userId) {
        resultMap.get(source).web3users.add(session.userId);
      }
      
      if (session.wallet && session.wallet.walletAddress !== '' && session.userId) {
        resultMap.get(source).walletsConnected.add(session.userId);
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
    // Handle URLs
    try {
      if (source.startsWith('http')) {
        const url = new URL(source);
        return url.hostname.replace('www.', '');
      }
    } catch {}
    
    // Default: return the source with first letter capitalized
    return source.charAt(0).toUpperCase() + source.slice(1);
  };
  
  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    // In a real app, you would filter analytics data based on month selection
  };
  
  return (
    <div className="mt-1 pt-4 border-t bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold pl-3">Traffic sources</h3>
        <div className="relative">
          <select 
            className="text-sm bg-gray-50 border border-gray-200 rounded-md px-2 py-1 pr-8 appearance-none"
            value={selectedMonth}
            onChange={handleMonthChange}
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
          <div className="divide-y divide-dashed divide-blue-200 border-t border-b border-blue-200">
            {allSources.length > 0 ? (
              allSources.map((source, index) => (
                <div key={index} className="grid grid-cols-4 p-3 text-sm hover:bg-gray-100">
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{formatSourceName(source.source)}</span>
                  </div>
                  <div className="text-right">{source.visitors.toLocaleString()}</div>
                  <div className="text-right">{source.web3users.toLocaleString()}</div>
                  <div className="text-right">{source.walletsConnected.toLocaleString()}</div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficSourcesComponent;
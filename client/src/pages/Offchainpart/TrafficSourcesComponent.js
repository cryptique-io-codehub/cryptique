import React, { useState, useEffect } from 'react';

const TrafficSourcesComponent = ({ setanalytics, analytics, hideTitle = false }) => {
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
    
    const sourceStr = source.trim().toLowerCase();
    
    // Source mapping for common variations and case sensitivity
    const sourceMapping = {
      'facebook': 'Facebook',
      'fb': 'Facebook',
      'instagram': 'Instagram',
      'ig': 'Instagram',
      'twitter': 'Twitter',
      'x': 'Twitter',
      'linkedin': 'LinkedIn',
      'linked in': 'LinkedIn',
      'dribbble': 'Dribbble',
      'behance': 'Behance',
      'pinterest': 'Pinterest',
      'pin': 'Pinterest',
      'google': 'Google',
      'youtube': 'YouTube',
      'yt': 'YouTube',
      'reddit': 'Reddit',
      'tiktok': 'TikTok',
      'discord': 'Discord',
      'telegram': 'Telegram',
      'tg': 'Telegram',
      'medium': 'Medium',
      'github': 'GitHub',
      'git': 'GitHub'
    };
    
    // Domain mapping for known redirects and variations
    const domainMapping = {
      'l.instagram.com': 'Instagram',
      'lm.instagram.com': 'Instagram',
      'l.facebook.com': 'Facebook',
      'lm.facebook.com': 'Facebook',
      't.co': 'Twitter',
      'x.com': 'Twitter',
      'lnkd.in': 'LinkedIn',
      'dribb.com': 'Dribbble',
      'be.net': 'Behance',
      'pin.it': 'Pinterest',
      'youtu.be': 'YouTube',
      'redd.it': 'Reddit',
      'tiktok.com': 'TikTok',
      'discord.gg': 'Discord',
      't.me': 'Telegram',
      'medium.com': 'Medium',
      'github.com': 'GitHub'
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
        // Not a URL or domain, check direct source mapping
        return sourceMapping[sourceStr] || sourceStr.charAt(0).toUpperCase() + sourceStr.slice(1);
      }
      
      // Remove www. prefix
      hostname = hostname.replace(/^www\./, '');
      
      // Check if it's a known redirect domain
      if (domainMapping[hostname]) {
        return domainMapping[hostname];
      }
      
      // Check if the base domain matches any source mapping
      const baseDomain = hostname.split('.')[0];
      if (sourceMapping[baseDomain]) {
        return sourceMapping[baseDomain];
      }
      
      // If no mapping found, capitalize first letter
      return hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch (e) {
      // If URL parsing fails, check direct source mapping
      return sourceMapping[sourceStr] || sourceStr.charAt(0).toUpperCase() + sourceStr.slice(1);
    }
  }

  function processAnalytics(analytics) {
    if (!analytics || !Array.isArray(analytics.sessions)) {
      return {};
    }

    const resultMap = new Map();
    const userSourceMap = new Map(); // Track first source for each user
    
    // Sort sessions by timestamp to ensure first touchpoint is identified correctly
    const sortedSessions = [...analytics.sessions].sort((a, b) => {
      const timestampA = a?.timestamp || 0;
      const timestampB = b?.timestamp || 0;
      return timestampA - timestampB;
    });
    
    // First pass: Determine each user's first source
    for (const session of sortedSessions) {
      if (!session || !session.userId) continue;
      
      const userId = String(session.userId);
      
      // Skip if we've already identified this user's first source
      if (userSourceMap.has(userId)) continue;
      
      let source = 'Direct'; // Default
      
      // Determine source
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
      
      // Record this user's first source
      userSourceMap.set(userId, source);
      
      // Initialize source in resultMap if needed
      if (!resultMap.has(source)) {
        resultMap.set(source, {
          visitors: new Set(),
          web3users: new Set(),
          walletsConnected: new Set()
        });
      }
      
      // Count this user as a visitor for their first source
      resultMap.get(source).visitors.add(userId);
    }
    
    // Second pass: Process all sessions and attribute activities to first source only
    for (const session of sortedSessions) {
      // Skip if session is undefined or null
      if (!session) continue;
      
      // Skip if user ID is missing or invalid
      if (!session.userId || !(typeof session.userId === 'string' || typeof session.userId === 'number')) {
        continue;
      }
      
      const userId = String(session.userId);
      
      // Get the user's first source
      const userFirstSource = userSourceMap.get(userId);
      
      // Skip if we couldn't determine this user's first source
      if (!userFirstSource) continue;
      
      // Safely check wallet properties
      const hasWallet = session.wallet && typeof session.wallet === 'object';
      const walletType = hasWallet && session.wallet.walletType ? session.wallet.walletType : null;
      const walletAddress = hasWallet && session.wallet.walletAddress ? session.wallet.walletAddress : null;
      
      // Always attribute wallet activities to the user's FIRST source only
      if (walletType && walletType !== 'No Wallet Detected') {
        resultMap.get(userFirstSource).web3users.add(userId);
      }
      
      // Only count wallet as connected if it has a valid wallet address
      // Make sure wallet address is not empty and not "No Wallet Detected"
      if (walletAddress && walletAddress !== '' && walletAddress !== 'No Wallet Detected') {
        resultMap.get(userFirstSource).walletsConnected.add(userId);
      }
    }
    
    // Convert Set sizes to numbers for the final result
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
    <div className="bg-white shadow-md rounded-lg p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        {!hideTitle && <h3 className="text-lg font-semibold text-gray-800 font-montserrat text-center">Traffic Sources</h3>}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="text-sm rounded-md border-gray-300 font-poppins"
        >
          <option value="This Month">This Month</option>
          <option value="Last Month">Last Month</option>
          <option value="Last 3 Months">Last 3 Months</option>
        </select>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500 font-poppins">{error}</div>
        </div>
      ) : allSources.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 text-center font-poppins">
            <p>No traffic source data available.</p>
            <p className="mt-2 text-sm">This may be because there are no sessions recorded or all sessions have unknown sources.</p>
          </div>
        </div>
      ) : (
        <div className="w-full" style={{ maxHeight: '350px', overflowY: 'auto', overflowX: 'hidden' }}>
          <table className="w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat w-2/5">
                  Source
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat w-1/5">
                  Visitors
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat w-1/5">
                  Web3 Users
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat w-1/5">
                  Wallets
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat w-1/5">
                  Conversion
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 font-poppins">
              {allSources.map((sourceData, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 truncate">
                    {sourceData.source}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                    {formatNumber(sourceData.visitors)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                    {formatNumber(sourceData.web3users)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                    {formatNumber(sourceData.walletsConnected)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                    {sourceData.visitors > 0 
                      ? `${((sourceData.walletsConnected / sourceData.visitors) * 100).toFixed(1)}%` 
                      : '0.0%'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TrafficSourcesComponent;
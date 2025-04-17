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
      
      if (walletAddress && walletAddress !== '') {
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
    <div className="mt-1 pt-4 border-t bg-white rounded-lg shadow h-full">
      <div className="flex justify-between items-center mb-4 px-3">
        <h3 className="text-xl font-semibold">Traffic sources</h3>
        <div className="relative">
          <select
            className="text-base bg-gray-50 border border-gray-200 rounded-md px-2 py-1 pr-8 appearance-none"
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
        <div className="grid grid-cols-12 bg-gray-100 p-3 text-base font-medium text-gray-600 sticky top-0">
          <div className="col-span-4">Traffic source</div>
          <div className="col-span-2 text-right">Visitors</div>
          <div className="col-span-1"></div> {/* Empty column for spacing */}
          <div className="col-span-2 text-right">Web3 Users</div>
          <div className="col-span-3 text-right">Wallets Connected</div>
        </div>
        
        {/* Table rows - fixed height to show ~7 rows by default */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500 text-base">Loading data...</div>
          ) : (
            <div className="divide-y divide-dashed divide-blue-200 border-t border-b border-blue-200">
              {allSources.length > 0 ? (
                allSources.map((source, index) => (
                  <div key={index} className="grid grid-cols-12 p-3 text-base hover:bg-gray-100">
                    <div className="col-span-4 flex items-center">
                      <span className="truncate">{formatSourceName(source.source)}</span>
                    </div>
                    <div className="col-span-2 text-right">{formatNumber(source.visitors)}</div>
                    <div className="col-span-1"></div>
                    <div className="col-span-2 text-right">{formatNumber(source.web3users)}</div>
                    <div className="col-span-3 text-right">{formatNumber(source.walletsConnected)}</div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 text-base">No data available</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrafficSourcesComponent;
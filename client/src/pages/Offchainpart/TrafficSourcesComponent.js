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

  // Add styling elements to match on-chain
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex justify-center items-center h-48">
          <div className="text-red-500 font-poppins">{error}</div>
        </div>
      );
    }

    if (!allSources || allSources.length === 0) {
      return (
        <div className="flex justify-center items-center h-48">
          <div className="text-gray-500 font-poppins">No traffic sources data available</div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 font-montserrat">Source</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 font-montserrat">Visitors</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 font-montserrat">Web3 Users</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 font-montserrat">Wallets Connected</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 font-montserrat">Conversion</th>
            </tr>
          </thead>
          <tbody>
            {allSources.map((item, index) => {
              const walletConversionRate = item.visitors > 0 
                ? ((item.walletsConnected / item.visitors) * 100).toFixed(2) 
                : "0.00";
                
              const web3ConversionRate = item.visitors > 0 
                ? ((item.web3users / item.visitors) * 100).toFixed(2) 
                : "0.00";
                
              return (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-4 py-3 text-sm text-gray-800 font-poppins">{formatSourceName(item.source)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-800 font-poppins">{formatNumber(item.visitors)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-800 font-poppins">{formatNumber(item.web3users)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-800 font-poppins">{formatNumber(item.walletsConnected)}</td>
                  <td className="px-4 py-3 text-sm text-right font-poppins">
                    <span className={`${Number(walletConversionRate) > 5 ? 'text-green-600' : 'text-orange-500'}`}>
                      {walletConversionRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Import fonts to match on-chain components */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');
          
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Montserrat', sans-serif;
          }
          
          body, p, span, div {
            font-family: 'Poppins', sans-serif;
          }
        `}
      </style>
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800 font-montserrat">Traffic Sources</h2>
        <select
          value={selectedMonth}
          onChange={handleMonthChange}
          className="p-2 border border-gray-300 rounded-md text-sm font-poppins bg-white text-gray-700"
        >
          <option value="This Month">This Month</option>
          <option value="Last Month">Last Month</option>
          <option value="Last 3 Months">Last 3 Months</option>
          <option value="Last 6 Months">Last 6 Months</option>
          <option value="Last Year">Last Year</option>
          <option value="All Time">All Time</option>
        </select>
      </div>
      
      {renderContent()}
    </div>
  );
};

export default TrafficSourcesComponent;
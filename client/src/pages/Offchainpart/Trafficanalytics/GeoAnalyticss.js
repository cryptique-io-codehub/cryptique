import React, { useState, useEffect, useMemo } from 'react';
import GeoAnalyticsMap from '../GeoAnalyticsMap';


// Format seconds into minutes and seconds
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')} mins ${secs.toString().padStart(2, '0')} secs`;
};

// Country code to name mapping
const countryCodeToName = {
  "US": "United States",
  "IN": "India",
  "DE": "Germany",
  "BR": "Brazil",
  "CA": "Canada",
  "FR": "France",
  "GB": "United Kingdom",
  "AU": "Australia",
  "JP": "Japan",
  "KR": "South Korea",
  "CN": "China",
  "RU": "Russia",
  "IT": "Italy",
  "ES": "Spain",
  // Add more mappings as needed
};

// Function to normalize country information (handle both names and codes)
const normalizeCountry = (countryInput) => {
  if (!countryInput) return null;
  
  // If it's already a full country name we know
  if (Object.values(countryCodeToName).includes(countryInput)) {
    return countryInput;
  }
  
  // Check if it's a country code we can map
  if (countryCodeToName[countryInput]) {
    return countryCodeToName[countryInput];
  }
  
  // If we can't map it, return as is
  return countryInput;
};

// Normalize domain name for source tracking
const normalizeDomain = (domainInput) => {
  if (!domainInput) return null;
  
  // Remove www. prefix and standardize domains
  const domain = domainInput.toLowerCase()
    .replace(/^www\./, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
  
  return domain;
};

const GeoAnalytics = ({ analytics, selectedCountry, setSelectedCountry }) => {
  // Process analytics data to get country-specific metrics
  const countryMetrics = useMemo(() => {
    if (!analytics?.sessions || !Array.isArray(analytics.sessions)) {
      return {};
    }

    // Initialize metrics tracking objects
    const metrics = {};
    
    // Process each session to gather metrics
    analytics.sessions.forEach(session => {
      // Normalize the country name from whatever format it's in
      const countryName = normalizeCountry(session.country);
      
      if (!countryName) return;
      
      // Initialize country data if not exists
      if (!metrics[countryName]) {
        metrics[countryName] = {
          uniqueUsers: new Set(),
          totalSessions: 0,
          bounces: 0,
          totalPageViews: 0,
          totalDuration: 0,
          web3Users: new Set(), // Users with wallet data
          walletConnections: new Set(), // Users who connected wallet (has address)
          wallets: {},
          sourceTraffic: {}
        };
      }
      
      const { userId, duration, isBounce, pagesViewed } = session;
      
      // Add user to unique users set
      if (userId) {
        metrics[countryName].uniqueUsers.add(userId);
      }
      
      // Track sources with web3 users
      let source = '';
      if (session.source) {
        source = session.source;
      } else if (session.referer) {
        source = normalizeDomain(session.referer);
      }
      
      // Track wallet connections and types
      if (session.wallet) {
        // Check for web3 users - has wallet type and it's not "No Wallet Detected"
        if (session.wallet.walletType && session.wallet.walletType !== 'No Wallet Detected') {
          metrics[countryName].web3Users.add(userId);
          
          // Track sources for web3 users
          if (source) {
            metrics[countryName].sourceTraffic[source] = metrics[countryName].sourceTraffic[source] || {
              users: new Set(),
              web3Users: new Set()
            };
            metrics[countryName].sourceTraffic[source].web3Users.add(userId);
          }
          
          // Track wallet types
          const walletType = session.wallet.walletType;
          metrics[countryName].wallets[walletType] = metrics[countryName].wallets[walletType] || new Set();
          metrics[countryName].wallets[walletType].add(userId);
        }
        
        // Track wallet connections (has non-empty address)
        if (session.wallet.walletAddress && session.wallet.walletAddress.trim() !== '' && session.wallet.walletAddress !== 'No Wallet Detected') {
          // If wallet type is "No Wallet Detected" but has wallet address, count as web3 user too
          if (session.wallet.walletType === 'No Wallet Detected') {
            metrics[countryName].web3Users.add(userId);
          }
          
          // Count as wallet connection regardless of wallet type
          metrics[countryName].walletConnections.add(userId);
        }
      }
      
      // Track sources for all users
      if (source) {
        metrics[countryName].sourceTraffic[source] = metrics[countryName].sourceTraffic[source] || {
          users: new Set(),
          web3Users: new Set()
        };
        metrics[countryName].sourceTraffic[source].users.add(userId);
      }
      
      // Increment session count
      metrics[countryName].totalSessions++;
      
      // Track bounces
      if (isBounce) {
        metrics[countryName].bounces++;
      }
      
      // Add page views
      metrics[countryName].totalPageViews += pagesViewed || 0;
      
      // Add session duration
      metrics[countryName].totalDuration += duration || 0;
    });
    
    // Calculate aggregate metrics for each country
    const countryStats = {};
    
    Object.entries(metrics).forEach(([country, data]) => {
      // Find most common wallet
      let commonWallet = "None";
      let maxWalletCount = 0;
      
      Object.entries(data.wallets).forEach(([wallet, users]) => {
        if (users.size > maxWalletCount) {
          maxWalletCount = users.size;
          commonWallet = wallet;
        }
      });
      
      // Find best source for web3 traffic
      let bestWeb3Source = "Direct";
      let maxWeb3UserCount = 0;
      
      Object.entries(data.sourceTraffic).forEach(([source, counts]) => {
        if (counts.web3Users.size > maxWeb3UserCount) {
          maxWeb3UserCount = counts.web3Users.size;
          bestWeb3Source = source;
        }
      });
      
      countryStats[country] = {
        users: data.uniqueUsers.size,
        web3Users: data.web3Users.size,
        walletConnects: data.walletConnections.size,
        bounceRate: data.totalSessions > 0 ? 
          `${((data.bounces / data.totalSessions) * 100).toFixed(2)}%` : "0%",
        totalPageViews: data.totalPageViews.toLocaleString(),
        avgPageViewPerVisit: "1.00", // As specified
        avgVisitDuration: data.totalSessions > 0 ? 
          formatDuration(data.totalDuration / data.totalSessions) : "00 mins 00 secs",
        conversionRate: data.uniqueUsers.size > 0 ? 
          `${((data.walletConnections.size / data.uniqueUsers.size) * 100).toFixed(2)}%` : "0%",
        commonWallet: commonWallet,
        webTrafficSource: bestWeb3Source,
        retention: "12.34%" // Default as specified
      };
    });
    
    return countryStats;
  }, [analytics]);
  
  // Calculate global metrics for comparison
  const globalMetrics = useMemo(() => {
    const countries = Object.keys(countryMetrics);
    if (countries.length === 0) return null;
    
    // Find countries with max values
    let maxUsersCountry = countries[0];
    let maxWeb3UsersCountry = countries[0];
    let maxWalletConnectsCountry = countries[0];
    let maxConversionCountry = countries[0];
    let minConversionCountry = countries[0];
    let maxBounceRateCountry = countries[0];
    
    countries.forEach(country => {
      // Max users
      if (countryMetrics[country].users > countryMetrics[maxUsersCountry].users) {
        maxUsersCountry = country;
      }
      
      // Max web3 users
      if (countryMetrics[country].web3Users > countryMetrics[maxWeb3UsersCountry].web3Users) {
        maxWeb3UsersCountry = country;
      }
      
      // Max wallet connects
      if (countryMetrics[country].walletConnects > countryMetrics[maxWalletConnectsCountry].walletConnects) {
        maxWalletConnectsCountry = country;
      }
      
      // Max conversion rate
      const currentConversion = parseFloat(countryMetrics[country].conversionRate);
      const maxConversion = parseFloat(countryMetrics[maxConversionCountry].conversionRate);
      if (currentConversion > maxConversion) {
        maxConversionCountry = country;
      }
      
      // Min conversion rate
      const minConversion = parseFloat(countryMetrics[minConversionCountry].conversionRate);
      if (currentConversion < minConversion) {
        minConversionCountry = country;
      }
      
      // Max bounce rate
      const currentBounce = parseFloat(countryMetrics[country].bounceRate);
      const maxBounce = parseFloat(countryMetrics[maxBounceRateCountry].bounceRate);
      if (currentBounce > maxBounce) {
        maxBounceRateCountry = country;
      }
    });
    
    return {
      maxUsersCountry,
      maxWeb3UsersCountry,
      maxWalletConnectsCountry,
      maxConversionCountry,
      minConversionCountry,
      maxBounceRateCountry
    };
  }, [countryMetrics]);

  // Default country data if none is selected
  const [countryData, setCountryData] = useState({
    users: 0,
    web3Users: 0,
    walletConnects: 0,
    conversionRate: '0%',
    commonWallet: 'None',
    webTrafficSource: 'Direct',
    bounceRate: '0%',
    totalPageViews: '0',
    avgPageViewPerVisit: '1.00',
    avgVisitDuration: '00 mins 00 secs',
    retention: '12.34%'
  });

  // Handle country data when selection changes
  useEffect(() => {
    console.log("Selected country:", selectedCountry);
    
    // Normalize the selected country in case it's a code
    const normalizedCountry = normalizeCountry(selectedCountry);
    
    if (normalizedCountry && countryMetrics[normalizedCountry]) {
      // Data exists for this country
      console.log("Setting data for:", normalizedCountry, countryMetrics[normalizedCountry]);
      setCountryData(countryMetrics[normalizedCountry]);
    } else if (selectedCountry) {
      // No data for this country - set to default values
      console.log("No data for:", selectedCountry);
      setCountryData({
        users: 0,
        web3Users: 0,
        walletConnects: 0,
        conversionRate: '0%',
        commonWallet: 'None',
        webTrafficSource: 'N/A',
        bounceRate: '0%',
        totalPageViews: '0',
        avgPageViewPerVisit: '1.00',
        avgVisitDuration: '00 mins 00 secs',
        retention: '12.34%'
      });
    }
  }, [selectedCountry, countryMetrics]);

  // Get flag emoji for country
  const getCountryFlag = (countryName) => {
    // Normalize the country name first
    const normalizedCountry = normalizeCountry(countryName);
    
    const countryCodeMap = {
      "United States": "🇺🇸",
      "United States of America": "🇺🇸",
      "India": "🇮🇳",
      "Germany": "🇩🇪",
      "Brazil": "🇧🇷",
      "Canada": "🇨🇦",
      "France": "🇫🇷",
      "United Kingdom": "🇬🇧",
      "Australia": "🇦🇺",
      "Japan": "🇯🇵",
      "South Korea": "🇰🇷",
      "China": "🇨🇳",
      "Russia": "🇷🇺",
      "Italy": "🇮🇹",
      "Spain": "🇪🇸"
    };
    
    return countryCodeMap[normalizedCountry] || "🌎";
  };

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:px-8 font-poppins">
      <h1 className="text-xl font-bold mb-6 font-montserrat">GeoAnalytics</h1>
      
      {/* First row of metric cards - responsive grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        <MetricCard 
          title="Most Users" 
          value={globalMetrics ? countryMetrics[globalMetrics.maxUsersCountry]?.users.toLocaleString() : 0} 
          country={globalMetrics?.maxUsersCountry || "None"} 
          flag={getCountryFlag(globalMetrics?.maxUsersCountry)} 
        />
        <MetricCard 
          title="Most Web3 Users" 
          value={globalMetrics ? countryMetrics[globalMetrics.maxWeb3UsersCountry]?.web3Users.toLocaleString() : 0} 
          country={globalMetrics?.maxWeb3UsersCountry || "None"} 
          flag={getCountryFlag(globalMetrics?.maxWeb3UsersCountry)} 
        />
        <MetricCard 
          title="Most Wallet Connects" 
          value={globalMetrics ? countryMetrics[globalMetrics.maxWalletConnectsCountry]?.walletConnects.toLocaleString() : 0} 
          country={globalMetrics?.maxWalletConnectsCountry || "None"} 
          flag={getCountryFlag(globalMetrics?.maxWalletConnectsCountry)} 
        />
      </div>
      
      {/* Second row of metric cards - responsive grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        <MetricCard 
          title="Highest Conversion" 
          value={globalMetrics ? countryMetrics[globalMetrics.maxConversionCountry]?.conversionRate : "0%"} 
          country={globalMetrics?.maxConversionCountry || "None"} 
          flag={getCountryFlag(globalMetrics?.maxConversionCountry)} 
        />
        <MetricCard 
          title="Lowest Conversion" 
          value={globalMetrics ? countryMetrics[globalMetrics.minConversionCountry]?.conversionRate : "0%"} 
          country={globalMetrics?.minConversionCountry || "None"} 
          flag={getCountryFlag(globalMetrics?.minConversionCountry)} 
        />
        <MetricCard 
          title="Highest Bounce Rate" 
          value={globalMetrics ? countryMetrics[globalMetrics.maxBounceRateCountry]?.bounceRate : "0%"} 
          country={globalMetrics?.maxBounceRateCountry || "None"} 
          flag={getCountryFlag(globalMetrics?.maxBounceRateCountry)} 
        />
      </div>
      
      {/* Map and country details section - stack on mobile, side by side on larger screens */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-3/5 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 font-montserrat">Details by country</h3>
          <GeoAnalyticsMap 
            analytics={analytics} 
            selectedCountry={selectedCountry} 
            setSelectedCountry={setSelectedCountry} 
            hideTopCountries={true} 
          />
        </div>
        
        <div className="w-full lg:w-2/5 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold font-montserrat">Chosen Country:</h3>
            <div className="flex items-center">
              <span className="font-medium text-base truncate max-w-48">
                {normalizeCountry(selectedCountry) || "Select a country"}
              </span>
              <span className="ml-2">{getCountryFlag(selectedCountry)}</span>
            </div>
          </div>
          
          <div className="space-y-3 overflow-y-auto max-h-[400px]">
            <DetailRow label="Number of Users:" value={countryData.users.toLocaleString()} />
            <DetailRow label="Number of Web3 Users:" value={countryData.web3Users.toLocaleString()} />
            <DetailRow label="Number of Wallet Connects:" value={countryData.walletConnects.toLocaleString()} />
            <DetailRow label="Conversion Rate:" value={countryData.conversionRate} />
            <DetailRow label="Most Common Wallet:" value={countryData.commonWallet} />
            <DetailRow label="Best Source by web3 traffic:" value={countryData.webTrafficSource} />
            <DetailRow label="Bounce rate:" value={countryData.bounceRate} />
            <DetailRow label="Total Page views:" value={countryData.totalPageViews} />
            <DetailRow label="Avg Page view per visit:" value={countryData.avgPageViewPerVisit} />
            <DetailRow label="Avg Visit Duration:" value={countryData.avgVisitDuration} />
            <DetailRow label="Retention:" value={countryData.retention} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, country, flag }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col text-center">
      <div className="text-base text-gray-500 mb-2 font-montserrat">{title}</div>
      <div className="text-xl font-bold mb-2 font-montserrat">{value}</div>
      <div className="text-sm flex items-center justify-center text-gray-600 font-poppins">
        <span className="font-medium mr-1">{flag}</span>
        <span>{country || 'N/A'}</span>
      </div>
    </div>
  );
};

// Detail Row Component
const DetailRow = ({ label, value }) => {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
      <span className="text-sm text-gray-600 font-poppins">{label}</span>
      <span className="text-sm font-medium text-right font-poppins">{value}</span>
    </div>
  );
};

export default GeoAnalytics;
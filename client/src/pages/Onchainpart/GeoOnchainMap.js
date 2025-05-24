import React, { useState, useEffect } from 'react';
import WorldMap from "react-svg-worldmap";
import { isWeb3User } from '../../utils/analyticsHelpers';

// Extended ISO Alpha-2 code to country name map
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
  "MX": "Mexico",
  "ID": "Indonesia",
  "NG": "Nigeria",
  "PK": "Pakistan",
  "BD": "Bangladesh",
  "AR": "Argentina",
  "CO": "Colombia",
  "ZA": "South Africa",
  "EG": "Egypt",
  "TR": "Turkey",
  "TH": "Thailand",
  "VN": "Vietnam",
  "PH": "Philippines",
  "MY": "Malaysia",
  "SG": "Singapore"
};

const GeoOnchainMap = ({ 
  analytics, 
  contractData, 
  selectedCountry, 
  setSelectedCountry, 
  hideTopCountries = false, 
  isLoadingAnalytics = false,
  isLoadingTransactions = false
}) => {
  // State for the processed metrics data
  const [countryMetrics, setCountryMetrics] = useState({});
  const [mapData, setMapData] = useState([]);
  const [topCountries, setTopCountries] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper function to retrieve cached map data
  const getCachedMapData = (contractId) => {
    try {
      const cacheKey = `onchain_map_data_${contractId || 'default'}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed) {
          console.log("Using cached map data");
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error retrieving cached map data:", error);
    }
    return null;
  };

  // Helper function to cache map data
  const cacheMapData = (contractId, data) => {
    try {
      const cacheKey = `onchain_map_data_${contractId || 'default'}`;
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      console.log("Cached map data");
    } catch (error) {
      console.error("Error caching map data:", error);
    }
  };

  // Process analytics data and contract transactions to calculate metrics per country
  useEffect(() => {
    // Skip if data is loading
    if (isLoadingAnalytics || isLoadingTransactions) return;
    
    // Check for cached data first
    const contractId = contractData?.contractId;
    const cachedData = getCachedMapData(contractId);
    
    if (cachedData) {
      setCountryMetrics(cachedData.countryMetrics || {});
      setMapData(cachedData.mapData || []);
      setTopCountries(cachedData.topCountries || []);
      return;
    }
    
    setIsProcessing(true);
    
    // Extract contract wallet addresses
    const contractWallets = new Set();
    if (contractData?.contractTransactions) {
      contractData.contractTransactions.forEach(tx => {
        if (tx.from_address) {
          contractWallets.add(tx.from_address.toLowerCase());
        }
      });
    }
    
    console.log(`Processed ${contractWallets.size} unique wallet addresses from contract transactions`);
    
    // Process sessions data to get country metrics
    const processedMetrics = getMetricsPerCountry(analytics?.sessions || [], contractWallets);
    setCountryMetrics(processedMetrics);
    
    // Convert processed metrics to map data format
    const transformedMapData = Object.entries(processedMetrics)
      .map(([countryCode, metrics]) => {
        if (!countryCode || countryCode.length !== 2) return null;
        
        return {
          country: countryCode.toLowerCase(),
          value: metrics.uniqueUsers,
          web3Users: metrics.web3Users,
          walletConnections: metrics.walletConnections,
          transactedWallets: metrics.transactedWallets,
          totalSessions: metrics.totalSessions
        };
      })
      .filter(Boolean);
    
    setMapData(transformedMapData);
    
    // Calculate top countries
    const sortedCountries = [...transformedMapData]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    setTopCountries(sortedCountries);
    setIsProcessing(false);
    
    // Cache the results
    cacheMapData(contractId, {
      countryMetrics: processedMetrics,
      mapData: transformedMapData,
      topCountries: sortedCountries
    });
    
  }, [analytics, contractData?.contractTransactions, contractData?.contractId, isLoadingAnalytics, isLoadingTransactions]);

  // Function to calculate metrics per country including transacted wallets
  const getMetricsPerCountry = (sessions, contractWallets) => {
    if (!Array.isArray(sessions)) return {};
    const countryMetrics = new Map();

    sessions.forEach((session) => {
      // Skip if no country data
      if (!session.country) return;

      // Normalize country code to uppercase
      const countryCode = session.country.toUpperCase();
      
      // Skip invalid country codes
      if (!countryCode || countryCode.length !== 2) return;
      
      if (!countryMetrics.has(countryCode)) {
        countryMetrics.set(countryCode, {
          uniqueUsers: new Set(),
          web3Users: new Set(),
          walletConnections: new Set(),
          transactedWallets: new Set(), // New metric for wallets that transacted with the contract
          totalSessions: 0
        });
      }

      const metrics = countryMetrics.get(countryCode);
      
      // Track unique users
      if (session.userId) {
        metrics.uniqueUsers.add(session.userId);
      }
      
      // Track web3 users (has web3 wallet but not necessarily connected)
      if (session.userId && isWeb3User(session)) {
        metrics.web3Users.add(session.userId);
      }
      
      // Negative values that indicate no wallet
      const noWalletPhrases = [
        'No Wallet Detected', 
        'No Wallet Connected', 
        'Not Connected', 
        'No Chain Detected', 
        'Error'
      ];
      
      // Track wallet connections and check if the wallet has transacted with our contract
      if (session.userId && session.wallet && 
          session.wallet.walletAddress && 
          session.wallet.walletAddress.trim() !== '' && 
          !noWalletPhrases.includes(session.wallet.walletAddress) &&
          session.wallet.walletAddress.length > 10) {
        
        const walletAddress = session.wallet.walletAddress.toLowerCase();
        
        // Add to connected wallets count
        metrics.walletConnections.add(session.userId);
        
        // Check if this wallet has transacted with our contract
        if (contractWallets.has(walletAddress)) {
          metrics.transactedWallets.add(session.userId);
        }
      }
      
      metrics.totalSessions++;
    });

    // Convert Set objects to counts for the final result
    const result = {};
    countryMetrics.forEach((metrics, countryCode) => {
      result[countryCode] = {
        uniqueUsers: metrics.uniqueUsers.size,
        web3Users: metrics.web3Users.size,
        walletConnections: metrics.walletConnections.size,
        transactedWallets: metrics.transactedWallets.size,
        totalSessions: metrics.totalSessions
      };
    });

    return result;
  };

  // Function to get country flag emoji
  const getCountryFlag = (countryCode) => {
    if (!countryCode) return '';
    
    // Convert country code to flag emoji
    // Each flag emoji is made up of two regional indicator symbols
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  };

  // Show loading UI when processing data
  if (isLoadingAnalytics || isLoadingTransactions || isProcessing) {
    return (
      <div className="w-full flex items-center justify-center p-12">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mb-4"></div>
          <p className="text-gray-600">
            {isLoadingAnalytics ? "Loading analytics data..." : 
             isLoadingTransactions ? "Loading transaction data..." : 
             "Processing geographic data..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Standardized header text */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold font-montserrat text-center">Unique Users by Country</h2>
        <div className="relative">
          <select className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-md text-sm font-poppins appearance-none">
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

      {/* Warning message if no data */}
      {mapData.length === 0 && (
        <div className="w-full bg-yellow-50 p-4 rounded-lg mb-4">
          <p className="text-yellow-700">No geographic data available for the selected website or no wallets connected.</p>
        </div>
      )}

      {/* Map and Countries side by side */}
      <div className="flex flex-col md:flex-row">
        {/* World Map - uses full width when hideTopCountries is true */}
        <div className={`w-full ${!hideTopCountries ? 'md:w-2/3 md:pr-4' : ''}`}>
          <WorldMap
            color="blue"
            title="Unique Users by Country"
            valueSuffix=" users"
            size={hideTopCountries ? "xl" : "lg"}
            data={mapData}
            onClickFunction={({ countryName, countryCode, countryValue }) => {
              if (setSelectedCountry) {
                setSelectedCountry(countryCode.toUpperCase());
              }
            }}
          />
        </div>

        {/* Top Countries List - Only show if hideTopCountries is false */}
        {!hideTopCountries && (
          <div className="w-full md:w-1/3 mt-4 md:mt-0">
            <h3 className="text-base font-medium mb-3 font-montserrat">Top Countries</h3>
            <ul className="space-y-3 text-sm text-gray-700 font-poppins max-h-80 overflow-y-auto pr-2">
              {topCountries.map(({ country, value, web3Users, walletConnections, transactedWallets }) => {
                const countryCode = country.toUpperCase();
                const countryName = countryCodeToName[countryCode] || countryCode;
                const flagEmoji = getCountryFlag(countryCode);
                return (
                  <li key={country} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <span className="flex items-center">
                      <span className="text-xl mr-3">{flagEmoji}</span>
                      <span className="font-medium">{countryName}</span>
                    </span>
                    <div className="flex flex-col space-y-1">
                      <span className="font-semibold">{value} users</span>
                      <span className="text-purple-600">{web3Users} web3</span>
                      <span className="text-green-600">{walletConnections} wallets</span>
                      <span className="text-amber-600">{transactedWallets} transacted</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeoOnchainMap; 
import React from 'react';
import WorldMap from "react-svg-worldmap";

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

const GeoAnalyticsMap = ({ analytics, selectedCountry, setSelectedCountry }) => {
  const getMetricsPerCountry = (sessions) => {
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
          totalSessions: 0
        });
      }

      const metrics = countryMetrics.get(countryCode);
      
      // Track unique users
      if (session.userId) {
        metrics.uniqueUsers.add(session.userId);
      }
      
      // Track web3 users (has web3 wallet but not necessarily connected)
      if (session.userId && session.wallet && session.wallet.walletType && 
          session.wallet.walletType !== 'No Wallet Detected') {
        metrics.web3Users.add(session.userId);
      }
      
      // Track wallet connections (has wallet address)
      if (session.userId && session.wallet && session.wallet.walletAddress && 
          session.wallet.walletAddress.trim() !== '' && session.wallet.walletAddress !== 'No Wallet Detected') {
        metrics.walletConnections.add(session.userId);
      }
      
      metrics.totalSessions++;
    });

    const result = {};
    countryMetrics.forEach((metrics, countryCode) => {
      result[countryCode] = {
        uniqueUsers: metrics.uniqueUsers.size,
        web3Users: metrics.web3Users.size,
        walletConnections: metrics.walletConnections.size,
        totalSessions: metrics.totalSessions
      };
    });

    return result;
  };

  const countryMetrics = getMetricsPerCountry(analytics?.sessions || []);
  
  // Convert to data for WorldMap component
  const mapData = Object.entries(countryMetrics)
    .map(([countryCode, metrics]) => {
      if (!countryCode || countryCode.length !== 2) return null;
      
      return {
        country: countryCode.toLowerCase(),
        value: metrics.uniqueUsers,
        web3Users: metrics.web3Users,
        walletConnections: metrics.walletConnections,
        totalSessions: metrics.totalSessions
      };
    })
    .filter(Boolean);

  // Sort and get top 5 countries by unique users
  const topCountries = [...mapData]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Function to get country flag emoji
  const getCountryFlag = (countryCode) => {
    // Convert country code to flag emoji
    // Each flag emoji is made up of two regional indicator symbols
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow p-6 mb-6">
      {/* Standardized header text */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold font-montserrat text-center">Users by Country</h2>
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

      {/* World Map */}
      <div className="mb-6">
        <WorldMap
          color="blue"
          title="Unique Users by Country"
          valueSuffix=" users"
          size="lg"
          data={mapData}
          onClickFunction={({ countryName, countryCode, countryValue }) => {
            setSelectedCountry(countryCode.toUpperCase());
          }}
        />
      </div>

      {/* Top Countries List with standardized text */}
      <div className="pb-0">
        <h3 className="text-base font-medium mb-3 font-montserrat text-center">Top Countries</h3>
        <ul className="space-y-3 text-sm text-gray-700 font-poppins">
          {topCountries.map(({ country, value, web3Users, walletConnections }) => {
            const countryCode = country.toUpperCase();
            const countryName = countryCodeToName[countryCode] || countryCode;
            const flagEmoji = getCountryFlag(countryCode);
            return (
              <li key={country} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="flex items-center">
                  <span className="text-xl mr-3">{flagEmoji}</span>
                  <span className="font-medium">{countryName}</span>
                </span>
                <div className="flex space-x-6">
                  <span className="font-semibold">{value} users</span>
                  <span className="text-purple-600">{web3Users} web3</span>
                  <span className="text-green-600">{walletConnections} wallets</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default GeoAnalyticsMap;
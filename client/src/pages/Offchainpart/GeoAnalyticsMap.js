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
    <div className="w-full bg-white rounded-lg shadow p-6 mt-4 mb-0">
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
      
      {/* Standardized header text */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800 font-montserrat">Users by Country</h2>
        <div className="relative">
          <select className="p-2 border border-gray-300 rounded-md text-sm font-poppins bg-white text-gray-700">
            <option>This Month</option>
            <option>Last Month</option>
            <option>Last 3 Months</option>
          </select>
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
        <h3 className="text-base font-semibold mb-3 font-montserrat">Top Countries</h3>
        <ul className="space-y-3">
          {topCountries.map(({ country, value, web3Users, walletConnections }) => {
            const countryCode = country.toUpperCase();
            const countryName = countryCodeToName[countryCode] || countryCode;
            const flagEmoji = getCountryFlag(countryCode);
            return (
              <li key={country} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="flex items-center">
                  <span className="text-lg mr-3">{flagEmoji}</span>
                  <span className="font-medium text-sm font-poppins">{countryName}</span>
                </span>
                <div className="flex space-x-6">
                  <span className="font-medium text-sm font-poppins">{value} users</span>
                  <span className="text-purple-600 text-sm font-poppins">{web3Users} web3</span>
                  <span className="text-green-600 text-sm font-poppins">{walletConnections} wallets</span>
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
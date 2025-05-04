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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4 font-montserrat">Geographic Distribution</h2>
      
      {/* Loading state */}
      {loading && (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="text-red-500 p-4 text-center font-poppins">{error}</div>
      )}
      
      {/* No data state */}
      {!loading && !error && Object.keys(countryMetrics).length === 0 && (
        <div className="text-gray-500 p-4 text-center font-poppins">No geographic data available</div>
      )}
      
      {/* Data visualization */}
      {!loading && !error && Object.keys(countryMetrics).length > 0 && (
        <div className="space-y-6">
          {/* Map visualization */}
          <div className="h-64 md:h-96 relative">
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
          
          {/* Top countries table */}
          <div>
            <h3 className="text-md font-medium mb-2 font-montserrat">Top Countries</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">Country</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">Visitors</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">Percentage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 font-poppins">
                  {topCountries.map(({ country, value, web3Users, walletConnections }) => {
                    const countryCode = country.toUpperCase();
                    const countryName = countryCodeToName[countryCode] || countryCode;
                    const flagEmoji = getCountryFlag(countryCode);
                    return (
                      <tr key={country}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-montserrat">{flagEmoji} {countryName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-poppins">{value} users</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-poppins">{web3Users} web3</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-poppins">{walletConnections} wallets</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeoAnalyticsMap;
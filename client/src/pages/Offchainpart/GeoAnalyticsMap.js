import React from 'react';
import WorldMap from "react-svg-worldmap";

// Country name to ISO Alpha-2 code map (add more as needed)
const countryNameToCode = {
  India: "IN",
  "United States": "US",
  Germany: "DE",
  Brazil: "BR",
  Canada: "CA",
  France: "FR",
  China: "CN",
  Australia: "AU",
  Nigeria: "NG",
  Pakistan: "PK",
  Bangladesh: "BD",
  Mexico: "MX",
  Russia: "RU",
  Indonesia: "ID",
  // Add more mappings as required
};

const GeoAnalyticsMap = ({ analytics,selectedCountry, setSelectedCountry }) => {
  const getUniqueUsersPerCountry = (sessions) => {
    if (!Array.isArray(sessions)) return {};
    const countryUserMap = new Map();

    sessions.forEach(({ country, userId }) => {
      if (!country || !userId) return;

      if (!countryUserMap.has(country)) {
        countryUserMap.set(country, new Set());
      }

      countryUserMap.get(country).add(userId);
    });

    const result = {};
    countryUserMap.forEach((userSet, country) => {
      result[country] = userSet.size;
    });

    return result;
  };

  const userCountsByCountry = getUniqueUsersPerCountry(analytics?.sessions || []);
  console.log("userCountsByCountry:", userCountsByCountry);

  // Convert to data for WorldMap component
  const mapData = Object.entries(userCountsByCountry)
    .map(([countryName, value]) => {
      const code = countryNameToCode[countryName];
      if (!code) return null;
      return { country: code.toLowerCase(), value };
    })
    .filter(Boolean); // remove nulls

  // Sort and get top 5 countries
  const topCountries = [...mapData]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="w-full bg-white rounded-2xl p-6 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Users by country</h2>
        <div className="relative">
          <select className="bg-gray-50 border border-gray-200 text-gray-700 py-1 px-3 pr-8 rounded-md text-sm appearance-none">
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
      <div className="App mb-6">
        <WorldMap
          color="blue"
          title="Unique Users by Country"
          value-suffix=" users"
          size="lg"
          data={mapData}
          onClickFunction={({ countryName, countryCode, countryValue }) => {
            setSelectedCountry(countryName);
          }}
        />
      </div>

      {/* Top Countries List */}
      <div>
        <h3 className="text-lg font-medium mb-2">Top Countries</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          {topCountries.map(({ country, value }) => {
            const countryName = Object.entries(countryNameToCode).find(
              ([, code]) => code.toLowerCase() === country
            )?.[0] || country;
            return (
              <li key={country} className="flex justify-between">
                <span>{countryName}</span>
                <span className="font-semibold">{value} users</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default GeoAnalyticsMap;

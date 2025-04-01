import React, { useState, useEffect } from 'react';
import GeoAnalyticsMap from '../GeoAnalyticsMap';

const GeoAnalytics = () => {
  const [selectedCountry, setSelectedCountry] = useState('United States of America');
  const [countryData, setCountryData] = useState({
    users: 100000,
    web3Users: 100000,
    walletConnects: 100000,
    conversionRate: '50.12%',
    commonWallet: 'Metamask',
    webTrafficSource: 'X',
    conversionSource: 'Discord',
    bounceRate: '12.34%',
    totalPageViews: '10,000,000',
    avgPageViewPerVisit: '100,000',
    avgVisitDuration: '04 mins 32 secs',
    retention: '12.34%'
  });

  // Mock country data for map
  const countriesData = [
    { id: 'US', name: 'United States of America', fillColor: '#5D87E8', users: 100000, web3Users: 100000, walletConnects: 100000, conversionRate: '50.12%' },
    { id: 'GB', name: 'United Kingdom', fillColor: '#5D87E8', users: 85000, web3Users: 75000, walletConnects: 65000, conversionRate: '45.78%' },
    { id: 'CA', name: 'Canada', fillColor: '#5D87E8', users: 72000, web3Users: 68000, walletConnects: 54000, conversionRate: '43.21%' },
    { id: 'AU', name: 'Australia', fillColor: '#5D87E8', users: 45000, web3Users: 42000, walletConnects: 38000, conversionRate: '41.5%' },
    { id: 'FR', name: 'France', fillColor: '#5D87E8', users: 38000, web3Users: 34000, walletConnects: 29000, conversionRate: '39.1%' },
    { id: 'DE', name: 'Germany', fillColor: '#5D87E8', users: 36000, web3Users: 33000, walletConnects: 27000, conversionRate: '38.5%' },
    { id: 'JP', name: 'Japan', fillColor: '#5D87E8', users: 29000, web3Users: 25000, walletConnects: 21000, conversionRate: '34.2%' },
    { id: 'IN', name: 'India', fillColor: '#5D87E8', users: 25000, web3Users: 22000, walletConnects: 18000, conversionRate: '32.1%' },
    { id: 'BR', name: 'Brazil', fillColor: '#5D87E8', users: 22000, web3Users: 19000, walletConnects: 15000, conversionRate: '30.5%' },
    { id: 'KR', name: 'South Korea', fillColor: '#5D87E8', users: 18000, web3Users: 16000, walletConnects: 13000, conversionRate: '28.7%' }
  ];

  const handleCountrySelect = (country) => {
    setSelectedCountry(country.name);
    
    // Set the country data
    const selectedData = {
      users: country.users,
      web3Users: country.web3Users,
      walletConnects: country.walletConnects,
      conversionRate: country.conversionRate,
      commonWallet: 'Metamask',
      webTrafficSource: 'X',
      conversionSource: 'Discord',
      bounceRate: '12.34%',
      totalPageViews: '10,000,000',
      avgPageViewPerVisit: '100,000',
      avgVisitDuration: '04 mins 32 secs',
      retention: '12.34%'
    };
    
    setCountryData(selectedData);
  };

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:px-8">
      <h1 className="text-xl md:text-2xl font-bold mb-4">GeoAnalytics</h1>
      
      {/* First row of metric cards - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <MetricCard 
          title="Most Users" 
          value={countryData.users.toLocaleString()} 
          country={selectedCountry} 
          flag="🇺🇸" 
        />
        <MetricCard 
          title="Most Web3 Users" 
          value={countryData.web3Users.toLocaleString()} 
          country={selectedCountry} 
          flag="🇺🇸" 
        />
        <MetricCard 
          title="Most Wallet Connects" 
          value={countryData.walletConnects.toLocaleString()} 
          country={selectedCountry} 
          flag="🇺🇸" 
        />
      </div>
      
      {/* Second row of metric cards - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <MetricCard 
          title="Highest Conversion" 
          value={countryData.conversionRate} 
          country={selectedCountry} 
          flag="🇺🇸" 
        />
        <MetricCard 
          title="Lowest Conversion" 
          value="12.34%" 
          country={selectedCountry} 
          flag="🇺🇸" 
        />
        <MetricCard 
          title="Highest Bounce rate" 
          value="45.65%" 
          country={selectedCountry} 
          flag="🇺🇸" 
        />
      </div>
      
      {/* Map and country details section - stack on mobile, side by side on larger screens */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        <div className="w-full lg:w-3/5 bg-white rounded-xl p-4 md:p-6 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Details by country</h2>
          <GeoAnalyticsMap countriesData={countriesData} onCountrySelect={handleCountrySelect} />
        </div>
        
        <div className="w-full lg:w-2/5 bg-white rounded-xl p-4 md:p-6 shadow-sm">
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <h2 className="text-base md:text-lg font-semibold">Chosen Country:</h2>
            <div className="flex items-center">
              <span className="font-medium text-sm md:text-base truncate max-w-32 md:max-w-48">{selectedCountry}</span>
              <span className="ml-2">🇺🇸</span>
            </div>
          </div>
          
          <div className="space-y-2 md:space-y-3 overflow-y-auto max-h-96 md:max-h-none">
            <DetailRow label="Number of Users:" value={countryData.users.toLocaleString()} />
            <DetailRow label="Number of Web3 Users:" value={countryData.web3Users.toLocaleString()} />
            <DetailRow label="Number of Wallet Connects:" value={countryData.walletConnects.toLocaleString()} />
            <DetailRow label="Conversion Rate:" value={countryData.conversionRate} />
            <DetailRow label="Most Common Wallet:" value={countryData.commonWallet} />
            <DetailRow label="Best Source by web3 traffic:" value={countryData.webTrafficSource} />
            <DetailRow label="Best Source by conversion:" value={countryData.conversionSource} />
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
    <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm h-full">
      <h3 className="text-xs md:text-sm font-medium mb-1 md:mb-2">{title}</h3>
      <div className="text-lg md:text-2xl font-bold mb-1">{value}</div>
      <div className="flex items-center text-xs text-gray-600 truncate">
        <span className="mr-1">{flag}</span>
        <span className="truncate">{country}</span>
      </div>
    </div>
  );
};

// Detail Row Component
const DetailRow = ({ label, value }) => {
  return (
    <div className="flex justify-between items-center border-b border-gray-100 py-1">
      <span className="text-xs md:text-sm text-gray-600">{label}</span>
      <span className="text-xs md:text-sm font-medium truncate max-w-32 md:max-w-48 text-right">{value}</span>
    </div>
  );
};

// Simple World Map Component
const WorldMap = ({ countriesData, onCountrySelect }) => {
  return (
    <div className="relative h-60 sm:h-72 md:h-80 w-full">
      {/* This is a simplified world map representation */}
      <div className="absolute inset-0 bg-blue-100 rounded-lg">
        {/* This would be replaced with an actual SVG map in a real implementation */}
        <img 
          src="/api/placeholder/600/300" 
          alt="World Map" 
          className="w-full h-full object-cover rounded-lg opacity-50"
        />
        
        {/* Interactive areas for countries */}
        <div className="absolute inset-0">
          {countriesData.map((country, index) => (
            <div 
              key={index}
              onClick={() => onCountrySelect(country)}
              className="absolute cursor-pointer hover:opacity-75 transition-opacity"
              style={{
                width: '10%',
                height: '10%',
                left: `${10 + (index * 8)}%`,
                top: `${20 + (index % 5) * 12}%`,
                backgroundColor: country.fillColor,
                borderRadius: '50%',
                opacity: 0.7
              }}
              title={country.name}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GeoAnalytics;
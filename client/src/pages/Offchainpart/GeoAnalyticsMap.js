import React, { useState } from 'react';

const GeoAnalyticsMap = () => {
  // Sample country data
  const countryData = [
    { country: 'United States (USA)', percentage: '54%', users: '5,761,687', flagCode: 'us', id: 'USA', fill: '#1E40AF' },
    { country: 'China', percentage: '31%', users: '698,723', flagCode: 'cn', id: 'CHN', fill: '#3B82F6' },
    { country: 'Russia', percentage: '19%', users: '68,412', flagCode: 'ru', id: 'RUS', fill: '#93C5FD' }
  ];
  
  const [hoveredCountry, setHoveredCountry] = useState(null);
  
  // Handle country hover for both map and list
  const handleCountryHover = (countryId) => {
    setHoveredCountry(countryId);
  };
  
  // Get country fill color based on ID
  const getCountryFill = (countryId) => {
    const country = countryData.find(c => c.id === countryId);
    return country ? country.fill : "#E5E7EB";
  };
  
  // Calculate opacity based on hover state
  const getCountryOpacity = (countryId) => {
    return hoveredCountry === countryId || hoveredCountry === null ? 1 : 0.7;
  };
  
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
      
      {/* World Map using embedded SVG */}
      <div className="w-full h-72 mb-6 overflow-hidden bg-blue-50 rounded-lg">
        <svg 
          viewBox="0 0 1000 500" 
          className="w-full h-full"
          style={{ maxHeight: "100%", maxWidth: "100%" }}
        >
          {/* Ocean background */}
          <rect x="0" y="0" width="1000" height="500" fill="#EFF6FF" />
          
          {/* World map simplified */}
          
          {/* North America */}
          <path
            d="M150,120 L280,120 L300,180 L280,220 L240,230 L200,220 L170,200 L150,170 Z"
            fill="#E5E7EB"
            stroke="#FFF"
            strokeWidth="1"
          />
          
          {/* United States */}
          <path
            d="M170,150 L270,150 L280,180 L260,200 L220,210 L190,200 L175,180 Z"
            fill={getCountryFill('USA')}
            opacity={getCountryOpacity('USA')}
            stroke="#FFF"
            strokeWidth="1"
            onMouseEnter={() => handleCountryHover('USA')}
            onMouseLeave={() => handleCountryHover(null)}
          />
          <text x="215" y="180" fontSize="14" fontWeight="bold" fill="#FFF" textAnchor="middle" pointerEvents="none">USA</text>
          
          {/* South America */}
          <path
            d="M250,250 L290,250 L310,320 L280,380 L240,380 L220,340 Z"
            fill="#E5E7EB"
            stroke="#FFF"
            strokeWidth="1"
          />
          
          {/* Europe */}
          <path
            d="M420,140 L480,120 L520,140 L500,180 L460,190 L430,170 Z"
            fill="#E5E7EB"
            stroke="#FFF"
            strokeWidth="1"
          />
          
          {/* Africa */}
          <path
            d="M420,200 L500,200 L530,270 L510,330 L460,340 L420,320 L400,270 Z"
            fill="#E5E7EB"
            stroke="#FFF"
            strokeWidth="1"
          />
          
          {/* Russia */}
          <path
            d="M520,80 L730,80 L770,120 L760,150 L520,150 Z"
            fill={getCountryFill('RUS')}
            opacity={getCountryOpacity('RUS')}
            stroke="#FFF"
            strokeWidth="1"
            onMouseEnter={() => handleCountryHover('RUS')}
            onMouseLeave={() => handleCountryHover(null)}
          />
          <text x="620" y="115" fontSize="14" fontWeight="bold" fill="#FFF" textAnchor="middle" pointerEvents="none">RUS</text>
          
          {/* China */}
          <path
            d="M650,160 L740,160 L750,190 L740,230 L670,240 L650,220 Z"
            fill={getCountryFill('CHN')}
            opacity={getCountryOpacity('CHN')}
            stroke="#FFF"
            strokeWidth="1"
            onMouseEnter={() => handleCountryHover('CHN')}
            onMouseLeave={() => handleCountryHover(null)}
          />
          <text x="700" y="200" fontSize="14" fontWeight="bold" fill="#FFF" textAnchor="middle" pointerEvents="none">CHN</text>
          
          {/* India */}
          <path
            d="M620,180 L650,190 L660,220 L630,240 L610,230 L600,210 Z"
            fill="#E5E7EB"
            stroke="#FFF"
            strokeWidth="1"
          />
          
          {/* Southeast Asia */}
          <path
            d="M660,230 L710,240 L720,260 L690,290 L660,270 Z"
            fill="#E5E7EB"
            stroke="#FFF"
            strokeWidth="1"
          />
          
          {/* Australia */}
          <path
            d="M740,300 L800,300 L810,330 L790,360 L740,360 L720,340 Z"
            fill="#E5E7EB"
            stroke="#FFF"
            strokeWidth="1"
          />
          
          {/* Antarctica */}
          <path
            d="M400,420 L600,420 L600,450 L400,450 Z"
            fill="#E5E7EB"
            stroke="#FFF"
            strokeWidth="1"
          />
        </svg>
        
        {/* Map Legend */}
        <div className="absolute bottom-2 right-2 bg-white p-2 rounded-md shadow-sm text-xs">
          <div className="flex items-center mb-1">
            <div className="w-3 h-3 bg-blue-800 mr-1"></div>
            <span>50%+</span>
          </div>
          <div className="flex items-center mb-1">
            <div className="w-3 h-3 bg-blue-500 mr-1"></div>
            <span>25-50%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-200 mr-1"></div>
            <span>&lt;25%</span>
          </div>
        </div>
      </div>
      
      {/* Country List */}
      <div className="grid grid-cols-3 gap-4">
        {countryData.map((country, index) => (
          <div 
            key={index} 
            className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer"
            onMouseEnter={() => handleCountryHover(country.id)}
            onMouseLeave={() => handleCountryHover(null)}
          >
            <div className="w-8 h-6 mr-3 border border-gray-200 rounded overflow-hidden">
              {/* Flag with country code */}
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: country.fill }}
              >
                <span className="text-white text-xs font-bold">{country.flagCode.toUpperCase()}</span>
              </div>
            </div>
            <div>
              <div className="font-medium">{country.country}</div>
              <div className="text-sm text-gray-600">{country.percentage} • {country.users} Users</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Analytics Summary */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Total Countries</div>
            <div className="text-xl font-semibold mt-1">42</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Global Users</div>
            <div className="text-xl font-semibold mt-1">6.5M</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500">Growth Rate</div>
            <div className="text-xl font-semibold mt-1 text-green-500">+12%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeoAnalyticsMap;
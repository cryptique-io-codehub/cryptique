import React, { useState } from 'react';

const TrafficSourcesComponent = ({ trafficSources, setTrafficSources }) => {
  const [selectedMonth, setSelectedMonth] = useState('This Month');
  
  // Social media icons component
  const SocialIcon = ({ platform }) => {
    const iconColors = {
      twitter: 'text-blue-400',
      linkedin: 'text-blue-600',
      instagram: 'text-pink-500',
      dribbble: 'text-pink-400',
      behance: 'text-blue-500',
      pinterest: 'text-red-500'
    };
    
    return (
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${iconColors[platform]}`}>
        {platform === 'twitter' && <span>𝕏</span>}
        {platform === 'linkedin' && <span>in</span>}
        {platform === 'instagram' && <span>📷</span>}
        {platform === 'dribbble' && <span>🏀</span>}
        {platform === 'behance' && <span>Be</span>}
        {platform === 'pinterest' && <span>𝙿</span>}
      </div>
    );
  };
  
  // Function to handle month change and update data if needed
  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    
    // Optionally update traffic data based on month selection
    // For this example, we're just using the state provided by props
  };
  
  return (
    <div className="mt-1 pt-4 border-t  bg-white rounded-lg shadow ">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold pl-3">Traffic sources</h3>
        <div className="relative">
          <select 
            className="text-sm bg-gray-50 border border-gray-200 rounded-md px-2 py-1 pr-8 appearance-none"
            value={selectedMonth}
            onChange={handleMonthChange}
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
        <div className="grid grid-cols-4 bg-gray-100 p-3 pl-1 text-sm font-medium text-gray-600 pl-3">
          <div>Traffic source</div>
          <div className="text-right">Visitors</div>
          <div className="text-right">Wallet</div>
          <div className="text-right">Wallets Connected</div>

        </div>
        
        {/* Table rows */}
        <div className="divide-y divide-dashed divide-blue-200 border-t border-b border-blue-200 pl-1">
          {trafficSources.map((source, index) => (
            <div key={index} className="grid grid-cols-4 p-3 text-sm">
              <div className="flex items-center space-x-2">
                <SocialIcon platform={source.icon} />
                <span>{source.source}</span>
              </div>
              <div className="text-right">{source.visitors.toLocaleString()}</div>
              <div className="text-right">{source.wallets.toLocaleString()}</div>
              <div className="text-right">{source.wallets_section.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrafficSourcesComponent;
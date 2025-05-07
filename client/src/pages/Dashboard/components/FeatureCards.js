import React, { useState, useEffect } from "react";

export const FeatureCards = () => {
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkMobile();
    
    // Listen for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-0 max-h-full sm:max-h-[300px] overflow-y-auto pb-4 sm:pb-0 sm:overflow-hidden">
      {[
        {
          title: "Cryptique works with your Google Analytics",
          description: "You don't need to change anything in your Google Analytics setup.",
        },
        {
          title: "Run KOL Intelligence",
          description: "Get access to advanced KOL data and on-chain insights into your social dynamics.",
        },
        {
          title: "Campaigns",
          description: "Measure performance & retention of all your campaigns.",
        },
        {
          title: "Segment your audience",
          description: "Create custom audiences based on their on-chain and off-chain activities.",
        },
      ].map((item, index) => (
        <div key={index} className={`bg-white ${isMobile ? 'p-3' : 'p-3 md:p-4'} shadow-md rounded-lg border border-gray-200`}>
          {/* Product Feature Badge */}
          <span className="inline-block bg-orange-100 text-orange-600 text-xs font-semibold px-2 py-1 rounded-md">
            Product Feature
          </span>
          
          {/* Title & Description */}
          <h3 className="text-xs sm:text-sm font-semibold mt-2">{item.title}</h3>
          <p className="text-gray-600 text-xs mt-1 line-clamp-2 sm:line-clamp-none">{item.description}</p>
          
          {/* Link */}
          <div className="text-right mt-2">
            <a href="#" className="text-blue-500 text-xs font-medium hover:underline">
              Click here →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};
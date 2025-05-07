import React, { useState, useEffect } from "react";

const Tabs = ({ isSidebarOpen }) => {
  const [activeTab, setActiveTab] = useState("Overview");
  const [isMobile, setIsMobile] = useState(false);
  const tabs = ["Overview", "Analytics", "Campaigns"];

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

  if (isSidebarOpen) return null; // Hide tabs when sidebar is open

  return (
    <div className="w-full overflow-x-auto">
      <div className={`flex border-b border-gray-300 pb-2 -mt-4 ${isMobile ? 'min-w-full justify-around' : 'min-w-max'}`}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative ${isMobile ? 'px-1 mx-1' : 'px-2 sm:px-3 md:px-4 mx-1 sm:mx-2 md:mx-4'} py-2 text-sm sm:text-base md:text-lg font-semibold text-gray-600 hover:text-black transition-all mt-0 flex-1 text-center`}
          >
            {tab}
            {activeTab === tab && (
              <span className={`absolute left-0 right-0 bottom-0 mx-auto w-full ${isMobile ? 'max-w-12' : 'max-w-16 sm:max-w-20 md:max-w-32'} h-1 bg-blue-500 rounded-full mt-0`}></span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Tabs;

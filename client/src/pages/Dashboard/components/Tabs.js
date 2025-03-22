import React, { useState } from "react";

const Tabs = ({ isSidebarOpen }) => {
  const [activeTab, setActiveTab] = useState("Overview");
  const tabs = ["Overview", "Analytics", "Campaigns"];

  if (isSidebarOpen) return null; // Hide tabs when sidebar is open

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex border-b border-gray-300 pb-2 -mt-4 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative px-2 sm:px-3 md:px-4 py-2 text-sm sm:text-base md:text-lg font-semibold text-gray-600 hover:text-black transition-all mt-0 flex-1 text-center mx-1 sm:mx-2 md:mx-4"
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute left-0 right-0 bottom-0 mx-auto w-full max-w-16 sm:max-w-20 md:max-w-32 h-1 bg-blue-500 rounded-full mt-0"></span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Tabs;

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BarChart2, LineChart, Target, Home } from "lucide-react";

const Tabs = ({ isSidebarOpen }) => {
  const [activeTab, setActiveTab] = useState("Overview");
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const selectedTeam = localStorage.getItem("selectedTeam") || "";

  // Style definitions matching the brand
  const styles = {
    primaryColor: "#1d0c46", // Deep purple
    accentColor: "#caa968", // Gold accent
    backgroundColor: "#f8f8ff"
  };

  const tabs = [
    { 
      name: "Overview", 
      path: "dashboard",
      icon: <Home size={isMobile ? 16 : 18} />
    },
    { 
      name: "Off-chain Analytics", 
      path: "offchain",
      icon: <BarChart2 size={isMobile ? 16 : 18} />
    },
    { 
      name: "On-chain Explorer", 
      path: "onchain",
      icon: <LineChart size={isMobile ? 16 : 18} />
    },
    { 
      name: "Campaigns", 
      path: "campaigns",
      icon: <Target size={isMobile ? 16 : 18} />
    }
  ];

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Listen for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set active tab based on current route
  useEffect(() => {
    const path = location.pathname.split('/').pop();
    const currentTab = tabs.find(tab => tab.path === path) || tabs[0];
    setActiveTab(currentTab.name);
  }, [location]);

  if (isSidebarOpen) return null; // Hide tabs when sidebar is open

  const handleTabClick = (tab) => {
    setActiveTab(tab.name);
    navigate(`/${selectedTeam}/${tab.path}`);
  };

  return (
    <div className="w-full overflow-x-auto mb-4">
      <div 
        className="flex border-b border-gray-200 -mt-4"
        style={{ backgroundColor: styles.backgroundColor }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => handleTabClick(tab)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all`}
            style={{ 
              color: activeTab === tab.name ? styles.primaryColor : '#64748b',
              borderBottom: activeTab === tab.name ? `2px solid ${styles.accentColor}` : '2px solid transparent'
            }}
          >
            {tab.icon}
            {!isMobile && <span>{tab.name}</span>}
            {isMobile && activeTab === tab.name && <span>{tab.name}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Tabs;

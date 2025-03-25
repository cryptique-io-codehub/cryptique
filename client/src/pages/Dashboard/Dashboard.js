import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar.js";
import Header from "../../components/Header.js";
import Tabs from "./components/Tabs";
import { FeatureCards } from "./components/FeatureCards";
import MarketingSection from "./components/MarketingSection";
import Settings from "../Setting/Settings.js";
import { Menu } from "lucide-react";

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState("dashboard"); // "dashboard" or "settings"
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport on mount and resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is typical mobile breakpoint
    };
    
    // Initial check
    checkIfMobile();
    
    // Set up event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleNavigation = (page) => {
    setSelectedPage(page);
    // When navigating to settings, we want to close the mobile sidebar
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  // Toggle sidebar for mobile only
  const toggleSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Desktop sidebar - always visible with hover behavior intact */}
      {!isMobile && (
        <div className="h-screen sticky top-0 flex-shrink-0">
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            onNavigate={handleNavigation}
            isCompact={selectedPage === "settings"}
            currentPage={selectedPage}
          />
        </div>
      )}

      {/* Mobile sidebar - hidden by default, shown when toggled */}
      {isMobile && isSidebarOpen && (
        <div className="fixed top-0 left-0 h-full z-50">
          <Sidebar 
            isOpen={true} 
            onClose={() => setIsSidebarOpen(false)} 
            onNavigate={handleNavigation}
            isCompact={false}
            currentPage={selectedPage}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-y-auto relative">
        {/* Mobile-only fixed menu button that stays visible while scrolling */}
        {isMobile && (
          <button 
            className="fixed top-4 left-4 p-2 bg-white rounded-md shadow-md text-gray-700 hover:bg-gray-200 focus:outline-none z-30"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            <Menu size={24} />
          </button>
        )}

        {selectedPage === "dashboard" && (
          <>
            <Header onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)}>
              {/* We've moved the mobile menu button outside of Header for better visibility */}
            </Header>
            <main className="p-4 flex flex-col gap-6">
              {/* Add top padding on mobile to account for fixed menu button */}
              <div className={isMobile ? "pt-6" : ""}>
                <MarketingSection />
              </div>
              <Tabs />
              <FeatureCards />
            </main>
          </>
        )}

        {selectedPage === "settings" && (
          <Settings 
            onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)} 
          />
        )}
      </div>

      {/* Mobile overlay when sidebar is open */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
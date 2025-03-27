import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar.js";
import Header from "../../components/Header.js";
import Tabs from "./components/Tabs";
import { FeatureCards } from "./components/FeatureCards";
import MarketingSection from "./components/MarketingSection";
import Settings from "../Setting/Settings.js";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import OffchainAnalytics from './OffchainAnalytics.js'
import OnchainExplorer from './OnchainExplorer.js'
import ManageWebsites from './ManageWebsites.js'
import KOLIntelligence from './KOLIntelligence.js'
import ImportUsers from './ImportUsers.js'
import  History  from "./History.js";
import ConversionEvents from './ConversionEvents.js'
import Campaigns from './Campaigns.js'
import Advertise from './Advertise.js'

// Placeholder components

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const [setselectedTeam,selectedTeam]=useState(localStorage.getItem("selectedTeam"));
  // Mobile check
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Sync selectedPage with URL
  useEffect(() => {
    const path = location.pathname;
    if (path === `/${selectedTeam}/dashboard`) {
      setSelectedPage("dashboard");
    } else if (path.includes('/settings')) {
      setSelectedPage("settings");
    }
    // Add more mappings if you extend routing to other pages
  }, [location]);

  const handleNavigation = (page) => {
    console.log("Navigating to:", page); // Debug log to confirm navigation
    setSelectedPage(page);
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {!isMobile && (
        <div className="h-screen sticky top-0 flex-shrink-0">
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            onNavigate={handleNavigation}
            currentPage={selectedPage}
          />
        </div>
      )}

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
        {isMobile && (
          <button 
            className="fixed top-4 left-4 p-2 bg-white rounded-md shadow-md text-gray-700 hover:bg-gray-200 focus:outline-none z-30"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            <Menu size={24} />
          </button>
        )}

        {/* Always render the selected page component */}
        {selectedPage === "dashboard" && (
          <>
            <Header onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)} />
            <main className="p-4 flex flex-col gap-6">
              <div className={isMobile ? "pt-6" : ""}>
                <MarketingSection />
              </div>
              <Tabs />
              <FeatureCards />
            </main>
          </>
        )}

        {selectedPage === "offchain-analytics" && (
          <OffchainAnalytics 
            onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setSelectedPage("dashboard")} 
          />
        )}

        {selectedPage === "onchain-explorer" && (
          <OnchainExplorer 
            onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setSelectedPage("dashboard")} 
          />
        )}

        {selectedPage === "kol-intelligence" && (
          <KOLIntelligence 
            onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setSelectedPage("dashboard")} 
          />
        )}

        {selectedPage === "campaigns" && (
          <Campaigns 
            onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setSelectedPage("dashboard")} 
          />
        )}

        {selectedPage === "conversion-events" && (
          <ConversionEvents 
            onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setSelectedPage("dashboard")} 
          />
        )}

        {selectedPage === "advertise" && (
          <Advertise 
            onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setSelectedPage("dashboard")} 
          />
        )}

        {selectedPage === "history" && (
          <History 
            onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setSelectedPage("dashboard")} 
          />
        )}

        {selectedPage === "import-users" && (
          <ImportUsers 
            onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setSelectedPage("dashboard")} 
          />
        )}

        {selectedPage === "manage-websites" && (
          <ManageWebsites 
            onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)}
            onClose={() => setSelectedPage("dashboard")} 
          />
        )}

        {selectedPage === "settings" && (
          <Settings 
            onMenuClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)} 
            onClose={() => setSelectedPage("dashboard")} 
          />
        )}
      </div>

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
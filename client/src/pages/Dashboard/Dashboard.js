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
import History from "./History.js";
import ConversionEvents from './ConversionEvents.js'
import Campaigns from './Campaigns.js'
import Advertise from './Advertise.js'

const Dashboard = () => {
  // State management
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState("dashboard");
  const [screenSize, setScreenSize] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false
  });
  const location = useLocation();
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem("selectedTeam") || "");

  // Screen size detection with multiple breakpoints
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      setScreenSize({
        isMobile: width < 640, // Small mobile devices
        isTablet: width >= 640 && width < 1024, // Tablets and small laptops
        isDesktop: width >= 1024 // Desktops and large screens
      });
      
      // Auto-close sidebar on mobile, auto-open on desktop
      if (width >= 1024 && !isSidebarOpen) {
        setIsSidebarOpen(true);
      } else if (width < 640 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    
    // Initial check
    updateScreenSize();
    
    // Add event listener for resize
    window.addEventListener('resize', updateScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize);
  }, [isSidebarOpen]);

  // Sync selectedPage with URL
  useEffect(() => {
    const path = location.pathname;
    if (path === `/${selectedTeam}/dashboard`) {
      setSelectedPage("dashboard");
    } else if (path.includes('/settings')) {
      setSelectedPage("settings");
    } else {
      // Check for other routes
      const pages = [
        "offchain-analytics", "onchain-explorer", "kol-intelligence", 
        "campaigns", "conversion-events", "advertise", "history", 
        "import-users", "manage-websites"
      ];
      
      for (const page of pages) {
        if (path.includes(`/${page}`)) {
          setSelectedPage(page);
          break;
        }
      }
    }
  }, [location, selectedTeam]);

  const handleNavigation = (page) => {
    setSelectedPage(page);
    // Close sidebar on navigation only for mobile
    if (screenSize.isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  // Determine sidebar classes based on screen size
  const getSidebarClasses = () => {
    if (screenSize.isDesktop) {
      return "h-screen sticky top-0 flex-shrink-0 transition-all duration-300";
    }
    
    if (screenSize.isMobile || screenSize.isTablet) {
      return "fixed top-0 left-0 h-full z-50 transition-all duration-300 transform " + 
             (isSidebarOpen ? "translate-x-0" : "-translate-x-full");
    }
    
    return "h-screen sticky top-0 flex-shrink-0";
  };

  // Get correct content padding based on sidebar state and screen size
  const getMainContentClasses = () => {
    let baseClasses = "flex-1 flex flex-col overflow-y-auto relative transition-all duration-300 ";
    
    if (screenSize.isDesktop) {
      baseClasses += isSidebarOpen ? "ml-0" : "ml-0";
    }
    
    return baseClasses;
  };

  // Get main content padding
  const getMainPaddingClasses = () => {
    let paddingClasses = "p-4 md:p-6 lg:p-8 flex flex-col gap-4 md:gap-6 lg:gap-8 ";
    
    if (screenSize.isMobile) {
      paddingClasses += "pt-16"; // Extra padding for mobile menu button
    }
    
    return paddingClasses;
  };

  // Render component for current page
  const renderCurrentPage = () => {
    const commonProps = {
      onMenuClick: () => setIsSidebarOpen(!isSidebarOpen),
      onClose: () => setSelectedPage("dashboard"),
      screenSize: screenSize
    };

    switch (selectedPage) {
      case "dashboard":
        return (
          <>
            <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} screenSize={screenSize} />
            <main className={getMainPaddingClasses()}>
              <MarketingSection />
              <Tabs />
              <FeatureCards />
            </main>
          </>
        );
      case "offchain-analytics":
        return <OffchainAnalytics {...commonProps} />;
      case "onchain-explorer":
        return <OnchainExplorer {...commonProps} />;
      case "kol-intelligence":
        return <KOLIntelligence {...commonProps} />;
      case "campaigns":
        return <Campaigns {...commonProps} />;
      case "conversion-events":
        return <ConversionEvents {...commonProps} />;
      case "advertise":
        return <Advertise {...commonProps} />;
      case "history":
        return <History {...commonProps} />;
      case "import-users":
        return <ImportUsers {...commonProps} />;
      case "manage-websites":
        return <ManageWebsites {...commonProps} />;
      case "settings":
        return <Settings {...commonProps} />;
      default:
        return (
          <>
            <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} screenSize={screenSize} />
            <main className={getMainPaddingClasses()}>
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-gray-700">Page Not Found</h2>
                <p className="mt-2 text-gray-500">The page you're looking for doesn't exist.</p>
              </div>
            </main>
          </>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar - conditionally rendered based on screen size and state */}
      <div className={getSidebarClasses()}>
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onNavigate={handleNavigation}
          currentPage={selectedPage}
          isCompact={screenSize.isTablet && !isSidebarOpen}
          screenSize={screenSize}
        />
      </div>

      {/* Main content area */}
      <div className={getMainContentClasses()}>
        {/* Mobile menu toggle button */}
        {(screenSize.isMobile || screenSize.isTablet) && (
          <button 
            className="fixed top-4 left-4 p-2 bg-white rounded-md shadow-md text-gray-700 hover:bg-gray-200 focus:outline-none z-30"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            <Menu size={screenSize.isMobile ? 20 : 24} />
          </button>
        )}

        {/* Render the selected page */}
        {renderCurrentPage()}
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {(screenSize.isMobile || screenSize.isTablet) && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default Dashboard;
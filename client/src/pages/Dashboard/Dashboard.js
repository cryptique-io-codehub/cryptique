import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar.js";
import Header from "../../components/Header.js";
import Tabs from "./components/Tabs";
import { FeatureCards } from "./components/FeatureCards";
import MarketingSection from "./components/MarketingSection";
import Settings from "../Setting/Settings.js";
import { Menu, Home, BarChart, Activity } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import OffchainAnalytics from './OffchainAnalytics.js'
import OnchainExplorer from './OnchainExplorer.js'
import ManageWebsites from './ManageWebsites.js'
import ImportUsers from './ImportUsers.js'
import History from "./History.js";
import ConversionEvents from './ConversionEvents.js'
import Campaigns from './Campaigns.js'
import Advertise from './Advertise.js'
import CQIntelligence from './CQIntelligence.js'
import preloadData from '../../utils/preloadService.js'

const Dashboard = () => {
  // State management
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState("dashboard");
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [screenSize, setScreenSize] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false
  });
  const location = useLocation();
  const navigate = useNavigate();
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

  // Sync selectedPage with URL and preload data for new tabs
  useEffect(() => {
    const path = location.pathname;
    
    // Extract the current route from the path
    const pathSegments = path.split('/').filter(Boolean);
    const currentRoute = pathSegments.length > 1 ? pathSegments[1] : '';
    
    // Redirect old pricing route to settings/pricing
    if (currentRoute === 'pricing') {
      const team = pathSegments[0] || localStorage.getItem("selectedTeam") || '';
      if (team) {
        navigate(`/${team}/settings/pricing`, { replace: true });
        return;
      }
    }
    
    // Map route names to page identifiers
    const routeToPageMap = {
      'dashboard': 'dashboard',
      'offchain': 'offchain-analytics',
      'onchain': 'onchain-explorer',
      'campaigns': 'campaigns',
      'conversion-events': 'conversion-events',
      'advertise': 'advertise',
      'history': 'history',
      'importusers': 'import-users',
      'managewebsites': 'manage-websites',
      'cq-intelligence': 'cq-intelligence',
      'settings': 'settings'
    };
    
    // Set the selected page based on the current route
    const newPage = routeToPageMap[currentRoute] || 'dashboard';
    
    console.log("Current route:", currentRoute, "Selected page:", newPage);
    
    // If page is changing, preload data
    if (newPage !== selectedPage) {
      // Preload data when navigating to pages that need dropdowns
      if (newPage === 'onchain-explorer') {
        // Special handling for onchain explorer: actively clear the cache to force reload
        console.log("Navigating to onchain explorer, ensuring fresh contract data");
        
        // Clear preloaded contract data to ensure fresh load
        sessionStorage.removeItem("preloadedContracts");
        
        // Specifically preload the contract data
        const selectedTeam = localStorage.getItem("selectedTeam");
        if (selectedTeam) {
          preloadData()
            .then(() => console.log("Successfully preloaded fresh data for onchain page"))
            .catch(err => console.error("Error preloading data for onchain page:", err));
        }
      } else if (['offchain-analytics', 'campaigns', 'conversion-events', 'cq-intelligence'].includes(newPage)) {
        // For other pages with dropdowns, use regular preloading
        preloadData()
          .catch(err => console.error(`Error preloading data for ${newPage}:`, err));
      }
      
      setSelectedPage(newPage);
      
      // Force sidebar to be open but compact when in settings
      if (newPage === 'settings' && !screenSize.isMobile) {
        setIsSidebarOpen(true);
      }
    }
    
  }, [location, selectedPage, selectedTeam, navigate, screenSize]);

  // Update isCompactMode based on the selected page
  useEffect(() => {
    // If any page other than the dashboard is selected, enable compact mode
    setIsCompactMode(selectedPage !== "dashboard");
  }, [selectedPage]);

  // Make sure sidebar is visible and in compact mode when in Settings page
  useEffect(() => {
    // Always ensure sidebar is open on desktop for Settings page
    // This is crucial because the sidebar should not be hidden, just compacted
    if (selectedPage === "settings") {
      setIsSidebarOpen(true);
    }
  }, [selectedPage]);

  // Add team change detection
  useEffect(() => {
    let currentTeam = localStorage.getItem("selectedTeam");
    
    const handleTeamChange = () => {
      const newTeam = localStorage.getItem("selectedTeam");
      if (newTeam && newTeam !== currentTeam) {
        console.log(`Team changed in Dashboard: ${currentTeam} → ${newTeam}`);
        currentTeam = newTeam;
        
        // Force clear all cached data
        sessionStorage.removeItem("preloadedWebsites");
        sessionStorage.removeItem("preloadedContracts");
        
        // Use preload service to refresh all data
        preloadData(true, newTeam).catch(err => {
          console.error("Error preloading data after team change:", err);
        });
        
        // Forcefully reload the current page to ensure all components update
        // This is a more extreme solution but guarantees data is fresh
        setTimeout(() => {
          if (window.location.pathname.includes('onchain')) {
            // If we're on the onchain page, force a reload
            window.location.reload();
          }
        }, 500);
      }
    };
    
    // Check for team changes every 2 seconds
    const intervalId = setInterval(handleTeamChange, 2000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const handleNavigation = (page) => {
    setSelectedPage(page);
    // Close sidebar on navigation only for mobile
    if (screenSize.isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  // Get sidebar classes based on screen size and state
  const getSidebarClasses = () => {
    return "h-screen sticky top-0 flex-shrink-0";
  };

  // Get correct content padding based on sidebar state and screen size
  const getMainContentClasses = () => {
    let baseClasses = "flex-1 flex flex-col overflow-y-auto relative transition-all duration-300 ";
    
    if (screenSize.isDesktop) {
      // Both settings and other pages should have consistent behavior
      baseClasses += isSidebarOpen ? "ml-0" : "ml-0";
    }
    
    return baseClasses;
  };

  // Get main content padding
  const getMainPaddingClasses = () => {
    let paddingClasses = "p-4 md:p-6 lg:p-8 flex flex-col gap-4 md:gap-6 lg:gap-8 ";
    
    if (screenSize.isMobile) {
      paddingClasses += "pt-16 pb-20"; // Extra padding for mobile menu button and bottom spacing
    }
    
    return paddingClasses;
  };

  // Render component for current page
  const renderCurrentPage = () => {
    const commonProps = {
      // Important: When clicking the menu button in Settings page, we should only toggle the settings sidebar
      // not the main sidebar which should stay visible in compact mode
      onMenuClick: selectedPage === "settings" ? 
        () => console.log("Settings sidebar toggle") : // This will be handled in Settings.js
        () => setIsSidebarOpen(!isSidebarOpen),
      onClose: () => setSelectedPage("dashboard"),
      screenSize: screenSize,
      selectedPage: {selectedPage}
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
      case "cq-intelligence":
        return <CQIntelligence {...commonProps} />;
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
          isCompact={isCompactMode || (screenSize.isTablet && !isSidebarOpen)}
          screenSize={screenSize}
        />
      </div>

      {/* Main content area */}
      <div className={getMainContentClasses()}>
        {/* Mobile menu toggle button - always visible regardless of page */}
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
      
      {/* Quick access bottom navigation for mobile */}
      {screenSize.isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 z-30">
          <button 
            className={`p-2 rounded-full flex flex-col items-center ${selectedPage === "dashboard" ? "text-blue-600" : "text-gray-600"}`}
            onClick={() => handleNavigation("dashboard")}
            aria-label="Dashboard"
          >
            <Home size={20} />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button 
            className={`p-2 rounded-full flex flex-col items-center ${selectedPage === "offchain-analytics" ? "text-blue-600" : "text-gray-600"}`}
            onClick={() => handleNavigation("offchain-analytics")}
            aria-label="Analytics"
          >
            <BarChart size={20} />
            <span className="text-xs mt-1">Analytics</span>
          </button>
          <button 
            className={`p-2 rounded-full flex flex-col items-center ${selectedPage === "campaigns" ? "text-blue-600" : "text-gray-600"}`}
            onClick={() => handleNavigation("campaigns")}
            aria-label="Campaigns"
          >
            <Activity size={20} />
            <span className="text-xs mt-1">Campaigns</span>
          </button>
          <button 
            className={`p-2 rounded-full flex flex-col items-center ${selectedPage === "settings" ? "text-blue-600" : "text-gray-600"}`}
            onClick={() => handleNavigation("settings")}
            aria-label="Settings"
          >
            <Settings size={20} />
            <span className="text-xs mt-1">Settings</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
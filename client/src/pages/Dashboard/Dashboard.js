import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar.js";
import Header from "../../components/Header.js";
import Tabs from "./components/Tabs";
import { FeatureCards } from "./components/FeatureCards";
import MarketingSection from "./components/MarketingSection";
import Settings from "../Setting/Settings.js";
import { Menu, Home, BarChart, Activity, ArrowRight } from "lucide-react";
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
import SubscriptionRequired from "../../components/SubscriptionRequired.js";
import { useSubscription } from "../../context/subscriptionContext.js";
import axiosInstance from '../../axiosInstance';
import sdkApi from '../../utils/sdkApi.js';
import { useContractData } from "../../contexts/ContractDataContext";

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
  const [isLoading, setIsLoading] = useState(false);
  
  // Get contract data from context
  const { contractArray, isLoadingContracts, refreshContracts } = useContractData();
  
  // Style definitions matching the brand
  const styles = {
    primaryColor: "#1d0c46", // Deep purple
    accentColor: "#caa968",  // Gold accent
    futuristicGradient: "linear-gradient(135deg, #1d0c46 0%, #3a1d8a 50%, #1d0c46 100%)",
    backgroundColor: "#f8f8ff"
  };
  
  // Get subscription status at component level
  const { isActive: hasSubscription, plan, status } = useSubscription();
  
  // Log subscription status on mount and when it changes
  useEffect(() => {
    console.log('Dashboard subscription status:', { hasSubscription, plan, status, currentPage: selectedPage });
  }, [hasSubscription, plan, status, selectedPage]);

  // Screen size detection with multiple breakpoints
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      setScreenSize({
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024
      });
      
      if (width >= 1024 && !isSidebarOpen) {
        setIsSidebarOpen(true);
      } else if (width < 640 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, [isSidebarOpen]);

  // Refresh contracts when dashboard loads
  useEffect(() => {
    if (refreshContracts) {
      refreshContracts();
    }
  }, [refreshContracts]);

  // Sync selectedPage with URL
  useEffect(() => {
    const path = location.pathname;
    const pathSegments = path.split('/').filter(Boolean);
    const currentRoute = pathSegments.length > 1 ? pathSegments[1] : '';
    
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
    
    const newPage = routeToPageMap[currentRoute] || 'dashboard';
    setSelectedPage(newPage);
  }, [location]);

  const handleNavigation = (page) => {
    setSelectedPage(page);
    navigate(`/${selectedTeam}/${page}`);
  };

  // Render smart contracts
  const renderSmartContracts = () => {
    if (isLoadingContracts) {
      return (
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded w-full mb-2"></div>
        </div>
      );
    }

    if (!contractArray || contractArray.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500">
          <p>No smart contracts connected</p>
          <button 
            onClick={() => navigate(`/${selectedTeam}/onchain`)}
            className="mt-2 text-sm font-medium"
            style={{ color: styles.primaryColor }}
          >
            Connect a smart contract
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <div className="text-3xl font-bold mb-1">{contractArray.length}</div>
          <p className="text-gray-500 text-sm">Connected Smart Contracts</p>
        </div>
        <div className="mt-4">
          <button 
            onClick={() => navigate(`/${selectedTeam}/onchain`)}
            className="text-sm font-medium hover:underline"
            style={{ color: styles.primaryColor }}
          >
            View all contracts
          </button>
        </div>
      </div>
    );
  };

  // Get sidebar classes based on screen size and state
  const getSidebarClasses = () => {
    if (selectedPage === "settings" && screenSize.isDesktop) {
      return "h-screen sticky top-0 flex-shrink-0 visible";
    }
    return "h-screen sticky top-0 flex-shrink-0";
  };

  // Get main content classes
  const getMainContentClasses = () => {
    let baseClasses = "flex-1 flex flex-col overflow-y-auto relative transition-all duration-300 ";
    if (screenSize.isDesktop) {
      baseClasses += isSidebarOpen ? "ml-0" : "ml-0";
    }
    return baseClasses;
  };

  // Get main padding classes
  const getMainPaddingClasses = () => {
    let paddingClasses = "p-4 md:p-6 lg:p-8 flex flex-col gap-4 md:gap-6 lg:gap-8 ";
    if (screenSize.isMobile) {
      paddingClasses += "pt-16 pb-20";
    }
    return paddingClasses;
  };

  // Render component for current page
  const renderCurrentPage = () => {
    const commonProps = {
      onMenuClick: selectedPage === "settings" ? 
        () => console.log("Settings sidebar toggle") : 
        () => setIsSidebarOpen(!isSidebarOpen),
      onClose: () => setSelectedPage("dashboard"),
      screenSize: screenSize,
      selectedPage: selectedPage,
      isSidebarOpen: isSidebarOpen
    };

    const freePages = ['dashboard', 'settings'];
    
    const withSubscriptionCheck = (component, featureName) => {
      if (freePages.includes(selectedPage)) {
        return component;
      }
      return <SubscriptionRequired featureName={featureName}>{component}</SubscriptionRequired>;
    };

    switch (selectedPage) {
      case "dashboard":
        return (
          <>
            <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} screenSize={screenSize} />
            <main 
              className={getMainPaddingClasses()} 
              style={{ background: styles.backgroundColor }}
            >
              <MarketingSection />
              <Tabs isSidebarOpen={isSidebarOpen} />

              {/* Dashboard Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <FeatureCards />
                
                {/* Smart Contracts Panel */}
                <div 
                  className="rounded-lg p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-full border border-gray-100 bg-white"
                  onClick={() => navigate(`/${selectedTeam}/onchain`)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">
                        Smart Contracts
                      </h3>
                      <div className="p-1.5 rounded-full" style={{ backgroundColor: `${styles.primaryColor}10` }}>
                        <Activity size={20} style={{ color: styles.accentColor }} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Manage your blockchain smart contracts
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {!isLoadingContracts && contractArray && (
                      <div>
                        <span className="text-2xl font-semibold">{contractArray.length}</span>
                        <span className="text-xs ml-1 text-gray-500">Connected</span>
                      </div>
                    )}
                    {isLoadingContracts && (
                      <div className="animate-pulse h-6 bg-gray-200 rounded w-16"></div>
                    )}
                    
                    <div className="flex items-center text-sm font-medium">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </>
        );
      case "offchain-analytics":
        return withSubscriptionCheck(
          <OffchainAnalytics {...commonProps} />,
          "website analytics"
        );
      case "onchain-explorer":
        return withSubscriptionCheck(
          <OnchainExplorer {...commonProps} />,
          "blockchain analytics"
        );
      case "campaigns":
        return withSubscriptionCheck(
          <Campaigns {...commonProps} />,
          "campaign management"
        );
      case "conversion-events":
        return withSubscriptionCheck(
          <ConversionEvents {...commonProps} />,
          "conversion tracking"
        );
      case "advertise":
        return withSubscriptionCheck(
          <Advertise {...commonProps} />,
          "advertising features"
        );
      case "history":
        return withSubscriptionCheck(
          <History {...commonProps} />,
          "historical data"
        );
      case "import-users":
        return withSubscriptionCheck(
          <ImportUsers {...commonProps} />,
          "user import functionality"
        );
      case "manage-websites":
        return withSubscriptionCheck(
          <ManageWebsites {...commonProps} />,
          "website management"
        );
      case "cq-intelligence":
        return withSubscriptionCheck(
          <CQIntelligence {...commonProps} />,
          "advanced intelligence features"
        );
      case "settings":
        return <Settings onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />;
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
    <div className="flex h-screen overflow-hidden space-x-0" style={{ background: styles.backgroundColor }}>
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

      <div className={getMainContentClasses()}>
        {(screenSize.isMobile || screenSize.isTablet) && (
          <button 
            className="fixed top-4 left-4 p-2 bg-white rounded-md shadow-md text-gray-700 hover:bg-gray-200 focus:outline-none z-30"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            <Menu size={screenSize.isMobile ? 20 : 24} />
          </button>
        )}

        {renderCurrentPage()}
      </div>

      {(screenSize.isMobile || screenSize.isTablet) && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {screenSize.isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 z-30">
          <button 
            className={`p-2 rounded-full flex flex-col items-center ${selectedPage === "dashboard" ? "text-blue-600" : "text-gray-600"}`}
            onClick={() => handleNavigation("dashboard")}
            aria-label="Dashboard"
            style={{ color: selectedPage === "dashboard" ? styles.primaryColor : undefined }}
          >
            <Home size={20} />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button 
            className={`p-2 rounded-full flex flex-col items-center ${selectedPage === "offchain-analytics" ? "text-blue-600" : "text-gray-600"}`}
            onClick={() => handleNavigation("offchain")}
            aria-label="Analytics"
            style={{ color: selectedPage === "offchain-analytics" ? styles.primaryColor : undefined }}
          >
            <BarChart size={20} />
            <span className="text-xs mt-1">Analytics</span>
          </button>
          <button 
            className={`p-2 rounded-full flex flex-col items-center ${selectedPage === "campaigns" ? "text-blue-600" : "text-gray-600"}`}
            onClick={() => handleNavigation("campaigns")}
            aria-label="Campaigns"
            style={{ color: selectedPage === "campaigns" ? styles.primaryColor : undefined }}
          >
            <Activity size={20} />
            <span className="text-xs mt-1">Campaigns</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
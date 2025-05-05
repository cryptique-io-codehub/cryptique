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
import ImportUsers from './ImportUsers.js'
import History from "./History.js";
import ConversionEvents from './ConversionEvents.js'
import Campaigns from './Campaigns.js'
import Advertise from './Advertise.js'
import CQIntelligence from './CQIntelligence.js'
import axiosInstance from "../../axiosInstance";

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
  const [websiteArray, setWebsiteArray] = useState([]);
  const [contractArray, setContractArray] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

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

  // Fetch website and contract data on component mount (right after login)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (dataLoaded) return; // Only load once
      
      setIsLoading(true);
      try {
        // Fetch websites
        const teamName = localStorage.getItem("selectedTeam");
        if (!teamName) {
          setIsLoading(false);
          return;
        }
        
        console.log("Fetching initial website data for team:", teamName);
        const websiteResponse = await axiosInstance.get(`/website/team/${teamName}`);
        
        if (websiteResponse.status === 200 && websiteResponse.data.websites) {
          const websites = websiteResponse.data.websites;
          setWebsiteArray(websites);
          
          // Auto-verify websites with analytics data
          try {
            await axiosInstance.post('/website/auto-verify-all');
            console.log('Auto-verify process completed');
            
            // Get the updated websites with verification status
            const updatedResponse = await axiosInstance.get(`/website/team/${teamName}`);
            if (updatedResponse.status === 200) {
              setWebsiteArray(updatedResponse.data.websites);
              
              // If we have websites, set the first one as selected and fetch its analytics
              if (updatedResponse.data.websites.length > 0) {
                const firstWebsite = updatedResponse.data.websites[0];
                
                // Save to localStorage for persistence
                localStorage.setItem("selectedWebsite", firstWebsite.domain);
                localStorage.setItem("idy", firstWebsite.siteId);
                
                // Fetch analytics for this website
                try {
                  const analyticsResponse = await axiosInstance.get(`/analytics/site/${firstWebsite.siteId}`);
                  if (analyticsResponse.status === 200) {
                    setAnalytics(analyticsResponse.data);
                  }
                } catch (analyticsError) {
                  console.error("Error fetching analytics:", analyticsError);
                }
              }
            }
          } catch (verifyError) {
            console.error('Error in auto-verify process:', verifyError);
          }
        }
        
        // Fetch smart contracts
        try {
          const contractResponse = await axiosInstance.get(`/contracts/team/${teamName}`);
          
          if (contractResponse.data && contractResponse.data.contracts) {
            const contracts = contractResponse.data.contracts.map(contract => ({
              id: contract.contractId,
              address: contract.address,
              name: contract.name,
              blockchain: contract.blockchain,
              tokenSymbol: contract.tokenSymbol,
              added_at: contract.createdAt,
              verified: contract.verified
            }));
            
            setContractArray(contracts);
            
            // If we have contracts, set the first one as selected
            if (contracts.length > 0) {
              const firstContract = contracts[0];
              localStorage.setItem("selectedContract", firstContract.id);
            }
          }
        } catch (contractError) {
          console.error("Error fetching contracts:", contractError);
        }
        
        setDataLoaded(true);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [dataLoaded]);

  // Sync selectedPage with URL
  useEffect(() => {
    const path = location.pathname;
    
    // Extract the current route from the path
    const pathSegments = path.split('/').filter(Boolean);
    const currentRoute = pathSegments.length > 1 ? pathSegments[1] : '';
    
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
    if (routeToPageMap[currentRoute]) {
      setSelectedPage(routeToPageMap[currentRoute]);
    } else {
      setSelectedPage('dashboard'); // Default to dashboard
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
      screenSize: screenSize,
      selectedPage: {selectedPage},
      websitearray: websiteArray,
      setWebsitearray: setWebsiteArray,
      contractarray: contractArray,
      setcontractarray: setContractArray,
      analytics: analytics,
      setanalytics: setAnalytics,
      idy: localStorage.getItem("idy")
    };

    switch (selectedPage) {
      case "dashboard":
        return (
          <>
            <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} screenSize={screenSize} />
            <main className={getMainPaddingClasses()}>
              {isLoading && (
                <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
                  <div className="flex flex-col items-center p-8 rounded-lg">
                    <div className="w-12 h-12 border-t-4 border-[#caa968] rounded-full animate-spin mb-4"></div>
                    <p className="text-lg font-medium text-gray-800">Loading your data...</p>
                  </div>
                </div>
              )}
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
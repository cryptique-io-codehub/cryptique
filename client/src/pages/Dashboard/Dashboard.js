import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar.js";
import Header from "../../components/Header.js";
import Tabs from "./components/Tabs";
import MarketingSection from "./components/MarketingSection";
import Settings from "../Setting/Settings.js";
import { Menu, Home, BarChart, Activity, ArrowRight, ExternalLink, Users, Trophy, LineChart, Clock, Zap } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [dataFetching, setDataFetching] = useState(false);
  const [websiteData, setWebsiteData] = useState({
    totalWebsites: 0,
    recentVisitors: 0,
    activeWebsites: 0,
    activeCampaigns: 0
  });
  
  // Get contract data from context
  const { contractArray, isLoadingContracts, refreshContracts } = useContractData();
  
  // Listen for global loading events
  useEffect(() => {
    const handleGlobalLoading = (event) => {
      console.log('Dashboard received global loading event:', event.detail);
      setDataFetching(event.detail.isLoading);
    };
    
    window.addEventListener('globalDataLoading', handleGlobalLoading);
    
    return () => {
      window.removeEventListener('globalDataLoading', handleGlobalLoading);
    };
  }, []);
  
  // Listen for team changes
  useEffect(() => {
    const handleTeamChange = () => {
      const currentTeam = localStorage.getItem("selectedTeam");
      if (currentTeam !== selectedTeam) {
        console.log(`Team changed from "${selectedTeam}" to "${currentTeam}"`);
        setSelectedTeam(currentTeam);
        
        // Force refresh data when team changes
        setDataFetching(true);
        preloadData(true, currentTeam, (isLoading) => setDataFetching(isLoading));
      }
    };
    
    // Set up event listeners
    window.addEventListener('storage', handleTeamChange);
    window.addEventListener('teamDataUpdated', handleTeamChange);
    
    return () => {
      window.removeEventListener('storage', handleTeamChange);
      window.removeEventListener('teamDataUpdated', handleTeamChange);
    };
  }, [selectedTeam]);
  
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

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Refresh contracts data
        if (refreshContracts) {
          refreshContracts();
        }
        
        // Fetch websites for this team
        const teamId = selectedTeam;
        if (!teamId) return;

        const response = await axiosInstance.get(`/website/team/${teamId}`);
        
        if (response.data && response.data.websites) {
          const websites = response.data.websites;
          const activeWebs = websites.filter(site => site.isActive).length;
          
          // Get sample analytics data for the first website if available
          let visitorCount = 0;
          let campaignCount = 0;
          
          if (websites.length > 0) {
            const firstWebsite = websites[0];
            
            try {
              // Fetch analytics data
              const analyticsResponse = await sdkApi.getAnalytics(firstWebsite.siteId);
              if (analyticsResponse && analyticsResponse.analytics) {
                visitorCount = analyticsResponse.analytics.uniqueVisitors || 0;
              }
            } catch (err) {
              console.error("Error fetching analytics:", err);
            }
            
            try {
              // Fetch campaign data for the first website
              const campaignResponse = await axiosInstance.get(`/campaign/site/${firstWebsite.siteId}`);
              if (campaignResponse && campaignResponse.data && campaignResponse.data.campaigns) {
                campaignCount = campaignResponse.data.campaigns.length;
              }
            } catch (err) {
              console.error("Error fetching campaigns:", err);
              // If there's an error, we'll leave the campaign count at 0
            }
          }
          
          setWebsiteData({
            totalWebsites: websites.length,
            recentVisitors: visitorCount,
            activeWebsites: activeWebs,
            activeCampaigns: campaignCount
          });
        }
      } catch (error) {
        console.error("Error fetching website data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedTeam, refreshContracts]);

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
      'managewebsites': 'managewebsites',
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

  // Define dashboard cards
  const dashboardCards = [
    {
      title: "Quick Setup Guide",
      description: "Learn how to add the Cryptique tracking script to your website",
      icon: <Zap size={20} style={{ color: styles.accentColor }} />,
      path: "https://cryptique.gitbook.io/cryptique",
      external: true,
      color: styles.primaryColor,
      textLight: true
    },
    {
      title: "Manage Websites",
      description: `You have ${websiteData.totalWebsites} registered websites`,
      icon: <LineChart size={20} style={{ color: styles.accentColor }} />,
      path: "managewebsites",
      external: false,
      metric: websiteData.totalWebsites,
      metricLabel: "Websites"
    },
    {
      title: "Recent Visitors",
      description: "Monitor your website traffic",
      icon: <Users size={20} style={{ color: styles.accentColor }} />,
      path: "offchain",
      external: false,
      metric: websiteData.recentVisitors,
      metricLabel: "Visitors"
    },
    {
      title: "Campaign Performance",
      description: "Track your marketing campaigns",
      icon: <Trophy size={20} style={{ color: styles.accentColor }} />,
      path: "campaigns",
      external: false,
      metric: websiteData.activeCampaigns,
      metricLabel: "Active"
    },
    {
      title: "Smart Contracts",
      description: "Manage your blockchain smart contracts",
      icon: <Activity size={20} style={{ color: styles.accentColor }} />,
      path: "onchain",
      external: false,
      metric: contractArray ? contractArray.length : 0,
      metricLabel: "Connected",
      isContractCard: true
    }
  ];

  const handleCardClick = (path, external) => {
    if (external) {
      window.open(path, '_blank');
    } else {
      navigate(`/${selectedTeam}/${path}`);
    }
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
              {hasSubscription ? (
                // Premium user dashboard
                <>
              <MarketingSection />
                  <Tabs isSidebarOpen={isSidebarOpen} />

                  {/* Dashboard Grid Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                    {/* Loading Skeleton */}
                    {isLoading || isLoadingContracts ? (
                      [...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg p-5 shadow-sm animate-pulse h-[160px]">
                          <div className="h-6 bg-gray-200 rounded mb-3 w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded mb-4 w-full"></div>
                          <div className="flex justify-between items-end mt-8">
                            <div className="h-8 bg-gray-200 rounded w-16"></div>
                            <div className="h-5 bg-gray-200 rounded w-5"></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      /* Feature Cards */
                      dashboardCards.map((card, index) => (
                        <div
                          key={index}
                          onClick={() => handleCardClick(card.path, card.external)}
                          className={`rounded-lg p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-[160px] border border-gray-100`}
                          style={{
                            backgroundColor: index === 0 ? styles.primaryColor : 'white',
                            color: index === 0 ? 'white' : 'inherit'
                          }}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className={`font-semibold text-lg ${index === 0 ? 'text-white' : ''}`}>
                                {card.title}
                              </h3>
                              <div className={`p-1.5 rounded-full ${index === 0 ? 'bg-white/10' : `bg-${styles.primaryColor}/10`}`}>
                                {card.icon}
                              </div>
                            </div>
                            <p className={`text-sm ${index === 0 ? 'text-white/80' : 'text-gray-500'} mb-4`}>
                              {card.description}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            {card.metric !== undefined && (
                              <div>
                                <span className="text-2xl font-semibold">{card.metric}</span>
                                <span className={`text-xs ml-1 ${index === 0 ? 'text-white/70' : 'text-gray-500'}`}>{card.metricLabel}</span>
                              </div>
                            )}
                            
                            <div className={`flex items-center text-sm font-medium ${index === 0 ? 'text-white' : ''}`}>
                              {card.external ? (
                                <ExternalLink size={16} className={index === 0 ? 'text-white' : ''} />
                              ) : (
                                <ArrowRight size={16} className={index === 0 ? 'text-white' : ''} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                // Free user marketing dashboard
                <div className="max-w-7xl mx-auto">
                  {/* Hero Section */}
                  <div className="rounded-xl overflow-hidden mb-6">
                    <div 
                      className="px-6 py-6 md:py-10 flex flex-col items-center text-center"
                      style={{ background: styles.futuristicGradient }}
                    >
                      <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                        Unlock the Full Power of <span style={{ color: styles.accentColor }}>Cryptique</span>
                      </h1>
                      <p className="md:text-lg text-white/80 max-w-2xl mb-4">
                        Track website visitors, analyze blockchain data, and grow your Web3 project.
                      </p>
                      <button
                        onClick={() => navigate(`/${selectedTeam}/settings/pricing`)}
                        className="px-6 py-2 rounded-lg font-semibold transition-transform hover:scale-105 shadow-lg"
                        style={{ background: styles.accentColor, color: styles.primaryColor }}
                      >
                        Upgrade Now
                      </button>
                    </div>
                  </div>

                  {/* Feature Highlights */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: `${styles.primaryColor}20` }}>
                        <Users size={24} style={{ color: styles.primaryColor }} />
                      </div>
                      <h3 className="text-xl font-semibold mb-2" style={{ color: styles.primaryColor }}>Web2 Analytics</h3>
                      <p className="text-gray-600 mb-4">Track visitors, monitor conversions, and analyze user behavior across your websites.</p>
                      <div className="border-t border-gray-100 pt-4 mt-auto">
                        <ul className="space-y-2">
                          <li className="flex items-center text-sm text-gray-600">
                            <div className="w-4 h-4 mr-2 text-green-500">✓</div>
                            Visitor tracking
                          </li>
                          <li className="flex items-center text-sm text-gray-600">
                            <div className="w-4 h-4 mr-2 text-green-500">✓</div>
                            Conversion analytics
                          </li>
                          <li className="flex items-center text-sm text-gray-600">
                            <div className="w-4 h-4 mr-2 text-green-500">✓</div>
                            Campaign management
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: `${styles.primaryColor}20` }}>
                        <Activity size={24} style={{ color: styles.primaryColor }} />
                      </div>
                      <h3 className="text-xl font-semibold mb-2" style={{ color: styles.primaryColor }}>Blockchain Analytics</h3>
                      <p className="text-gray-600 mb-4">Connect your smart contracts and gain insights from on-chain data in real-time.</p>
                      <div className="border-t border-gray-100 pt-4 mt-auto">
                        <ul className="space-y-2">
                          <li className="flex items-center text-sm text-gray-600">
                            <div className="w-4 h-4 mr-2 text-green-500">✓</div>
                            Smart contract monitoring
                          </li>
                          <li className="flex items-center text-sm text-gray-600">
                            <div className="w-4 h-4 mr-2 text-green-500">✓</div>
                            Transaction analysis
                          </li>
                          <li className="flex items-center text-sm text-gray-600">
                            <div className="w-4 h-4 mr-2 text-green-500">✓</div>
                            Multi-chain support
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: `${styles.primaryColor}20` }}>
                        <Trophy size={24} style={{ color: styles.primaryColor }} />
                      </div>
                      <h3 className="text-xl font-semibold mb-2" style={{ color: styles.primaryColor }}>Marketing Tools</h3>
                      <p className="text-gray-600 mb-4">Create, manage, and track the performance of your marketing campaigns.</p>
                      <div className="border-t border-gray-100 pt-4 mt-auto">
                        <ul className="space-y-2">
                          <li className="flex items-center text-sm text-gray-600">
                            <div className="w-4 h-4 mr-2 text-green-500">✓</div>
                            Campaign tracking
                          </li>
                          <li className="flex items-center text-sm text-gray-600">
                            <div className="w-4 h-4 mr-2 text-green-500">✓</div>
                            Performance metrics
                          </li>
                          <li className="flex items-center text-sm text-gray-600">
                            <div className="w-4 h-4 mr-2 text-green-500">✓</div>
                            Conversion optimization
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Resources Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div 
                      className="rounded-lg p-6 shadow-md border border-gray-100 flex flex-col hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => window.open('https://blog.cryptique.io', '_blank')}
                      style={{ background: `linear-gradient(135deg, #1d0c46 0%, #2d1c56 100%)` }}
                    >
                      <h3 className="text-xl font-semibold mb-2 text-white">Cryptique Blog</h3>
                      <p className="text-white/80 mb-6">Stay updated with the latest Web3 analytics trends and Cryptique features.</p>
                      <div className="mt-auto flex items-center text-white/90">
                        <span className="text-sm font-medium">Visit our blog</span>
                        <ExternalLink size={16} className="ml-2" />
                      </div>
                    </div>

                    <div 
                      className="rounded-lg p-6 shadow-md border border-gray-100 flex flex-col hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => window.open('https://cryptique.gitbook.io/cryptique', '_blank')}
                      style={{ background: `linear-gradient(135deg, #1d0c46 0%, #2d1c56 100%)` }}
                    >
                      <h3 className="text-xl font-semibold mb-2 text-white">Documentation</h3>
                      <p className="text-white/80 mb-6">Learn how to implement and get the most out of Cryptique with our detailed guides.</p>
                      <div className="mt-auto flex items-center text-white/90">
                        <span className="text-sm font-medium">Read the docs</span>
                        <ExternalLink size={16} className="ml-2" />
                      </div>
                    </div>

                    <div 
                      className="rounded-lg p-6 shadow-md border border-gray-100 flex flex-col hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => navigate(`/${selectedTeam}/settings/pricing`)}
                      style={{ background: styles.accentColor }}
                    >
                      <h3 className="text-xl font-semibold mb-2" style={{ color: styles.primaryColor }}>Upgrade Now</h3>
                      <p className="mb-6" style={{ color: `${styles.primaryColor}DD` }}>Get unlimited access to all Cryptique features and start optimizing your Web3 project today.</p>
                      <div className="mt-auto flex items-center" style={{ color: styles.primaryColor }}>
                        <span className="text-sm font-medium">View pricing</span>
                        <ArrowRight size={16} className="ml-2" />
                      </div>
                    </div>
                  </div>

                  {/* Testimonials */}
                  <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 mb-8">
                    <h3 className="text-xl font-semibold mb-6 text-center" style={{ color: styles.primaryColor }}>What Our Users Say</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 rounded-lg" style={{ background: `${styles.primaryColor}08` }}>
                        <p className="italic text-gray-600 mb-4">"Cryptique has transformed how we understand our Web3 audience. The integration of on-chain and website analytics gives us insights we couldn't get anywhere else."</p>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gray-300 mr-3"></div>
                          <div>
                            <p className="font-medium" style={{ color: styles.primaryColor }}>Dr Raghvendra Husangi</p>
                            <p className="text-sm text-gray-500">CMO, Zeebu</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg" style={{ background: `${styles.primaryColor}08` }}>
                        <p className="italic text-gray-600 mb-4">"The campaign tracking features have increased our conversion rates by 37%. The ROI on Cryptique was immediate and substantial."</p>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gray-300 mr-3"></div>
                          <div>
                            <p className="font-medium" style={{ color: styles.primaryColor }}>Evie Adamson</p>
                            <p className="text-sm text-gray-500">CMO, THAT</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Section */}
                  <div 
                    className="rounded-lg p-8 text-center mb-8"
                    style={{ background: styles.futuristicGradient }}
                  >
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to unlock the full power of Cryptique?</h2>
                    <p className="text-white/80 max-w-2xl mx-auto mb-6">Join thousands of Web3 projects that are growing faster with our comprehensive analytics platform.</p>
                    <button
                      onClick={() => navigate(`/${selectedTeam}/settings/pricing`)}
                      className="px-8 py-3 rounded-lg text-lg font-semibold transition-transform hover:scale-105 shadow-lg"
                      style={{ background: styles.accentColor, color: styles.primaryColor }}
                    >
                      Upgrade Now
                    </button>
                  </div>
                </div>
              )}
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
      case "managewebsites":
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
      {/* Show loading overlay when data is being fetched */}
      {dataFetching && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20 text-center">
            <div className="mb-4">
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
            </div>
            <p className="text-white font-semibold">Loading team data...</p>
            <p className="text-gray-300 text-sm mt-1">This may take a moment</p>
          </div>
        </div>
      )}
      
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
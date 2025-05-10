import React, { useState, useEffect } from "react";
import { CreditCard, Users, Settings as SettingsIcon, Menu, ChevronDown, X, Tag } from "lucide-react";
import Header from "../../components/Header";
import Billing from "./Billing/Billing";
import TeamsSection from "./TeamsSection";
import PricingSection from "./PricingSection";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTeam } from "../../context/teamContext";

const Settings = ({ onMenuClick, screenSize = {}, isSidebarVisible = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { team } = useParams();
  const [seteam, setseTeam] = useState(localStorage.getItem("selectedTeam"));
  const [isCompactMode, setIsCompactMode] = useState(true); // Settings sidebar should be compact by default
  const [isHovering, setIsHovering] = useState(false);

  // Determine active section based on current path
  const determineActiveSection = () => {
    const path = location.pathname;
    if (path.includes('/billing')) return 'billing';
    if (path.includes('/teamsSection')) return 'teams';
    if (path.includes('/pricing')) return 'pricing';
    return 'general';
  };

  const [activeSection, setActiveSection] = useState(determineActiveSection);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(true); // Start with settings sidebar open on desktop

  useEffect(() => {
    setseTeam(localStorage.getItem("selectedTeam"));
  }, [team]);

  useEffect(() => {
    // Update active section when route changes
    setActiveSection(determineActiveSection());
  }, [location.pathname]);
  
  // Close sidebar when resizing to larger screens but keep it visible on desktop
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        // On desktop, settings sidebar should be open by default
        setSettingsSidebarOpen(true);
      } else {
        // On mobile, settings sidebar should be closed by default
        setSettingsSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const toggleSettingsSidebar = () => {
    setSettingsSidebarOpen(!settingsSidebarOpen);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };
  
  const handleSectionChange = (section) => {
    setActiveSection(section);
    // Navigate to the corresponding route
    switch(section) {
      case 'general':
        navigate(`/${seteam}/settings`);
        break;
      case 'billing':
        navigate(`/${seteam}/settings/billing`);
        break;
      case 'teams':
        navigate(`/${seteam}/settings/teamsSection`);
        break;
      case 'pricing':
        navigate(`/${seteam}/settings/pricing`);
        break;
    }

    // On mobile, close the sidebar after selecting a section
    if (window.innerWidth < 1024) {
      setSettingsSidebarOpen(false);
    }
  };

  // Determine if we should show expanded content
  const showExpanded = !isCompactMode || isHovering;
  
  // Initialize a local isMobile variable with fallback
  const isMobile = screenSize && screenSize.isMobile;
  
  return (
    <>
      <Header onMenuClick={onMenuClick} screenSize={screenSize} />
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Content area with header and flexible content */}
        <div className="flex flex-col w-full h-screen">
          {/* Content area below header */}
          <div className="flex flex-1 overflow-hidden">
            {/* Settings sidebar - positioned like the second nav in on-chain/off-chain */}
            <div 
              style={{ borderLeft: 0, margin: 0, padding: 0 }}
              className={`${
                settingsSidebarOpen ? 'md:w-48 md:static md:block bg-white shadow-md h-full flex-shrink-0 transition-all duration-300 border-r border-gray-200' : 'hidden lg:hidden'
              }`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">Settings</h2>
                  <p className="text-xs text-gray-500">Manage your analytics</p>
                </div>
                <button 
                  className="lg:hidden" 
                  onClick={() => setSettingsSidebarOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <nav className="p-4 space-y-2 overflow-y-auto max-h-full">
                {/* General button */}
                <div 
                  onClick={() => handleSectionChange("general")}
                  className={`px-3 py-2 rounded-md cursor-pointer ${
                    activeSection === "general" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                  } text-sm`}
                >
                  <div className="flex items-center gap-2">
                    <SettingsIcon size={16} />
                    <span>General</span>
                  </div>
                </div>
                
                {/* Billing button */}
                <div 
                  onClick={() => handleSectionChange("billing")}
                  className={`px-3 py-2 rounded-md cursor-pointer ${
                    activeSection === "billing" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                  } text-sm`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} />
                    <span>Billing</span>
                  </div>
                </div>
                
                {/* Pricing button */}
                <div 
                  onClick={() => handleSectionChange("pricing")}
                  className={`px-3 py-2 rounded-md cursor-pointer ${
                    activeSection === "pricing" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                  } text-sm`}
                >
                  <div className="flex items-center gap-2">
                    <Tag size={16} />
                    <span>Pricing Plans</span>
                  </div>
                </div>
                
                {/* Teams button */}
                <div 
                  onClick={() => handleSectionChange("teams")}
                  className={`px-3 py-2 rounded-md cursor-pointer ${
                    activeSection === "teams" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                  } text-sm`}
                >
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>Manage Teams</span>
                  </div>
                </div>
                
                <div className="p-2 border-t mt-4 text-xs text-gray-500">
                  Settings for {seteam}
                </div>
              </nav>
            </div>
            
            {/* Button to open sidebar on mobile */}
            <div className="lg:hidden fixed top-4 left-16 z-40 p-2 bg-white rounded-md shadow-md">
              <button 
                onClick={toggleSettingsSidebar}
                className="p-1"
              >
                <Menu size={20} />
              </button>
            </div>
            
            {/* Right content area - scrollable */}
            <div className="flex-grow overflow-y-auto">
              {/* Settings content based on active section */}
              {activeSection === "general" && (
                <div className="p-4 sm:p-6 bg-white m-4 rounded-lg shadow-sm">
                  <div className="max-w-4xl">
                    <h1 className="text-2xl font-bold mb-6">General Settings</h1>

                    {/* API Keys Section */}
                    <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h2 className="text-xl font-semibold">API Keys</h2>
                          <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full border border-purple-200">Coming Soon</span>
                        </div>
                        <button className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors opacity-50 cursor-not-allowed">
                          Generate New Key
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Use API keys to access Cryptique data programmatically. This feature is currently in development and will be available soon.
                      </p>

                      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg mb-4 opacity-70">
                        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
                          <div>
                            <span className="font-medium text-sm">Example API Key</span>
                            <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">Preview</span>
                          </div>
                          <span className="text-xs text-gray-500">Coming Soon</span>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                          <div className="flex-1 font-mono text-sm bg-gray-50 p-2 rounded mr-4 overflow-hidden">
                            cq_k••••••••••••••••••••••••
                          </div>
                          <div className="flex space-x-2">
                            <button className="px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50 opacity-50 cursor-not-allowed">Copy</button>
                            <button className="px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50 opacity-50 cursor-not-allowed">Revoke</button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>
                            <strong>Coming Soon:</strong> API access will allow integration with your existing tools and custom dashboards. Subscribe to our updates to be notified when this feature launches.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Analytics Preferences */}
                    <div className="mb-8 p-6 border border-gray-200 rounded-lg">
                      <h2 className="text-xl font-semibold mb-4">Analytics Preferences</h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Configure how analytics data is collected and displayed across your dashboard.
                      </p>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <h3 className="font-medium text-gray-900">Default Date Range</h3>
                            <p className="text-xs text-gray-500">Set the default time period for analytics charts</p>
                          </div>
                          <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                            <option value="7days">Last 7 days</option>
                            <option value="30days" selected>Last 30 days</option>
                            <option value="90days">Last 90 days</option>
                            <option value="year">Last year</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <h3 className="font-medium text-gray-900">Data Granularity</h3>
                            <p className="text-xs text-gray-500">Choose the level of detail in your analytics</p>
                          </div>
                          <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                            <option value="hourly">Hourly</option>
                            <option value="daily" selected>Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <h3 className="font-medium text-gray-900">Real-time Analytics</h3>
                            <p className="text-xs text-gray-500">Enable live updating of dashboard stats</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      </div>
                      
                      <button className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                        Save Preferences
                      </button>
                    </div>
                    
                    {/* Data Export */}
                    <div className="mb-8 p-6 border border-gray-200 rounded-lg">
                      <h2 className="text-xl font-semibold mb-4">Data Export</h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Export your analytics data in various formats for reporting and deeper analysis.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                          <h3 className="font-medium mb-1">User Analytics Export</h3>
                          <p className="text-xs text-gray-500 mb-3">Export detailed user behavior and conversion data</p>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50">CSV</button>
                            <button className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50">JSON</button>
                            <button className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50">Excel</button>
                          </div>
                        </div>
                        
                        <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                          <h3 className="font-medium mb-1">Smart Contract Analytics</h3>
                          <p className="text-xs text-gray-500 mb-3">Export on-chain transaction and interaction data</p>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50">CSV</button>
                            <button className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50">JSON</button>
                            <button className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50">Excel</button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-amber-800">Exports may take a few minutes for larger data sets.</span>
                      </div>
                    </div>
                    
                    {/* Advanced Settings */}
                    <div className="p-6 border border-gray-200 rounded-lg">
                      <h2 className="text-xl font-semibold mb-4">Advanced Settings</h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Configure advanced features for your Cryptique analytics account.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="flex items-start p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">Data Retention</h3>
                            <p className="text-xs text-gray-500 mb-2">Control how long your analytics data is stored</p>
                            <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                              <option value="3months">3 months</option>
                              <option value="6months">6 months</option>
                              <option value="1year" selected>1 year</option>
                              <option value="forever">Indefinitely</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="flex items-start p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">IP Anonymization</h3>
                            <p className="text-xs text-gray-500 mb-2">Mask the last octet of user IP addresses for privacy</p>
                            <div className="flex items-center">
                              <label className="relative inline-flex items-center cursor-pointer mr-4">
                                <input type="checkbox" className="sr-only peer" checked />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                              </label>
                              <span className="text-sm text-gray-600">Enabled</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-start p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">Custom Parameters Tracking</h3>
                            <p className="text-xs text-gray-500 mb-2">Track additional custom parameters for deeper insights</p>
                            <div className="flex flex-col space-y-2">
                              <input type="text" placeholder="Parameter name (e.g., utm_campaign)" className="px-3 py-2 border border-gray-300 rounded text-sm" />
                              <div className="flex space-x-2">
                                <button className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">Add Parameter</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                        Save Advanced Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {activeSection === "billing" && (
                <div className="p-4 sm:p-6 bg-white m-4 rounded-lg shadow-sm">
                  <Billing />
                </div>
              )}
              {activeSection === "pricing" && (
                <div className="p-4 sm:p-6 bg-white m-4 rounded-lg shadow-sm">
                  <PricingSection />
                </div>
              )}
              {activeSection === "teams" && (
                <div className="p-4 sm:p-6 bg-white m-4 rounded-lg shadow-sm">
                  <TeamsSection />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
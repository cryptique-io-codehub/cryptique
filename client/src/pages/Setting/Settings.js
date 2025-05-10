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
                  <div className="max-w-2xl">
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Team name</label>
                      <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="User name or email address" />
                      <p className="text-xs text-gray-500 mt-1">This is the name of your team that will be displayed to your team members.</p>
                      <div className="mt-2">
                        <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md">Save</button>
                      </div>
                    </div>
                    
                    <div className="mb-6 border-t pt-6">
                      <h2 className="text-xl font-semibold mb-4">Billing details</h2>
                      <p className="text-xs text-gray-500 mb-4">Company data is required to activate the paid package and for invoicing.</p>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company name <span className="text-red-500">*</span></label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                          <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">ZIP/Postal Code <span className="text-red-500">*</span></label>
                          <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-red-500">*</span></label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                          <option>Select a country</option>
                        </select>
                      </div>
                      
                      <div className="mt-2 mb-6">
                        <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md">Save</button>
                      </div>
                    </div>
                    
                    <div className="mb-6 border-t pt-6">
                      <h2 className="text-xl font-semibold mb-4">Invoice Email Recipient</h2>
                      <p className="text-xs text-gray-500 mb-4">By default, all your invoices will be sent to the email address of the creator of your team. If you want to use a custom email address specifically for receiving invoices, enter it here.</p>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                      
                      <div className="mt-2">
                        <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md">Save</button>
                      </div>
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
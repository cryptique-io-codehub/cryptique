import React, { useState, useEffect } from "react";
import { User, CreditCard, Users, Settings as SettingsIcon, Menu, ChevronDown, X, Tag } from "lucide-react";
import Header from "../../components/Header";
import Billing from "./Billing/Billing";
import MembersSection from "./MembersSection";
import PersonalInfoSection from "./PersonalInfoSection";
import TeamsSection from "./TeamsSection";
import PricingSection from "./PricingSection";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTeam } from "../../context/teamContext";

const Settings = ({ onMenuClick, screenSize }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { team } = useParams();
  const [seteam, setseTeam] = useState(localStorage.getItem("selectedTeam"));
  const [isCompactMode, setIsCompactMode] = useState(false); // Start in expanded mode
  const [isHovering, setIsHovering] = useState(false);
  const [secondNavOpen, setSecondNavOpen] = useState(false);

  // Determine active section based on current path
  const determineActiveSection = () => {
    const path = location.pathname;
    if (path.includes('/billing')) return 'billing';
    if (path.includes('/members')) return 'members';
    if (path.includes('/personal')) return 'personal';
    if (path.includes('/teamsSection')) return 'teams';
    if (path.includes('/pricing')) return 'pricing';
    return 'general';
  };

  const [activeSection, setActiveSection] = useState(determineActiveSection);

  useEffect(() => {
    setseTeam(localStorage.getItem("selectedTeam"));
  }, [team]);

  useEffect(() => {
    // Update active section when route changes
    setActiveSection(determineActiveSection());
  }, [location.pathname]);

  const toggleSecondNav = () => {
    setSecondNavOpen(!secondNavOpen);
    // Only toggle the main menu on mobile devices
    if (onMenuClick && (screenSize?.isMobile || screenSize?.isTablet)) {
      onMenuClick();
    }
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
      case 'members':
        navigate(`/${seteam}/settings/members`);
        break;
      case 'personal':
        navigate(`/${seteam}/settings/personal`);
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
      setSecondNavOpen(false);
    }
  };

  // Determine if we should show expanded content
  const showExpanded = !isCompactMode || isHovering;
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Content area with header and flexible content */}
      <div className="flex flex-col w-full h-screen">
        {/* Header - fixed at top */}
        <Header className="w-full flex-shrink-0" onMenuClick={onMenuClick} screenSize={screenSize} />

        {/* Content area below header */}
        <div className="flex flex-1 overflow-hidden">
          {/* Mobile menu toggle button for second navigation */}
          <button 
            className="md:hidden fixed top-4 left-16 z-40 p-2 bg-white rounded-md shadow-md"
            onClick={toggleSecondNav}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {/* Settings sidebar - fixed on desktop, slide-in drawer on mobile */}
          <div 
            className={`bg-white shadow-md h-full border-r border-gray-200 md:block md:w-64 md:static md:z-auto transition-all duration-300 
                ${secondNavOpen ? 'fixed left-0 top-0 w-64 z-30 pt-16' : 'hidden md:block'}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Settings</h2>
                <p className="text-xs text-gray-500">Manage your analytics</p>
              </div>
            </div>
            
            <nav className="py-4 flex-1">
              <ul className="space-y-1 px-2">
                <li>
                  <button 
                    onClick={() => handleSectionChange("general")}
                    className={`w-full px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                      activeSection === "general" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <SettingsIcon size={16} />
                    <span>General</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleSectionChange("billing")}
                    className={`w-full px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                      activeSection === "billing" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <CreditCard size={16} />
                    <span>Billing</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleSectionChange("pricing")}
                    className={`w-full px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                      activeSection === "pricing" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Tag size={16} />
                    <span>Pricing Plans</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleSectionChange("members")}
                    className={`w-full px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                      activeSection === "members" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Users size={16} />
                    <span>Members</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleSectionChange("personal")}
                    className={`w-full px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                      activeSection === "personal" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <User size={16} />
                    <span>Personal Info</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleSectionChange("teams")}
                    className={`w-full px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                      activeSection === "teams" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Users size={16} />
                    <span>Manage Teams</span>
                  </button>
                </li>
              </ul>
            </nav>
            
            <div className="p-3 border-t text-xs text-gray-500">
              Settings for {seteam}
            </div>
          </div>
          
          {/* Main content area - scrollable */}
          <div className="flex-1 p-4 md:p-6 pb-16 overflow-y-auto">
            {activeSection === "general" && (
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
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
              <div className="bg-white rounded-lg shadow">
                <Billing />
              </div>
            )}
            {activeSection === "pricing" && (
              <div className="bg-white rounded-lg shadow">
                <PricingSection />
              </div>
            )}
            {activeSection === "members" && (
              <div className="bg-white rounded-lg shadow">
                <MembersSection />
              </div>
            )}
            {activeSection === "personal" && (
              <div className="bg-white rounded-lg shadow">
                <PersonalInfoSection />
              </div>
            )}
            {activeSection === "teams" && (
              <div className="bg-white rounded-lg shadow">
                <TeamsSection />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
import React, { useState, useEffect } from "react";
import { User, CreditCard, Users, Settings as SettingsIcon, Menu, ChevronDown, X } from "lucide-react";
import Header from "../../components/Header";
import BillingSection from "./Billing/BillingSection";
import MembersSection from "./MembersSection";
import PersonalInfoSection from "./PersonalInfoSection";
import TeamsSection from "./TeamsSection";
import Sidebar from "../../components/Sidebar";

// Team selector component that will be reused across sections

const Settings = ({ onMenuClick }) => {
  const [activeSection, setActiveSection] = useState("general");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Close sidebar when resizing to larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleSectionChange = (section) => {
    setActiveSection(section);
    // On mobile, close the sidebar after selecting a section
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };
  
  return (
    <div className="flex flex-col lg:flex-row w-full h-screen overflow-hidden">
      <Sidebar />
      {/* Mobile overlay for sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      {/* Settings sidebar - responsive */}
      <div className={`${
        sidebarOpen ? 'fixed inset-y-0 left-0 z-20' : 'hidden'
      } lg:relative lg:flex w-64 bg-white h-full border-r border-gray-200 flex-col overflow-y-auto transition-all duration-300 ease-in-out`}>
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="text-xs text-gray-500">Manage your analytics</p>
          </div>
          <button 
            className="lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="py-4 flex-1">
          <ul className="space-y-1 px-2">
            <li>
              <button 
                onClick={() => handleSectionChange("general")}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                  activeSection === "general" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                }`}
              >
                General
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleSectionChange("billing")}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                  activeSection === "billing" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                }`}
              >
                Billing
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleSectionChange("members")}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                  activeSection === "members" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                }`}
              >
                Members
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleSectionChange("personal")}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                  activeSection === "personal" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                }`}
              >
                Personal Info
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleSectionChange("teams")}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm ${
                  activeSection === "teams" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                }`}
              >
                Manage your teams
              </button>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Right content area with its own header and scrollable content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => {
          // Use toggle sidebar for the menu button in header
          toggleSidebar();
        }} />
        
        {/* Button to open sidebar on mobile */}
        <div className="lg:hidden px-4 py-2 border-b flex items-center">
          <button 
            onClick={toggleSidebar}
            className="px-2 py-1 bg-gray-100 rounded-md text-sm flex items-center gap-1"
          >
            <Menu size={16} />
            <span>Settings Menu</span>
          </button>
          <div className="ml-2 text-sm font-medium">
            {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {activeSection === "general" && (
            <div className="p-4 sm:p-6 bg-white">
              
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
          
          {activeSection === "members" && (
            <div className="p-4 sm:p-6 bg-white">
              
              <MembersSection/>
            </div>
          )}
          
          {activeSection === "personal" && (
            <div className="p-4 sm:p-6 bg-white">
              
              <PersonalInfoSection/>
            </div>
          )}
          
          {activeSection === "teams" && (
            <div className="p-4 sm:p-6 bg-white">
             
              <TeamsSection/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
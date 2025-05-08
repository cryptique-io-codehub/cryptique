import React, { useState, useEffect } from "react";
import { User, CreditCard, Users, Settings as SettingsIcon, Menu, ChevronDown, X } from "lucide-react";
import Header from "../../components/Header";
import Billing from "./Billing/Billing";
import MembersSection from "./MembersSection";
import PersonalInfoSection from "./PersonalInfoSection";
import TeamsSection from "./TeamsSection";
import Sidebar from "../../components/Sidebar";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTeam } from "../../context/teamContext";
import axiosInstance from "../../axiosInstance";

const Settings = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { team } = useParams();
  const [seteam, setseTeam] = useState(localStorage.getItem("selectedTeam"));
  const [teamDetails, setTeamDetails] = useState({
    name: "",
    description: "",
    email: "",
  });
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [loading, setLoading] = useState(true);

  // Determine active section based on current path
  const determineActiveSection = () => {
    const path = location.pathname;
    if (path.includes('/billing')) return 'billing';
    if (path.includes('/members')) return 'members';
    if (path.includes('/personal')) return 'personal';
    if (path.includes('/teamsSection')) return 'teams';
    return 'general';
  };

  const [activeSection, setActiveSection] = useState(determineActiveSection);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch team details
  useEffect(() => {
    const fetchTeamDetails = async () => {
      try {
        setLoading(true);
        // Get team name from localStorage
        const teamName = localStorage.getItem("selectedTeam");
        
        // Fetch team details from backend
        const response = await axiosInstance.get('/team/details');
        
        if (response.data && response.data.team && response.data.team.length > 0) {
          // Find the current team
          const currentTeam = response.data.team.find(t => t.name === teamName) || response.data.team[0];
          
          // Get creator email from user who created the team
          let creatorEmail = "";
          if (currentTeam.createdBy && currentTeam.createdBy.email) {
            creatorEmail = currentTeam.createdBy.email;
          }
          
          setTeamDetails({
            name: currentTeam.name || "",
            description: currentTeam.description || "",
            email: creatorEmail || "",
          });
        }
      } catch (error) {
        console.error("Error fetching team details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (seteam) {
      fetchTeamDetails();
    }
  }, [seteam]);

  useEffect(() => {
    setseTeam(localStorage.getItem("selectedTeam"));
  }, [team]);

  useEffect(() => {
    // Update active section when route changes
    setActiveSection(determineActiveSection());
  }, [location.pathname]);
  
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
    }

    // On mobile, close the sidebar after selecting a section
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleUpdateTeamName = async (e) => {
    e.preventDefault();
    try {
      // Get the current team ID
      const response = await axiosInstance.get('/team/details');
      if (response.data && response.data.team && response.data.team.length > 0) {
        const teamName = localStorage.getItem("selectedTeam");
        const currentTeam = response.data.team.find(t => t.name === teamName) || response.data.team[0];
        
        if (currentTeam._id) {
          await axiosInstance.put('/team/update', { 
            teamId: currentTeam._id,
            name: teamDetails.name 
          });
          
          // Update localStorage with the new team name
          localStorage.setItem("selectedTeam", teamDetails.name);
          setseTeam(teamDetails.name);
          
          alert("Team name updated successfully");
        }
      }
    } catch (error) {
      console.error("Error updating team name:", error);
      alert("Failed to update team name");
    }
  };

  const handleUpdateDescription = async (e) => {
    e.preventDefault();
    try {
      // Get the current team ID
      const response = await axiosInstance.get('/team/details');
      if (response.data && response.data.team && response.data.team.length > 0) {
        const teamName = localStorage.getItem("selectedTeam");
        const currentTeam = response.data.team.find(t => t.name === teamName) || response.data.team[0];
        
        if (currentTeam._id) {
          await axiosInstance.put('/team/update', { 
            teamId: currentTeam._id,
            description: teamDetails.description 
          });
          
          setIsEditingDescription(false);
          alert("Company description updated successfully");
        }
      }
    } catch (error) {
      console.error("Error updating description:", error);
      alert("Failed to update company description");
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
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="max-w-2xl">
                  {/* Team Name Section */}
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">Team Information</h2>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Team name</label>
                      <p className="text-sm bg-gray-50 p-3 rounded-md">{teamDetails.name}</p>
                      <p className="text-xs text-gray-500 mt-1">This is your current team name.</p>
                    </div>
                  </div>
                  
                  {/* Company Description Section */}
                  <div className="mb-6 border-t pt-6">
                    <h2 className="text-xl font-semibold mb-4">Company Description</h2>
                    {isEditingDescription ? (
                      <form onSubmit={handleUpdateDescription}>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md h-32"
                            value={teamDetails.description}
                            onChange={(e) => setTeamDetails({...teamDetails, description: e.target.value})}
                            placeholder="Describe your company or team"
                          ></textarea>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md">
                            Save
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setIsEditingDescription(false)}
                            className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-md"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div>
                        <div className="mb-4 bg-gray-50 p-4 rounded-md">
                          {teamDetails.description ? (
                            <p className="text-sm text-gray-700">{teamDetails.description}</p>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No company description set</p>
                          )}
                        </div>
                        <button 
                          onClick={() => setIsEditingDescription(true)}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm rounded-md"
                        >
                          Edit Description
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Team Email Section */}
                  <div className="mb-6 border-t pt-6">
                    <h2 className="text-xl font-semibold mb-4">Team Email</h2>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email Address</label>
                      <p className="text-sm bg-gray-50 p-3 rounded-md">{teamDetails.email || "No email address set"}</p>
                      <p className="text-xs text-gray-500 mt-1">This is the email address used to create your account.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeSection === "billing" && (
            <div className="p-4 sm:p-6 bg-white">
              
              <Billing/>
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
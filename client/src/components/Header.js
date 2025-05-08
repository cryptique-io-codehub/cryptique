import React, { useState, useEffect, useRef } from "react";
import { Bell, ChevronDown, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import axiosInstance from "../axiosInstance";

const TeamSelector = () => {
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
  const [curTeams, setCurTeams] = useState([]); 
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axiosInstance.get('/team/details',{
          headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type':'application/json'
          }
        });
        // console.log('a');
        // console.log(response);
        // console.log('b');
        const teams = response.data.team;
        setCurTeams(teams);
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    fetchTeams();
  }, [selectedTeam]);

  const handleTeamSelect = (teamss) => {
    localStorage.setItem('selectedTeam', teamss.name);
    setSelectedTeam(teamss.name);
    // console.log(teamss);
    
    const currentPath = window.location.pathname;
    if (currentPath.includes('/settings')) {
        navigate(`/${teamss.name}/settings`, { replace: true });
    }
    
    setDropdownOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center flex-wrap">
        <span className="text-sm font-medium text-gray-700 mr-2 whitespace-nowrap">Team:</span>
        
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded shadow-sm text-sm bg-white whitespace-nowrap"
          >
            <span className="truncate max-w-[100px] sm:max-w-[120px]">{selectedTeam}</span>
            <ChevronDown size={16} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-300 shadow-lg rounded-md z-50">
              <div className="max-h-60 overflow-y-auto">
                {curTeams.length > 0 ? (
                  curTeams.map((team) => (
                    <button
                      key={team.id}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 
                        transition-colors duration-200 
                        border-b border-gray-100 last:border-b-0
                        hover:bg-blue-50"
                      onClick={() => handleTeamSelect(team)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="truncate">{team.name}</span>
                        {team.members && (
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {team.members} members
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-2 text-sm text-gray-500 text-center">
                    No teams available
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Header = ({ screenSize }) => {
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const isMobile = screenSize && screenSize.isMobile;

  useEffect(() => {
    // Fetch user details or get username from localStorage
    const storedUser = localStorage.getItem('User');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || user.email || 'User');
      } catch (error) {
        setUserName('User');
      }
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownOpen && !event.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const handleLogout = async () => {
    try {
      // Call the logout API endpoint to invalidate refresh token
      await axiosInstance.post('/auth/logout');
      
      // Clear all auth-related items from localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('selectedTeam');
      localStorage.removeItem('selectedWebsite');
      localStorage.removeItem('User');
      localStorage.removeItem('idy');
      
      // Navigate to login page
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Even if API call fails, still clear localStorage and redirect to be safe
      localStorage.removeItem('accessToken');
      localStorage.removeItem('selectedTeam');
      localStorage.removeItem('selectedWebsite');
      localStorage.removeItem('User');
      localStorage.removeItem('idy');
      
      navigate('/login');
    }
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  return (
    <header className={`flex justify-between items-center ${isMobile ? 'px-2 py-2' : 'px-5 py-1'}`}>
      {/* Team Selector */}
      <div className={isMobile ? 'ml-10' : ''}>
        <TeamSelector />
      </div>
      
      <div className="flex justify-center items-center relative">
        {!isMobile && (
          <div className="cursor-pointer p-2 hover:bg-gray-200 rounded-full mb-0">
            <Bell size={20} className="text-gray-600" />
          </div>
        )}

        {/* Profile Icon with Dropdown */}
        <div 
          className="cursor-pointer p-2 hover:bg-gray-200 rounded-full mb-0 relative profile-dropdown"
          onClick={toggleProfileDropdown}
        >
          <User size={20} className="text-gray-600" />
        </div>

        {/* Profile Dropdown */}
        {profileDropdownOpen && (
          <div className={`absolute right-0 top-full mt-2 bg-white border border-gray-300 shadow-lg rounded-md z-50 ${isMobile ? 'w-56' : 'w-64'}`}>
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            </div>
            <div className="py-1">
              <button 
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <LogOut size={16} className="mr-2" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
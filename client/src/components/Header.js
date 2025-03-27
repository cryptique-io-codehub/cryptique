import React, { useState,useEffect } from "react";
import { Bell, ChevronDown, User, LogOut } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useTeam } from "../context/teamContext";
import axiosInstance from "../axiosInstance";

const TeamSelector = () => {
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
  const [curTeams, setCurTeams] = useState([]); 
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const val=localStorage.getItem('User');

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axiosInstance.get('/team/AdminTeamDetails');

        const teams = response.data.team;
        setCurTeams(teams);
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    fetchTeams();
  }, []);

  const handleTeamSelect = (teamss) => {
    localStorage.setItem('selectedTeam', teamss.name);
    setSelectedTeam(teamss.name);
    console.log(teamss);
    
    const currentPath = window.location.pathname;
    if (currentPath.includes('/settings')) {
        navigate(`/${teamss.name}/settings`, { replace: true });
    }
    
    setDropdownOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center flex-wrap">
        <span className="text-sm font-medium text-gray-700 mr-2">Team:</span>
        
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded shadow-sm text-sm bg-white"
          >
            <span>{selectedTeam}</span>
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
                        <span>{team.name}</span>
                        {team.members && (
                          <span className="text-xs text-gray-500 ml-2">
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

const Header = () => {
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleLogout = () => {
    // Clear the token from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('selectedTeam');
    
    // Navigate to login page
    navigate('/login');
  };

  return (
    <header className="flex justify-between px-5 items-center py-1">
      {/* Team Selector */}
      <TeamSelector />
      
      <div className="flex justify-center items-center">
        <div className="cursor-pointer p-2 hover:bg-gray-200 rounded-full mb-0">
          <Bell size={20} className="text-gray-600" />
        </div>

        {/* Profile Icon with Logout Dropdown */}
        <div className="relative">
          <div 
            className="cursor-pointer p-2 hover:bg-gray-200 rounded-full mb-0"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          >
            <User size={20} className="text-gray-600" />
          </div>
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-4 w-48 bg-white border border-gray-300 shadow-lg rounded-lg z-50 overflow-hidden">
              {/* Dropdown Actions */}
              <div className="py-1">
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 
                    hover:bg-red-50 transition-colors duration-200"
                  onClick={() => {
                    handleLogout();
                    setProfileDropdownOpen(false);
                  }}
                >
                  <LogOut size={16} className="mr-3 text-red-500" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
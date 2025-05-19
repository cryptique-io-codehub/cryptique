import React, { useState, useEffect, useRef } from "react";
import { Bell, ChevronDown, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import axiosInstance from "../axiosInstance";
import preloadData from "../utils/preloadService";

const TeamSelector = () => {
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
  const [curTeams, setCurTeams] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const dropdownRef = useRef(null);
  const teamsRequestRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

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

  // Fetch teams only once when component mounts
  useEffect(() => {
    const fetchTeams = async () => {
      // If we're already loading or fetched recently (within 30 seconds), skip
      const now = Date.now();
      if (isLoadingTeams || (now - lastFetchTimeRef.current < 30000)) {
        return;
      }
      
      try {
        setIsLoadingTeams(true);
        lastFetchTimeRef.current = now;
        
        const token = localStorage.getItem("token");
        const response = await axiosInstance.get('/team/details', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const teams = response.data.team;
        setCurTeams(teams);
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setIsLoadingTeams(false);
      }
    };

    // Initial fetch when component mounts
    fetchTeams();
    
    // Clean up any pending requests when component unmounts
    return () => {
      if (teamsRequestRef.current) {
        clearTimeout(teamsRequestRef.current);
      }
    };
  }, []);
  
  // When dropdown is opened, fetch teams if needed
  useEffect(() => {
    const fetchTeamsIfNeeded = async () => {
      if (dropdownOpen && curTeams.length === 0 && !isLoadingTeams) {
        const now = Date.now();
        // Only fetch if not recently fetched (30 seconds) 
        if (now - lastFetchTimeRef.current > 30000) {
          try {
            setIsLoadingTeams(true);
            lastFetchTimeRef.current = now;
            
            const token = localStorage.getItem("token");
            const response = await axiosInstance.get('/team/details', {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            const teams = response.data.team;
            setCurTeams(teams);
          } catch (error) {
            console.error("Error fetching teams:", error);
          } finally {
            setIsLoadingTeams(false);
          }
        }
      }
    };
    
    fetchTeamsIfNeeded();
  }, [dropdownOpen, curTeams.length, isLoadingTeams]);

  // Function to fetch complete team data including subscription
  const fetchCompleteTeamData = async (teamId) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      
      // Fetch complete team data including subscription information
      const response = await axios.get(`${API_URL}/api/team/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && response.data._id) {
        console.log('Fetched complete team data:', response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching complete team data:', error);
      return null;
    }
  };

  // Function to fetch subscription data
  const fetchSubscriptionData = async (teamId) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      
      // Fetch subscription data directly from the Stripe endpoint
      const response = await axios.get(`${API_URL}/api/stripe/subscription/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Fetched subscription data:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      return null;
    }
  };

  const handleTeamSelect = async (teamss) => {
    // If this is a different team than the currently selected one
    const previousTeam = localStorage.getItem('selectedTeam');
    if (previousTeam !== teamss.name) {
      setIsRefreshing(true);
      setDropdownOpen(false);
      
      try {
        // Update localStorage with basic team info first for immediate feedback
        localStorage.setItem('selectedTeam', teamss.name);
        setSelectedTeam(teamss.name);
        
        // Fetch complete team data including subscription
        console.log(`Team switched from ${previousTeam} to ${teamss.name}, fetching complete data...`);
        
        // Fetch complete team data
        const completeTeamData = await fetchCompleteTeamData(teamss._id);
        
        // Also fetch subscription data directly to ensure it's up to date
        const subscriptionData = await fetchSubscriptionData(teamss._id);
        
        // Merge the data
        const teamDataToStore = {
          ...(completeTeamData || {}),
          _id: teamss._id,
          name: teamss.name,
          role: teamss.role || 'user',
          isOwner: teamss.isOwner || false
        };
        
        // Add subscription data if available
        if (subscriptionData && subscriptionData.subscription) {
          teamDataToStore.subscription = subscriptionData.subscription;
        }
        
        console.log('Storing complete team data with subscription:', teamDataToStore);
        
        // Save the merged data to localStorage
        localStorage.setItem('selectedTeamData', JSON.stringify(teamDataToStore));
        
        // Dispatch a custom event to notify other components about the team change
        window.dispatchEvent(new CustomEvent('teamDataUpdated', { 
          detail: { teamData: teamDataToStore }
        }));
        
        // Clear website selection since it's team-specific
        localStorage.removeItem("selectedWebsite");
        localStorage.removeItem("idy");
        
        // Preload data for the new team with loading state
        await preloadData(true, teamss.name, (isLoading) => setIsRefreshing(isLoading));
        
        // Force refresh the current page to ensure all components update
        window.location.reload();
      } catch (error) {
        console.error("Error fetching team data:", error);
        setIsRefreshing(false);
      }
    } else {
      // Same team selected, just close dropdown
      setDropdownOpen(false);
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <div className="flex items-center">
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={toggleDropdown} 
          className="flex items-center space-x-1 text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <span className="text-sm font-medium">Loading team data...</span>
          ) : (
            <>
              <span className="text-sm font-medium">{selectedTeam || 'Select Team'}</span>
              <ChevronDown size={16} />
            </>
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-300 shadow-lg rounded-md z-50">
            <div className="max-h-60 overflow-y-auto">
              {isLoadingTeams ? (
                <p className="px-4 py-2 text-sm text-gray-500 text-center">
                  Loading teams...
                </p>
              ) : curTeams.length > 0 ? (
                curTeams.map((team) => (
                  <button
                    key={team.id}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 
                      transition-colors duration-200 
                      border-b border-gray-100 last:border-b-0
                      hover:bg-blue-50 ${team.name === selectedTeam ? 'bg-blue-50' : ''}`}
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
      // Check if the click is outside both the profile icon and the dropdown content
      const isOutsideProfileIcon = !event.target.closest('.profile-dropdown');
      const isOutsideDropdownContent = !event.target.closest('.profile-dropdown-content');
      
      if (profileDropdownOpen && isOutsideProfileIcon && isOutsideDropdownContent) {
        console.log('Closing dropdown due to outside click');
        setProfileDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const handleLogout = async (event) => {
    // Prevent event propagation to stop the dropdown from closing prematurely
    if (event) {
      event.stopPropagation();
      console.log('Logout button clicked, stopping event propagation');
    }
    
    console.log('Starting logout process...');
    try {
      // Get the access token to use as a fallback authentication method
      const accessToken = localStorage.getItem('accessToken');
      console.log('Access token retrieved for logout:', accessToken ? 'token exists' : 'no token');
      
      // Call the logout API endpoint to invalidate refresh token
      console.log('Calling logout endpoint...');
      await axiosInstance.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      console.log('Logout API call successful');
      
      // Clear all auth-related items from localStorage
      console.log('Clearing localStorage items...');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('selectedTeam');
      localStorage.removeItem('selectedWebsite');
      localStorage.removeItem('User');
      localStorage.removeItem('idy');
      
      // Navigate to login page
      console.log('Navigating to login page...');
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Even if API call fails, still clear localStorage and redirect to be safe
      console.log('Clearing localStorage after error...');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('selectedTeam');
      localStorage.removeItem('selectedWebsite');
      localStorage.removeItem('User');
      localStorage.removeItem('idy');
      
      console.log('Navigating to login page after error...');
      navigate('/login');
    }
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const handleLogoutButtonClick = (event) => {
    // Prevent default behavior
    event.preventDefault();
    // Stop propagation to parent elements
    event.stopPropagation();
    
    console.log('Logout button clicked with specific handler');
    
    // Immediately clear localStorage for responsive UI feedback
    localStorage.removeItem('accessToken');
    localStorage.removeItem('selectedTeam');
    localStorage.removeItem('selectedWebsite');
    localStorage.removeItem('User');
    localStorage.removeItem('idy');
    
    // Call the logout API in the background but immediately redirect
    setTimeout(() => {
      navigate('/login');
    }, 100);
    
    // Call the logout function in the background
    handleLogout().catch(error => {
      console.error('Background logout failed:', error);
      // Already redirected and cleared localStorage, so nothing more to do
    });
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
          <div className={`absolute right-0 top-full mt-2 bg-white border border-gray-300 shadow-lg rounded-md z-50 profile-dropdown-content ${isMobile ? 'w-56' : 'w-64'}`} onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            </div>
            <div className="py-1">
              <button 
                onClick={handleLogoutButtonClick}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onMouseDown={(e) => e.stopPropagation()} // Prevent mousedown event from closing dropdown
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
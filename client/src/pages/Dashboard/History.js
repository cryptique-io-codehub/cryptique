import React, { useState, useEffect } from "react";
import axiosInstance from "../../axiosInstance";
import UserJourneyTable from "../../components/UserJourneyTable";

const History = ({ onMenuClick, onClose, screenSize, siteId: defaultSiteId }) => {
  const [userJourneys, setUserJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [timeframe, setTimeframe] = useState('all');
  const [selectedSite, setSelectedSite] = useState(defaultSiteId || localStorage.getItem("idy") || '');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const usersPerPage = 25;
  
  // Team and website options
  const [websites, setWebsites] = useState([]);
  const selectedTeam = localStorage.getItem("selectedTeam") || '';

  // Mock data for development (remove when API is available)
  const mockUserJourneys = [
    {
      userId: "user123456789",
      firstVisit: new Date("2023-04-15T10:30:00"),
      lastVisit: new Date("2023-05-20T14:45:00"),
      totalSessions: 8,
      totalPageViews: 45,
      totalTimeSpent: 5400, // 90 minutes in seconds
      hasConverted: true,
      daysToConversion: 3,
      userSegment: "converter",
      acquisitionSource: "google/organic",
      sessionsBeforeConversion: 2,
      teamId: "team1",
      websiteName: "Crypto Exchange"
    },
    {
      userId: "user987654321",
      firstVisit: new Date("2023-05-10T09:15:00"),
      lastVisit: new Date("2023-05-10T09:45:00"),
      totalSessions: 1,
      totalPageViews: 2,
      totalTimeSpent: 300, // 5 minutes in seconds
      hasConverted: false,
      userSegment: "bounced",
      acquisitionSource: "direct",
      teamId: "team1",
      websiteName: "Crypto Exchange"
    },
    // Add more mock users to test pagination (over 25)
    ...Array.from({ length: 30 }, (_, i) => ({
      userId: `user_additional_${i + 1}`,
      firstVisit: new Date("2023-05-01T12:00:00"),
      lastVisit: new Date("2023-05-15T14:30:00"),
      totalSessions: Math.floor(Math.random() * 10) + 1,
      totalPageViews: Math.floor(Math.random() * 50) + 1,
      totalTimeSpent: Math.floor(Math.random() * 3600) + 300,
      hasConverted: Math.random() > 0.5,
      daysToConversion: Math.floor(Math.random() * 30) + 1,
      userSegment: ["converter", "engaged", "bounced", "browser"][Math.floor(Math.random() * 4)],
      acquisitionSource: ["google/organic", "facebook/social", "twitter/social", "direct"][Math.floor(Math.random() * 4)],
      sessionsBeforeConversion: Math.floor(Math.random() * 5) + 1,
      teamId: Math.random() > 0.5 ? "team1" : "team2",
      websiteName: Math.random() > 0.5 ? "Crypto Exchange" : "NFT Marketplace"
    }))
  ];

  // Load websites for the selected team
  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        if (!selectedTeam) return;
        
        const response = await axiosInstance.get(`/website/team/${selectedTeam}`);
        
        if (response.status === 200 && response.data.websites) {
          setWebsites(response.data.websites);
          
          // If we have a default siteId or a stored one, select it
          if (selectedSite) {
            // Confirm the website exists under this team
            const websiteExists = response.data.websites.some(site => site.siteId === selectedSite);
            if (!websiteExists) {
              setSelectedSite(''); // Reset if not found
            }
          }
        }
      } catch (err) {
        console.error('Error fetching websites:', err);
      }
    };

    fetchWebsites();
  }, [selectedTeam, selectedSite]);

  useEffect(() => {
    const fetchUserJourneys = async () => {
      try {
        setLoading(true);
        setError(null);

        // When the API is ready, uncomment this code:
        /*
        const response = await axiosInstance.get('/analytics/user-journeys', {
          params: { 
            siteId: selectedSite,
            teamId: selectedTeam,
            timeframe: timeframe === 'all' ? undefined : timeframe,
            page: currentPage,
            limit: usersPerPage
          }
        });
        
        if (response.data && response.data.success) {
          setUserJourneys(response.data.userJourneys);
          setTotalPages(response.data.totalPages || 1);
        } else {
          // Fallback to mock data if API returns empty data
          setUserJourneys(mockUserJourneys);
          setTotalPages(Math.ceil(mockUserJourneys.length / usersPerPage));
        }
        */
        
        // For now, use mock data with a simulated delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Filter mock data based on selected site
        let filteredJourneys = [...mockUserJourneys];
        
        if (selectedSite) {
          const website = websites.find(site => site.siteId === selectedSite);
          if (website) {
            filteredJourneys = filteredJourneys.filter(journey => 
              journey.websiteName === website.Name || 
              journey.websiteDomain === website.Domain
            );
          }
        }
        
        // Calculate pagination
        setTotalPages(Math.ceil(filteredJourneys.length / usersPerPage));
        
        // Get current page data
        const startIndex = (currentPage - 1) * usersPerPage;
        const endIndex = startIndex + usersPerPage;
        const paginatedJourneys = filteredJourneys.slice(startIndex, endIndex);
        
        setUserJourneys(paginatedJourneys);
      } catch (err) {
        console.error('Error fetching user journeys:', err);
        setError('Failed to load user journey data. Please try again later.');
        
        // Use mock data as fallback even on error for demo
        const startIndex = (currentPage - 1) * usersPerPage;
        const endIndex = startIndex + usersPerPage;
        const paginatedJourneys = mockUserJourneys.slice(startIndex, endIndex);
        
        setUserJourneys(paginatedJourneys);
        setTotalPages(Math.ceil(mockUserJourneys.length / usersPerPage));
      } finally {
        setLoading(false);
      }
    };

    fetchUserJourneys();
  }, [selectedSite, timeframe, currentPage, websites]);

  const handleSiteChange = (e) => {
    const siteId = e.target.value;
    setSelectedSite(siteId);
    
    // Store selected website ID in localStorage for persistence
    if (siteId) {
      localStorage.setItem("idy", siteId);
    }
    
    setCurrentPage(1); // Reset to first page
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 font-montserrat">User Journey History</h1>
          <p className="text-gray-600 font-poppins">
            Track how users navigate your site over multiple sessions
          </p>
        </div>

        {/* Filters and controls */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Website filter */}
            <div className="w-full md:w-auto">
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <select
                id="website"
                value={selectedSite}
                onChange={handleSiteChange}
                className="w-full md:w-auto border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Websites</option>
                {websites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.Name || site.Domain}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Time period filter */}
            <div className="w-full md:w-auto">
              <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700 mb-1">
                Time Period
              </label>
              <select
                id="timeframe"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full md:w-auto border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 3 Months</option>
              </select>
            </div>
          </div>
          
          {/* Selected filters display */}
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedTeam && (
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                Team: {selectedTeam}
              </div>
            )}
            {selectedSite && (
              <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                Website: {websites.find(s => s.siteId === selectedSite)?.Name || 
                          websites.find(s => s.siteId === selectedSite)?.Domain || 
                          selectedSite}
              </div>
            )}
            {timeframe !== 'all' && (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                Time: {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <UserJourneyTable 
          userJourneys={userJourneys} 
          isLoading={loading} 
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <nav className="inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border ${
                  currentPage === 1 
                    ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Previous</span>
                &lt;
              </button>
              
              {/* First page */}
              {currentPage > 2 && (
                <button
                  onClick={() => handlePageChange(1)}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  1
                </button>
              )}
              
              {/* Ellipsis if needed */}
              {currentPage > 3 && (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700">
                  ...
                </span>
              )}
              
              {/* Previous page */}
              {currentPage > 1 && (
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  {currentPage - 1}
                </button>
              )}
              
              {/* Current page */}
              <button
                className="relative inline-flex items-center px-4 py-2 border border-blue-500 bg-blue-50 text-blue-600"
              >
                {currentPage}
              </button>
              
              {/* Next page */}
              {currentPage < totalPages && (
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  {currentPage + 1}
                </button>
              )}
              
              {/* Ellipsis if needed */}
              {currentPage < totalPages - 2 && (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700">
                  ...
                </span>
              )}
              
              {/* Last page */}
              {currentPage < totalPages - 1 && (
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              )}
              
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border ${
                  currentPage === totalPages 
                    ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">Next</span>
                &gt;
              </button>
            </nav>
          </div>
        )}
        
        {/* Page information */}
        <div className="mt-2 text-center text-sm text-gray-500">
          Showing page {currentPage} of {totalPages}
          {userJourneys.length > 0 && (
            <span> • {userJourneys.length} users</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
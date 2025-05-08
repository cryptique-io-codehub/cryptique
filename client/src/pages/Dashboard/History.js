import React, { useState, useEffect } from "react";
import axiosInstance from "../../axiosInstance";
import UserJourneyTable from "../../components/UserJourneyTable";
import Header from "../../components/Header";

const History = ({ onMenuClick, onClose, screenSize, siteId: defaultSiteId }) => {
  const [userJourneys, setUserJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingJourneys, setProcessingJourneys] = useState(false);
  
  // Filter states
  const [timeframe, setTimeframe] = useState('all');
  const [selectedSite, setSelectedSite] = useState(defaultSiteId || localStorage.getItem("idy") || '');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const usersPerPage = 50;
  
  // Team and website options
  const [websites, setWebsites] = useState([]);
  const selectedTeam = localStorage.getItem("selectedTeam") || '';

  // Load websites for the selected team
  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        if (!selectedTeam) return;
        
        setLoading(true);
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
        setError('Failed to load websites. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchWebsites();
  }, [selectedTeam, selectedSite]);

  useEffect(() => {
    const fetchUserJourneys = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching user journeys with params:", {
          siteId: selectedSite,
          teamId: selectedTeam,
          timeframe,
          page: currentPage,
          limit: usersPerPage
        });

        // Make the API call to get user journey data
        const response = await axiosInstance.get('/analytics/user-journeys', {
          params: { 
            siteId: selectedSite,
            teamId: selectedTeam,
            timeframe: timeframe === 'all' ? undefined : timeframe,
            page: currentPage,
            limit: usersPerPage
          }
        });
        
        console.log("User journeys API response:", response.data);
        
        if (response.data && response.data.success) {
          // Check if userJourneys array exists and set it (even if empty)
          if (Array.isArray(response.data.userJourneys)) {
            setUserJourneys(response.data.userJourneys);
            
            // Use the pagination data from the API response if available
            if (response.data.pagination) {
              setTotalPages(response.data.pagination.totalPages || 1);
              setTotalItems(response.data.pagination.totalItems || 0);
              console.log(`Loaded ${response.data.userJourneys.length} user journeys from API (page ${response.data.pagination.page} of ${response.data.pagination.totalPages}, total: ${response.data.pagination.totalItems})`);
            } else {
              setTotalPages(response.data.totalPages || 1);
              setTotalItems(0);
              console.log(`Loaded ${response.data.userJourneys.length} user journeys from API`);
            }
            
            // Only set error if userJourneys is empty
            if (response.data.userJourneys.length === 0) {
              setError('No user journey data available for the selected filters.');
            }
          } else {
            console.log("API returned success but invalid journeys data format");
            setUserJourneys([]);
            setTotalPages(1);
            setTotalItems(0);
            setError('Invalid data format received from the server.');
          }
        } else {
          console.log("API returned success but no journeys data");
          setUserJourneys([]);
          setTotalPages(1);
          setTotalItems(0);
          setError('No user journey data available for the selected filters.');
        }
      } catch (err) {
        console.error('Error fetching user journeys:', err);
        setError('Failed to load user journey data. Please try again later.');
        setUserJourneys([]);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUserJourneys();
  }, [selectedSite, timeframe, currentPage, selectedTeam, usersPerPage]);

  const handleSiteChange = (e) => {
    const siteId = e.target.value;
    setSelectedSite(siteId);
    
    // Store selected website ID in localStorage for persistence
    if (siteId) {
      localStorage.setItem("idy", siteId);
    } else {
      localStorage.removeItem("idy"); // Clear if "All Websites" selected
    }
    
    setCurrentPage(1); // Reset to first page
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Function to manually process user journeys
  const processUserJourneys = async () => {
    if (!selectedSite) {
      setError('Please select a website to process user journeys.');
      return;
    }
    
    try {
      setProcessingJourneys(true);
      setError(null);
      
      console.log('Manually processing user journeys for site:', selectedSite);
      
      const response = await axiosInstance.post('/analytics/process-journeys', {
        siteId: selectedSite,
        teamId: selectedTeam
      });
      
      console.log('Process journeys response:', response.data);
      
      if (response.data && response.data.success) {
        // If processing was successful, refresh the user journeys
        const journeysResponse = await axiosInstance.get('/analytics/user-journeys', {
          params: { 
            siteId: selectedSite,
            teamId: selectedTeam,
            timeframe: timeframe === 'all' ? undefined : timeframe,
            page: 1, // Reset to first page
            limit: usersPerPage
          }
        });
        
        if (journeysResponse.data && journeysResponse.data.success && 
            Array.isArray(journeysResponse.data.userJourneys)) {
          setUserJourneys(journeysResponse.data.userJourneys);
          
          // Use the pagination data from the API response if available
          if (journeysResponse.data.pagination) {
            setTotalPages(journeysResponse.data.pagination.totalPages || 1);
            setTotalItems(journeysResponse.data.pagination.totalItems || 0);
          } else {
            setTotalPages(journeysResponse.data.totalPages || 1);
            setTotalItems(0);
          }
          
          setCurrentPage(1); // Reset to first page
          
          if (journeysResponse.data.userJourneys.length === 0) {
            setError('No user journey data available even after processing.');
          } else {
            // Show a success message
            setError(null);
          }
        }
      } else {
        setError('Failed to process user journeys. Please try again later.');
      }
    } catch (err) {
      console.error('Error processing user journeys:', err);
      setError('Failed to process user journeys. Please try again later.');
    } finally {
      setProcessingJourneys(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6">
      {/* Add Header component to ensure team selector is visible */}
      <Header onMenuClick={onMenuClick} />
      
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
                disabled={loading || processingJourneys || websites.length === 0}
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
                disabled={loading || processingJourneys}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 3 Months</option>
              </select>
            </div>
            
            {/* Process journeys button - only visible if no journeys are found */}
            {userJourneys.length === 0 && !loading && (
              <div className="w-full md:w-auto mt-2 md:mt-0 md:ml-auto">
                <button
                  onClick={processUserJourneys}
                  disabled={processingJourneys || !selectedSite}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    processingJourneys || !selectedSite
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {processingJourneys ? (
                    <>
                      <span className="inline-block mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      Processing...
                    </>
                  ) : (
                    'Process User Journeys'
                  )}
                </button>
              </div>
            )}
            
            {/* Refresh journeys button - visible even if journeys exist */}
            {userJourneys.length > 0 && !loading && (
              <div className="w-full md:w-auto mt-2 md:mt-0 md:ml-auto">
                <button
                  onClick={processUserJourneys}
                  disabled={processingJourneys || !selectedSite}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    processingJourneys || !selectedSite
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  title="Update user journey data from the latest sessions"
                >
                  {processingJourneys ? (
                    <>
                      <span className="inline-block mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      Updating...
                    </>
                  ) : (
                    'Update Journeys'
                  )}
                </button>
              </div>
            )}
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
          isLoading={loading || processingJourneys} 
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <nav className="inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading || processingJourneys}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border ${
                  currentPage === 1 || loading || processingJourneys
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
                  disabled={loading || processingJourneys}
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
                  disabled={loading || processingJourneys}
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
                  disabled={loading || processingJourneys}
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
                  disabled={loading || processingJourneys}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              )}
              
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || loading || processingJourneys}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border ${
                  currentPage === totalPages || loading || processingJourneys
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
          {userJourneys.length > 0 ? (
            <>
              Showing page {currentPage} of {totalPages}
              <span> • {userJourneys.length} users</span>
              {totalItems > 0 && <span> (of {totalItems} total)</span>}
            </>
          ) : !loading && !processingJourneys && (
            <span>No user journey data available</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
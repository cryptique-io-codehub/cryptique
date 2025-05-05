import React, { useState, useEffect } from "react";
import axiosInstance from "../../axiosInstance";
import UserJourneyTable from "../../components/UserJourneyTable";
import Header from "../../components/Header";

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
          setUserJourneys([]);
          setTotalPages(1);
          setError('No user journey data available for the selected filters.');
        }
      } catch (err) {
        console.error('Error fetching user journeys:', err);
        setError('Failed to load user journey data. Please try again later.');
        setUserJourneys([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchUserJourneys();
  }, [selectedSite, timeframe, currentPage, selectedTeam]);

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
                disabled={loading || websites.length === 0}
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
                disabled={loading}
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
                disabled={currentPage === 1 || loading}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border ${
                  currentPage === 1 || loading
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              )}
              
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || loading}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border ${
                  currentPage === totalPages || loading
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
            </>
          ) : !loading && (
            <span>No user journey data available</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
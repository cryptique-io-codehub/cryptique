import React, { useState, useEffect } from "react";
import axiosInstance from "../../axiosInstance";
import UserJourneyTable from "../../components/UserJourneyTable";

const History = ({ onMenuClick, onClose, screenSize, siteId }) => {
  const [userJourneys, setUserJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('all');

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
      sessionsBeforeConversion: 2
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
      acquisitionSource: "direct"
    },
    {
      userId: "user555666777",
      firstVisit: new Date("2023-03-01T12:00:00"),
      lastVisit: new Date("2023-05-18T16:30:00"),
      totalSessions: 15,
      totalPageViews: 120,
      totalTimeSpent: 18000, // 5 hours in seconds
      hasConverted: true,
      daysToConversion: 45,
      userSegment: "engaged",
      acquisitionSource: "twitter/social",
      sessionsBeforeConversion: 12
    }
  ];

  useEffect(() => {
    const fetchUserJourneys = async () => {
      try {
        setLoading(true);
        setError(null);

        // When the API is ready, uncomment this code:
        /*
        const response = await axiosInstance.get('/analytics/user-journeys', {
          params: { 
            siteId: siteId,
            timeframe: timeframe === 'all' ? undefined : timeframe
          }
        });
        
        if (response.data && response.data.success && Array.isArray(response.data.userJourneys)) {
          setUserJourneys(response.data.userJourneys);
        } else {
          // Fallback to mock data if API returns empty data
          setUserJourneys(mockUserJourneys);
        }
        */
        
        // For now, use mock data with a simulated delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUserJourneys(mockUserJourneys);
      } catch (err) {
        console.error('Error fetching user journeys:', err);
        setError('Failed to load user journey data. Please try again later.');
        
        // Use mock data as fallback even on error for demo
        setUserJourneys(mockUserJourneys);
      } finally {
        setLoading(false);
      }
    };

    fetchUserJourneys();
  }, [siteId, timeframe]);

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
        <div className="mb-6 bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <select
              id="timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
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

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <UserJourneyTable 
          userJourneys={userJourneys} 
          isLoading={loading} 
        />
      </div>
    </div>
  );
};

export default History;
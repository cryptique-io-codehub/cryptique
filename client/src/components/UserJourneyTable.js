import React, { useState, useMemo } from 'react';
import { format, formatDistance } from 'date-fns';
import UserJourneyPopup from './UserJourneyPopup';

const UserJourneyTable = ({ userJourneys = [], isLoading = false }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // Sort journeys by last visit date (most recent first)
  const sortedJourneys = useMemo(() => {
    return [...userJourneys].sort((a, b) => 
      new Date(b.lastVisit) - new Date(a.lastVisit)
    );
  }, [userJourneys]);

  const handleRowClick = (journey) => {
    setSelectedUser(journey);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  // Helper function to determine color based on user segment
  const getSegmentColor = (segment) => {
    if (!segment) return 'bg-gray-100 text-gray-800';
    
    switch (segment.toLowerCase()) {
      case 'converter':
        return 'bg-green-100 text-green-800';
      case 'engaged':
        return 'bg-blue-100 text-blue-800';
      case 'bounced':
        return 'bg-red-100 text-red-800';
      case 'browser':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (userJourneys.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No user journey data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Segment
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sessions
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                First Visit
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Visit
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Time (min)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Converted
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedJourneys.map((journey) => (
              <tr 
                key={journey.userId} 
                onClick={() => handleRowClick(journey)}
                className="hover:bg-gray-50 cursor-pointer transition duration-150"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {journey.userId.substring(0, 8)}...
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSegmentColor(journey.userSegment)}`}>
                    {journey.userSegment || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {journey.totalSessions}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {journey.firstVisit ? format(new Date(journey.firstVisit), 'MMM d, yyyy') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {journey.lastVisit ? format(new Date(journey.lastVisit), 'MMM d, yyyy') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {journey.totalTimeSpent ? Math.round(journey.totalTimeSpent / 60) : 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={journey.hasConverted ? 'text-green-600' : 'text-red-600'}>
                    {journey.hasConverted ? '✓' : '✗'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {journey.acquisitionSource || 'Direct'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Journey Popup */}
      {showPopup && selectedUser && (
        <UserJourneyPopup 
          userJourney={selectedUser} 
          onClose={closePopup} 
        />
      )}
    </div>
  );
};

export default UserJourneyTable; 
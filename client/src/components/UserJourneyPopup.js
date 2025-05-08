import React, { useState, useEffect } from 'react';
import { format, formatDistance } from 'date-fns';
import axiosInstance from '../axiosInstance';

const UserJourneyPopup = ({ userJourney, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');

  useEffect(() => {
    const fetchUserSessions = async () => {
      if (!userJourney || !userJourney.userId) return;
      
      try {
        setLoading(true);
        // Fetch detailed session data for this user
        const response = await axiosInstance.get(`/analytics/user-sessions`, {
          params: { userId: userJourney.userId }
        });
        
        if (response.data && Array.isArray(response.data.sessions)) {
          // Sort sessions by start time
          const sortedSessions = response.data.sessions.sort((a, b) => 
            new Date(b.startTime) - new Date(a.startTime)
          );
          setSessions(sortedSessions);
        }
      } catch (error) {
        console.error('Error fetching user sessions:', error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserSessions();
  }, [userJourney]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0 sec';
    
    if (seconds < 60) {
      return `${seconds} sec`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hr ${minutes} min`;
    }
  };

  const getDeviceIcon = (device) => {
    if (!device || !device.type) return '🖥️';
    
    const type = device.type.toLowerCase();
    if (type.includes('mobile')) return '📱';
    if (type.includes('tablet')) return '📱';
    if (type.includes('desktop')) return '💻';
    return '🖥️';
  };

  // Format date with time
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  // Determine if conversion happened in this session
  const hasWalletConnection = (session) => {
    return session.wallet && 
           session.wallet.walletAddress && 
           session.wallet.walletAddress.trim() !== '' && 
           session.wallet.walletAddress !== 'No Wallet Detected';
  };

  // Format paths for display
  const formatPath = (path) => {
    if (!path) return '/';
    if (path === '/') return 'Home';
    
    // Remove leading slash and replace remaining slashes with " > "
    return path.replace(/^\//, '').replace(/\//g, ' > ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b p-4 bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">User Journey</h2>
            <p className="text-sm text-gray-500">ID: {userJourney.userId}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'timeline'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Details
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'timeline' && (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-gray-200 z-0"></div>
                  
                  {sessions.length > 0 ? (
                    <ul className="space-y-8">
                      {sessions.map((session, index) => (
                        <li key={session._id || index} className="relative z-10">
                          <div className="flex items-start">
                            {/* Session indicator */}
                            <div className="flex-shrink-0 w-18 text-center">
                              <div className="flex flex-col items-center">
                                <span className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-800 border-4 border-white">
                                  {getDeviceIcon(session.device)}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                  Session {session.sessionNumber || index + 1}
                                </span>
                              </div>
                            </div>
                            
                            {/* Session content */}
                            <div className="ml-4 bg-white rounded-lg border shadow-sm p-4 w-full">
                              <div className="flex justify-between">
                                <h3 className="text-lg font-medium text-gray-900">
                                  {formatDateTime(session.startTime)}
                                </h3>
                                <span className="text-sm text-gray-500">
                                  {formatDuration(session.duration)}
                                </span>
                              </div>
                              
                              {/* Session details */}
                              <div className="mt-2 text-sm">
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {session.country && (
                                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">
                                      {session.country}
                                    </span>
                                  )}
                                  {session.referrer && (
                                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                                      From: {session.referrer}
                                    </span>
                                  )}
                                  {session.utmData && session.utmData.source && (
                                    <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-800 text-xs">
                                      {session.utmData.source}/{session.utmData.medium || 'none'}
                                    </span>
                                  )}
                                  {hasWalletConnection(session) && (
                                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                                      Wallet Connected
                                    </span>
                                  )}
                                </div>
                                
                                {/* Device Info */}
                                <div className="mb-3 flex flex-wrap gap-4">
                                  {session.device && (
                                    <div className="bg-gray-50 p-2 rounded">
                                      <p className="font-semibold">Device:</p>
                                      <p className="text-xs">Type: {session.device.type || 'Unknown'}</p>
                                      <p className="text-xs">Browser: {session.device.browser || 'Unknown'}</p>
                                      <p className="text-xs">OS: {session.device.os || 'Unknown'}</p>
                                    </div>
                                  )}
                                  
                                  {/* Session summary stats */}
                                  <div className="bg-blue-50 p-2 rounded">
                                    <p className="font-semibold">Session Stats:</p>
                                    <div className="flex gap-2 text-xs">
                                      <p>Pages: <span className="font-medium">{session.pagesViewed || 0}</span></p>
                                      <p>•</p>
                                      <p>Duration: <span className="font-medium">{formatDuration(session.duration)}</span></p>
                                    </div>
                                    
                                    {/* Highlight data inconsistencies */}
                                    {session.visitedPages && Array.isArray(session.visitedPages) && 
                                     session.pagesViewed !== session.visitedPages.length && (
                                      <p className="text-xs text-orange-600 mt-1">
                                        ⚠️ Data inconsistency: Page count ({session.pagesViewed}) doesn't match 
                                        actual pages ({session.visitedPages.length})
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Wallet info if available */}
                                {hasWalletConnection(session) && (
                                  <div className="mb-3 p-2 bg-green-50 rounded">
                                    <p className="font-semibold">Wallet connected:</p>
                                    <p className="text-xs truncate">{session.wallet.walletAddress}</p>
                                    <p className="text-xs">Type: {session.wallet.walletType || 'Unknown'}</p>
                                    {session.wallet.chainName && (
                                      <p className="text-xs">Chain: {session.wallet.chainName}</p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Page visits */}
                                {session.visitedPages && session.visitedPages.length > 0 ? (
                                  <div>
                                    <p className="font-semibold text-gray-700 mb-2">
                                      Page Journey ({session.visitedPages.length} pages):
                                    </p>
                                    <ol className="border-l border-gray-200 ml-2 space-y-2">
                                      {session.visitedPages.map((page, i) => (
                                        <li key={i} className="relative pb-2">
                                          <div className="flex items-start">
                                            <span className="absolute -left-[5px] h-2.5 w-2.5 rounded-full bg-gray-200"></span>
                                            <div className="ml-4">
                                              <p className="text-gray-800">
                                                {formatPath(page.path)}
                                                {page.isEntry && (
                                                  <span className="ml-2 text-xs text-blue-600">
                                                    (Entry)
                                                  </span>
                                                )}
                                                {page.isExit && (
                                                  <span className="ml-2 text-xs text-red-600">
                                                    (Exit)
                                                  </span>
                                                )}
                                              </p>
                                              <p className="text-xs text-gray-500">
                                                {page.timestamp && formatDateTime(page.timestamp)}
                                                {page.duration > 0 && (
                                                  <span className="ml-2">
                                                    {formatDuration(page.duration)}
                                                  </span>
                                                )}
                                              </p>
                                            </div>
                                          </div>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                ) : session.pagesViewed > 0 ? (
                                  <div className="bg-yellow-50 p-2 rounded">
                                    <p className="font-semibold text-yellow-700">
                                      Page data incomplete
                                    </p>
                                    <p className="text-xs text-yellow-600">
                                      This session has {session.pagesViewed} recorded page views,
                                      but detailed page visit data is not available.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 p-2 rounded">
                                    <p className="text-xs text-gray-500">
                                      No page views recorded for this session.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-500">No session data available</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'overview' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Total Sessions</h3>
                      <p className="text-2xl font-semibold text-gray-900">{userJourney.totalSessions}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {userJourney.totalSessions !== sessions.length && 
                          `Note: ${sessions.length} sessions loaded`}
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Page Views</h3>
                      <p className="text-2xl font-semibold text-gray-900">{userJourney.totalPageViews || 0}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        {sessions.length > 0 && (() => {
                          // Calculate total pages across all sessions
                          const calculatedPages = sessions.reduce((total, session) => {
                            if (session.visitedPages && Array.isArray(session.visitedPages)) {
                              return total + session.visitedPages.length;
                            } else if (typeof session.pagesViewed === 'number') {
                              return total + session.pagesViewed;
                            }
                            return total;
                          }, 0);
                          
                          // Only show discrepancy warning if both values exist and don't match
                          if (calculatedPages > 0 && userJourney.totalPageViews > 0 && 
                              calculatedPages !== userJourney.totalPageViews) {
                            return (
                              <p className="text-orange-600">
                                ⚠️ Data inconsistency: {calculatedPages} pages calculated from sessions
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Total Time</h3>
                      <p className="text-2xl font-semibold text-gray-900">{formatDuration(userJourney.totalTimeSpent)}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        {sessions.length > 0 && (() => {
                          // Calculate total duration across all sessions
                          const calculatedDuration = sessions.reduce((total, session) => {
                            return total + (session.duration || 0);
                          }, 0);
                          
                          // Check for discrepancy
                          if (Math.abs(calculatedDuration - userJourney.totalTimeSpent) > 10) {
                            return (
                              <p className="text-orange-600">
                                ⚠️ Data inconsistency: {formatDuration(calculatedDuration)} calculated from sessions
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">User Segment</h3>
                      <div className="flex items-center">
                        <div className={`px-3 py-1 rounded-full ${
                          userJourney.userSegment === 'converter' ? 'bg-green-100 text-green-800' :
                          userJourney.userSegment === 'engaged' ? 'bg-blue-100 text-blue-800' :
                          userJourney.userSegment === 'bounced' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        } font-medium`}>
                          {userJourney.userSegment || 'Unknown'}
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-sm">
                          {userJourney.userSegment === 'converter' ? 
                            `Converted after ${userJourney.sessionsBeforeConversion || '?'} sessions (${userJourney.daysToConversion || '?'} days)` :
                          userJourney.userSegment === 'engaged' ? 
                            'Actively engaged with multiple sessions' :
                          userJourney.userSegment === 'bounced' ? 
                            'Visited once and left quickly' :
                            'Browsed but hasn\'t converted yet'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">First & Last Visit</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">First Visit:</p>
                          <p className="font-medium">{formatDateTime(userJourney.firstVisit)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Last Visit:</p>
                          <p className="font-medium">{formatDateTime(userJourney.lastVisit)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Time Between:</p>
                          <p>{userJourney.firstVisit && userJourney.lastVisit ? 
                            formatDistance(new Date(userJourney.lastVisit), new Date(userJourney.firstVisit)) : 
                            'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Session Summary</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">Session</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">Pages</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">Duration</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">Device</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">Converted</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sessions.map((session, index) => (
                            <tr key={session._id || index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {session.sessionNumber || index + 1}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {formatDateTime(session.startTime)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                <span className={
                                  session.visitedPages && 
                                  session.pagesViewed !== session.visitedPages.length 
                                  ? 'text-orange-600 font-medium' 
                                  : ''
                                }>
                                  {session.pagesViewed || 0}
                                  {session.visitedPages && 
                                   session.pagesViewed !== session.visitedPages.length && 
                                   ` (${session.visitedPages.length} actual)`}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {formatDuration(session.duration)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {session.device ? session.device.type : 'Unknown'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                <span className={hasWalletConnection(session) ? 'text-green-600' : 'text-red-600'}>
                                  {hasWalletConnection(session) ? '✓' : '✗'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Raw user data for debugging */}
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">User Data</h3>
                    <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(userJourney, null, 2)}
                    </pre>
                  </div>
                  
                  {/* Raw session data */}
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Session Data</h3>
                    <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(sessions, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserJourneyPopup; 
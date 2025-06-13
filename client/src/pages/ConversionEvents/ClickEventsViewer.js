import React, { useState, useEffect } from 'react';
import axiosInstance from '../../axiosInstance';
import { Search, RefreshCw } from 'lucide-react';

const ClickEventsViewer = ({ siteId }) => {
  const [pagePath, setPagePath] = useState('');
  const [clickEvents, setClickEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data when component mounts or when siteId changes
  useEffect(() => {
    if (siteId) {
      fetchClickEvents('', true);
    } else {
      setInitialLoading(false);
    }
  }, [siteId]);

  const fetchClickEvents = async (path = pagePath, isInitialLoad = false) => {
    if (!siteId) {
      setError('Site ID is required');
      setInitialLoading(false);
      return;
    }

    if (isInitialLoad) {
      setInitialLoading(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await axiosInstance.get('/sdk/click-events', {
        params: {
          siteId,
          pagePath: path || undefined
        }
      });

      if (response.data && response.data.clickEvents) {
        setClickEvents(response.data.clickEvents);
      } else {
        setClickEvents([]);
      }
    } catch (err) {
      console.error('Error fetching click events:', err);
      setError('Failed to fetch click events. Please try again.');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleSearch = () => {
    fetchClickEvents();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchClickEvents();
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Element Click Events</h2>
      
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <div className="relative flex-grow">
            <input
              type="text"
              value={pagePath}
              onChange={(e) => setPagePath(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter page path (e.g., /pricing)"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pl-10"
              disabled={loading || initialLoading}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || initialLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin mr-2" />
                <span>Searching...</span>
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      <div className="overflow-x-auto">
        {initialLoading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw size={24} className="animate-spin mr-2 text-indigo-600" />
            <span className="text-gray-600">Loading click events...</span>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Element
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Text
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID / Data ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page Path
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clickEvents.length > 0 ? (
                clickEvents.map((event, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {event.eventData.tagName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                      {event.eventData.innerText || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.eventData.id || event.eventData.dataId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.pagePath}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    {loading ? 'Loading...' : 'No click events found. Enter a page path and click Search or leave empty to see all events.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ClickEventsViewer; 
import React, { useState, useEffect } from 'react';
import ClickEventsViewer from './ClickEventsViewer';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../axiosInstance';

const ConversionEvents = () => {
  const { teamId } = useParams();
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        const response = await axiosInstance.get(`/website/team/${teamId}`);
        if (response.data && response.data.websites) {
          setWebsites(response.data.websites);
          
          // Select the first website by default if available
          if (response.data.websites.length > 0) {
            setSelectedWebsite(response.data.websites[0].siteId);
          }
        }
      } catch (error) {
        console.error('Error fetching websites:', error);
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchWebsites();
    }
  }, [teamId]);

  const handleWebsiteChange = (e) => {
    setSelectedWebsite(e.target.value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Conversion Events</h1>
      
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Website
        </label>
        <select
          value={selectedWebsite}
          onChange={handleWebsiteChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          disabled={loading}
        >
          {loading ? (
            <option>Loading websites...</option>
          ) : websites.length > 0 ? (
            websites.map((website) => (
              <option key={website.siteId} value={website.siteId}>
                {website.Domain || website.siteId}
              </option>
            ))
          ) : (
            <option>No websites available</option>
          )}
        </select>
      </div>

      {selectedWebsite && (
        <div className="space-y-8">
          <ClickEventsViewer siteId={selectedWebsite} />
          
          {/* Future conversion event components can be added here */}
        </div>
      )}
      
      {!selectedWebsite && !loading && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please select a website to view conversion events.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversionEvents; 
import React, { useState, useEffect } from 'react';
import ClickEventsViewer from './ClickEventsViewer';
import Header from '../../components/Header';
import Filters from '../Offchainpart/Filters';
import axiosInstance from '../../axiosInstance';

const ConversionEvents = ({ onMenuClick, screenSize, selectedPage }) => {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [selectedWebsite, setSelectedWebsite] = useState();
  const [selectedDate, setSelectedDate] = useState('Select Date');
  const [selectedFilters, setSelectedFilters] = useState('Select Filters');
  const [secondNavOpen, setSecondNavOpen] = useState(false);
  const [websitearray, setWebsitearray] = useState([]);
  const [contractarray, setcontractarray] = useState([]);
  const [analytics, setanalytics] = useState({});
  const [idy, setidy] = useState(localStorage.getItem("idy"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toggle second navigation on mobile
  const toggleSecondNav = () => {
    setSecondNavOpen(!secondNavOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Content area with header and flexible content */}
      <div className="flex flex-col w-full h-screen">
        {/* Header - fixed at top */}
        <Header className="w-full flex-shrink-0" onMenuClick={onMenuClick} screenSize={screenSize} />

        {/* Content area below header */}
        <div className="flex flex-1 overflow-hidden">
          {/* Mobile menu toggle button for second navigation */}
          <button 
            className="md:hidden fixed top-4 left-16 z-40 p-2 bg-white rounded-md shadow-md"
            onClick={toggleSecondNav}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {/* Second navigation bar - fixed on desktop, slide-in drawer on mobile */}
          <div className={`md:w-48 md:static md:block bg-white shadow-md h-full flex-shrink-0 transition-all duration-300 
            ${secondNavOpen ? 'fixed left-0 top-0 w-64 z-30 pt-16' : 'hidden'}`}>
            <nav className="p-4 space-y-2 overflow-y-auto max-h-full">
              <div className="text-xs text-gray-500 uppercase mt-4 mb-2 font-semibold">
                Conversion Events
              </div>
              <div 
                className="px-3 py-2 rounded-md cursor-pointer bg-purple-100 text-purple-600 text-sm"
              >
                Element Clicks
              </div>
              {/* Add more event types here in the future */}
            </nav>
          </div>
          
          {/* Main content area - scrollable */}
          <div className="flex-grow overflow-y-auto">
            {/* Filters section */}
            <Filters 
              websitearray={websitearray}
              setWebsitearray={setWebsitearray}
              contractarray={contractarray}
              setcontractarray={setcontractarray}
              analytics={analytics}
              setanalytics={setanalytics}
              selectedDate={selectedDate} 
              setSelectedDate={setSelectedDate} 
              selectedWebsite={selectedWebsite} 
              setSelectedWebsite={setSelectedWebsite}
              selectedFilters={selectedFilters} 
              setSelectedFilters={setSelectedFilters}
              idy={idy}
              setidy={setidy}
              selectedPage={selectedPage}
              onMenuClick={onMenuClick}
            />
            
            {/* Main content */}
            <div className="px-4 pb-4">
              {idy ? (
                <ClickEventsViewer siteId={idy} />
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Please select a website to view click events.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionEvents; 
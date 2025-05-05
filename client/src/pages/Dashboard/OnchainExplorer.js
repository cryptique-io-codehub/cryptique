import React,{useState,useEffect} from "react";
import Header from "../../components/Header";
import Filters from "../Offchainpart/Filters";
import OnchainDashboard from "../Onchainpart/OnchainDashboard";
import OnchainTraffic from "../Onchainpart/OnchainTraffic";
import Onchainuserinsights from "../Onchainpart/Onchainuserinsights"
import OnchainmarketInsights from "../Onchainpart/OnchainmarketInsights";
import Onchainwalletinsights from "../Onchainpart/Onchainwalletinsights";

const OnchainExplorer = ({ 
  onMenuClick, 
  screenSize, 
  selectedPage, 
  websitearray, 
  setWebsitearray, 
  contractarray, 
  setcontractarray, 
  analytics, 
  setanalytics, 
  idy 
}) => {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [selectedWebsite, setSelectedWebsite] = useState();
  const [selectedDate, setSelectedDate] = useState('Select Date');
  const [selectedFilters, setSelectedFilters] = useState('Select Filters');
  const [secondNavOpen, setSecondNavOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState();
  const [localIdy, setLocalIdy] = useState(idy || localStorage.getItem("idy"));

  // Use pre-loaded website data when component mounts
  useEffect(() => {
    if (websitearray && websitearray.length > 0) {
      const savedWebsiteDomain = localStorage.getItem("selectedWebsite");
      
      // Find the selected website in the array
      const currentWebsite = websitearray.find(
        website => website.Domain === savedWebsiteDomain
      );
      
      if (currentWebsite) {
        console.log("Using pre-loaded website:", currentWebsite);
        setSelectedWebsite(currentWebsite);
      } else if (websitearray.length > 0) {
        // Fallback to first website if saved one isn't found
        setSelectedWebsite(websitearray[0]);
      }
    }
  }, [websitearray]);

  const navItems = [
    { section: 'On-chain analytics', type: 'header' },
    { label: 'Dashboard' },
    { label: 'Traffic analytics' },
    { label: 'User Insights' },
    { label: 'Market Insights' },
    { label: 'Wallet Insights' }
  ];
  
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
          <div className={`md:w-48 lg:w-56 flex-shrink-0 bg-white border-r border-gray-200 h-full overflow-y-auto md:block
            ${secondNavOpen ? 'fixed md:relative inset-y-0 left-0 w-56 z-40 transform translate-x-0 transition-transform duration-300 ease-in-out' : 
            'fixed md:relative inset-y-0 left-0 w-56 z-40 transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out'}`}>
            
            {/* Close button for mobile */}
            <button 
              className="md:hidden absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700"
              onClick={toggleSecondNav}
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation items */}
            <div className="p-4">
              {navItems.map((item, index) => (
                <div key={index} className="mb-1">
                  {item.type === 'header' ? (
                    <div className="uppercase text-xs font-semibold text-gray-500 tracking-wider mb-2">
                      {item.section}
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveSection(item.label)}
                      className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        activeSection === item.label
                          ? 'bg-purple-100 text-purple-800 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main content area - scrollable */}
          <div className="flex-grow overflow-y-auto">
               
            {/* Main content */}
            <div className="px-2 md:px-4 pb-4">
              {/* Main content section */}
              {activeSection === 'Dashboard' && (
                <>
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
                    idy={localIdy}
                    setidy={setLocalIdy}
                    selectedPage={selectedPage}
                    onMenuClick={onMenuClick}
                  />
                  <OnchainDashboard/>
                </>
              )}
              
              {activeSection === 'Traffic analytics' && (
                <>
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
                    idy={localIdy}
                    setidy={setLocalIdy}
                    selectedPage={selectedPage}
                    onMenuClick={onMenuClick}
                  />
                  <OnchainTraffic/>
                </>
              )}
              
              {activeSection === 'User Insights' && (
                <>
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
                    idy={localIdy}
                    setidy={setLocalIdy}
                    selectedPage={selectedPage}
                    onMenuClick={onMenuClick}
                  />
                  <Onchainuserinsights/>
                </>
              )}
              
              {activeSection === 'Market Insights' && (
                <>
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
                    idy={localIdy}
                    setidy={setLocalIdy}
                    selectedPage={selectedPage}
                    onMenuClick={onMenuClick}
                  />
                  <OnchainmarketInsights/>
                </>
              )}

              {activeSection === 'Wallet Insights' && (
                <>
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
                    idy={localIdy}
                    setidy={setLocalIdy}
                    selectedPage={selectedPage}
                    onMenuClick={onMenuClick}
                  />
                  <Onchainwalletinsights/>
                </>
              )}
            </div>
            
            {/* Overlay for mobile */}
            {secondNavOpen && (
              <div 
                className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                onClick={toggleSecondNav}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnchainExplorer;
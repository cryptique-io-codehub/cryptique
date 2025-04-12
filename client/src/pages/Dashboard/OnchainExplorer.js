import React,{useState,useEffect} from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Filters from "../Offchainpart/Filters";
import OnchainDashboard from "../Onchainpart/OnchainDashboard";
import OnchainTraffic from "../Onchainpart/OnchainTraffic";
import Onchainuserinsights from "../Onchainpart/Onchainuserinsights"
import OnchainmarketInsights from "../Onchainpart/OnchainmarketInsights";
import Onchainwalletinsights from "../Onchainpart/Onchainwalletinsights";
const OnchainExplorer = () => {
   const [activeSection, setActiveSection] = useState('Dashboard');
    const [selectedWebsite, setSelectedWebsite] = useState();
    const [selectedDate, setSelectedDate] = useState('Select Date');
    const [selectedFilters, setSelectedFilters] = useState('Select Filters');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [secondNavOpen, setSecondNavOpen] = useState(false);
    const [websitearray,setWebsitearray]=useState([]);
    const [analytics,setanalytics]=useState({});
    const [idy,setidy]=useState(localStorage.getItem("idy"));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedCountry, setSelectedCountry] = useState();


    const navItems = [
      { section: 'On-chain analytics', type: 'header' },
      { label: 'Dashboard' },
      { label: 'Traffic analytics' },
      { label: 'User Insights' },
      { label: 'Market Insights' },
      { label: 'Wallet Insights' }
    ];
     // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Toggle second navigation on mobile
  const toggleSecondNav = () => {
    setSecondNavOpen(!secondNavOpen);
  };
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Mobile menu toggle button for main sidebar */}
        <button 
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
          onClick={toggleSidebar}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
    
        {/* Main sidebar - fixed on desktop, slide-in on mobile */}
        <div className={`h-screen flex-shrink-0 md:block ${sidebarOpen ? 'block fixed z-40' : 'hidden'}`}>
          <Sidebar currentPage="offchain-analytics" />
        </div>
    
        {/* Content area with header and flexible content */}
        <div className="flex flex-col w-full h-screen">
          {/* Header - fixed at top */}
          <Header className="w-full flex-shrink-0" />
    
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
                {navItems.map((item, index) => (
                  item.type === 'header' ? (
                    <div 
                      key={index} 
                      className="text-xs text-gray-500 uppercase mt-4 mb-2 font-semibold"
                    >
                      {item.section}
                    </div>
                  ) : (
                    <div 
                      key={index}
                      className={`
                        px-3 py-2 rounded-md cursor-pointer 
                        ${activeSection === item.label 
                          ? 'bg-purple-100 text-purple-600' 
                          : 'text-gray-700 hover:bg-gray-100'}
                        text-sm
                      `}
                      onClick={() => {
                        setActiveSection(item.label);
                        // Close navigation drawer on mobile after selection
                        if (window.innerWidth < 768) {
                          setSecondNavOpen(false);
                        }
                      }}
                    >
                      {item.label}
                    </div>
                  )
                ))}
              </nav>
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
                          analytics={analytics}
                          setanalytics={setanalytics}
                          selectedDate={selectedDate} 
                          setSelectedDate={setSelectedDate} 
                          selectedWebsite={selectedWebsite} 
                          setSelectedWebsite={setSelectedWebsite}
                          selectedFilters={selectedFilters} 
                          setSelectedFilters={setSelectedFilters}
                          idy={idy}
                          setidy={setidy}/>
                      <OnchainDashboard/>
                      </>

                    )}
                    
                    {activeSection === 'Traffic analytics' && (
                      <>
                        <Filters 
                          websitearray={websitearray}
                          setWebsitearray={setWebsitearray}
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
                        />
                        <OnchainTraffic/>
                      </>
                    )}
                    
                    {activeSection === 'User Insights' && (
                      <>
                        <Filters 
                          websitearray={websitearray}
                          setWebsitearray={setWebsitearray}
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
                        />
                        <Onchainuserinsights/>
                      </>
                    )}
                    
                    {activeSection === 'Market Insights' && (
                      <>
                        <Filters 
                          websitearray={websitearray}
                          setWebsitearray={setWebsitearray}
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
                        />
                        <OnchainmarketInsights/>
                      </>
                    )}

                    {activeSection === 'Wallet Insights' && (
                      <>
                        <Filters 
                          websitearray={websitearray}
                          setWebsitearray={setWebsitearray}
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
                        />
                        <Onchainwalletinsights/>
                      </>
                    )}
                    
                    {/* For all other sections, display placeholder content */}
                  </div>
                
    
            </div>
                
          </div>
        </div>
        
        {/* Overlay for mobile navigation */}
        {(sidebarOpen || secondNavOpen) && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => {
              setSidebarOpen(false);
              setSecondNavOpen(false);
            }}
          />
        )}
      </div>
    );
    };
    
    export default OnchainExplorer;
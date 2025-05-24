import React,{useState,useEffect} from "react";
import Header from "../../components/Header";
import Filters from "../Offchainpart/Filters";
import OnchainDashboard from "../Onchainpart/OnchainDashboard";
import OnchainTraffic from "../Onchainpart/OnchainTraffic";
import Onchainuserinsights from "../Onchainpart/Onchainuserinsights"
import OnchainmarketInsights from "../Onchainpart/OnchainmarketInsights";
import Onchainwalletinsights from "../Onchainpart/Onchainwalletinsights";
import { useContractData } from "../../contexts/ContractDataContext";
import preloadData from "../../utils/preloadService";
import sdkApi from "../../utils/sdkApi";

const OnchainExplorer = ({ onMenuClick, screenSize ,selectedPage}) => {
   const [activeSection, setActiveSection] = useState('Dashboard');
    const [selectedWebsite, setSelectedWebsite] = useState();
    const [selectedDate, setSelectedDate] = useState('Select Date');
    const [selectedFilters, setSelectedFilters] = useState('Select Filters');
    const [secondNavOpen, setSecondNavOpen] = useState(false);
    const [websitearray,setWebsitearray]=useState([]);
    const[contractarray,setcontractarray]=useState([]);
    const [analytics,setanalytics]=useState({});
    const [idy,setidy]=useState(localStorage.getItem("idy"));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedCountry, setSelectedCountry] = useState();
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
    
    // Import the refreshContracts function from context
    const { refreshContracts } = useContractData();

    // Function to fetch analytics data
    const fetchAnalyticsData = async (websiteId) => {
      if (!websiteId) return;
      
      setIsLoadingAnalytics(true);
      try {
        // Check cache first
        const cachedData = localStorage.getItem(`analytics_${websiteId}`);
        const cachedTimestamp = localStorage.getItem(`analytics_timestamp_${websiteId}`);
        const now = Date.now();
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

        if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp)) < CACHE_DURATION) {
          console.log("Using cached analytics data");
          const parsedData = JSON.parse(cachedData);
          if (parsedData?.sessions?.length > 0) {
            setanalytics(parsedData);
            setIsLoadingAnalytics(false);
            return;
          }
        }

        console.log(`Fetching analytics data for website ID: ${websiteId}`);
        const response = await sdkApi.getAnalytics(websiteId);
        
        if (response && response.analytics) {
          setanalytics(response.analytics);
          // Cache the data
          localStorage.setItem(`analytics_${websiteId}`, JSON.stringify(response.analytics));
          localStorage.setItem(`analytics_timestamp_${websiteId}`, now.toString());
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setError("Failed to load analytics data");
      } finally {
        setIsLoadingAnalytics(false);
      }
    };
    
    // Create a custom event for refreshing contracts from Filters component
    useEffect(() => {
      window.refreshContractsEvent = new Event('refreshContracts');
      
      const handleRefreshContracts = () => {
        console.log("Contract refresh event triggered by website change");
        if (refreshContracts) {
          refreshContracts();
        }
      };
      
      window.addEventListener('refreshContracts', handleRefreshContracts);
      
      return () => {
        window.removeEventListener('refreshContracts', handleRefreshContracts);
        delete window.refreshContractsEvent;
      };
    }, [refreshContracts]);
    
    // Load all data when component mounts or when team/website changes
    useEffect(() => {
      const loadAllData = async () => {
        console.log("OnchainExplorer mounted, loading all data");
        
        try {
          // Clear any cached data to ensure fresh data
          sessionStorage.removeItem("preloadedContracts");
          
          // Load contract data
          if (typeof refreshContracts === 'function') {
            await refreshContracts();
          }
          
          // Run the preload service
          await preloadData(true);
          
          // Load analytics data if we have a website ID
          const websiteId = localStorage.getItem("idy");
          if (websiteId) {
            await fetchAnalyticsData(websiteId);
          }
          
          console.log("Successfully loaded all data in OnchainExplorer");
        } catch (error) {
          console.error("Error loading data in OnchainExplorer:", error);
        }
      };
      
      loadAllData();
      
      // Set up team change listener
      const currentTeam = localStorage.getItem("selectedTeam");
      
      const checkTeamChange = () => {
        const newTeam = localStorage.getItem("selectedTeam");
        if (newTeam && newTeam !== currentTeam) {
          console.log(`Team changed in OnchainExplorer: ${currentTeam} → ${newTeam}, refreshing data`);
          loadAllData();
        }
      };
      
      const intervalId = setInterval(checkTeamChange, 2000);
      
      return () => {
        clearInterval(intervalId);
      };
    }, [refreshContracts]);

    // Listen for website changes
    useEffect(() => {
      const websiteId = localStorage.getItem("idy");
      if (websiteId) {
        fetchAnalyticsData(websiteId);
      }
    }, [idy]);

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
                      <OnchainDashboard analytics={analytics} isLoadingAnalytics={isLoadingAnalytics} />
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
                    idy={idy}
                    setidy={setidy}
                    selectedPage={selectedPage}
                    onMenuClick={onMenuClick}
                  />
                        <OnchainTraffic 
                          analytics={analytics} 
                          isLoadingAnalytics={isLoadingAnalytics}
                          error={error}
                        />
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
                    idy={idy}
                    setidy={setidy}
                    selectedPage={selectedPage}
                    onMenuClick={onMenuClick}
                  />
                        <Onchainuserinsights analytics={analytics} isLoadingAnalytics={isLoadingAnalytics} />
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
                                           idy={idy}
                                           setidy={setidy}
                                           selectedPage={selectedPage}
                                           onMenuClick={onMenuClick}
                       
                                         />
                        <OnchainmarketInsights analytics={analytics} isLoadingAnalytics={isLoadingAnalytics} />
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
                                            idy={idy}
                                            setidy={setidy}
                                            selectedPage={selectedPage}
                                            onMenuClick={onMenuClick}
                        
                                          />
                        <Onchainwalletinsights analytics={analytics} isLoadingAnalytics={isLoadingAnalytics} />
                      </>
                    )}
                  </div>
                </div>
          </div>
        </div>
        
        {/* Overlay for mobile navigation */}
        {secondNavOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => {
              setSecondNavOpen(false);
            }}
          />
        )}
      </div>
    );
    };
    
    export default OnchainExplorer;
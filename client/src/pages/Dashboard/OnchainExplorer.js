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

const OnchainExplorer = ({ onMenuClick, screenSize, selectedPage}) => {
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
    const [pageReady, setPageReady] = useState(false);
    const [error, setError] = useState(null);
    const [selectedCountry, setSelectedCountry] = useState();
    
    // Import the refreshContracts function from context
    const { refreshContracts, isLoadingTransactions } = useContractData();

    // Set loading state and dispatch global loading event
    const setGlobalLoadingState = (isLoading) => {
      setIsLoading(isLoading);
      
      // Dispatch global event for central loading indicator
      window.dispatchEvent(new CustomEvent('globalDataLoading', { 
        detail: { isLoading, source: 'onchainExplorer' }
      }));
    };

    // Load initial data
    useEffect(() => {
      const loadInitialData = async () => {
        setGlobalLoadingState(true);
        
        try {
          if (refreshContracts) {
            await refreshContracts();
          }
          
          // Any other onchain-specific initialization can go here
          
        } catch (error) {
          console.error("Error loading onchain data:", error);
          setError("Failed to load blockchain data. Please try again.");
        } finally {
          setGlobalLoadingState(false);
          setPageReady(true);
        }
      };
      
      loadInitialData();
    }, [refreshContracts]);

    // Update loading state when contract transactions are loading
    useEffect(() => {
      setGlobalLoadingState(isLoadingTransactions);
    }, [isLoadingTransactions]);

    // Listen for website changes
    useEffect(() => {
      const newIdy = localStorage.getItem("idy");
      if (newIdy !== idy) {
        setIdy(newIdy);
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
                    {!pageReady ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                          <p className="text-gray-600">Initializing blockchain explorer...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Show loading indicator when data is being fetched */}
                        {isLoading && (
                          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                            <div className="flex flex-col items-center">
                              <svg
                                className="animate-spin h-8 w-8 text-blue-600 mb-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              <span className="text-sm text-gray-600 font-medium">Loading blockchain data...</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Filter bar */}
                        <div className="mb-6">
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
                        </div>
                        
                        {/* Main content area with section tabs */}
                        <div className="flex flex-col space-y-6">
                          {/* Tabs for sections */}
                          <div className="bg-white rounded-lg shadow-sm p-2 flex space-x-2 overflow-x-auto no-scrollbar">
                            {['Dashboard', 'Traffic', 'User Insights', 'Market Insights', 'Wallet Analytics'].map((section) => (
                              <button
                                key={section}
                                onClick={() => setActiveSection(section)}
                                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                                  activeSection === section
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {section}
                              </button>
                            ))}
                          </div>
                          
                          {/* Section content */}
                          <div className="bg-white rounded-lg shadow-sm p-6">
                            {activeSection === 'Dashboard' && <OnchainDashboard />}
                            {activeSection === 'Traffic' && <OnchainTraffic />}
                            {activeSection === 'User Insights' && <Onchainuserinsights />}
                            {activeSection === 'Market Insights' && <OnchainmarketInsights />}
                            {activeSection === 'Wallet Analytics' && <Onchainwalletinsights />}
                          </div>
                        </div>
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
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
import useSubscriptionCheck from '../../hooks/useSubscriptionCheck';
import UpgradePrompt from '../../components/UpgradePrompt';
import { useParams } from 'react-router-dom';

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
    const { team } = useParams();
    const { checkAccess, getFeatureUsageAndLimit, subscription } = useSubscriptionCheck();
    const [contracts, setContracts] = useState([]);
    const [showSubscriptionAlert, setShowSubscriptionAlert] = useState(false);
    
    // Import the refreshContracts function from context
    const { refreshContracts } = useContractData();
    
    // Refresh contract data when component mounts or when team changes
    useEffect(() => {
      const loadContractData = async () => {
        console.log("OnchainExplorer mounted, refreshing contract data");
        
        try {
          // First clear any cached data to ensure fresh data
          sessionStorage.removeItem("preloadedContracts");
          
          // Then use the context's refresh function
          if (typeof refreshContracts === 'function') {
            await refreshContracts();
          }
          
          // Also run the preload service with force refresh
          await preloadData(true);
          
          console.log("Successfully refreshed contract data on OnchainExplorer mount");
        } catch (error) {
          console.error("Error refreshing contract data in OnchainExplorer:", error);
        }
      };
      
      loadContractData();
      
      // Also set up a listener for team changes
      const currentTeam = localStorage.getItem("selectedTeam");
      
      const checkTeamChange = () => {
        const newTeam = localStorage.getItem("selectedTeam");
        if (newTeam && newTeam !== currentTeam) {
          console.log(`Team changed in OnchainExplorer: ${currentTeam} → ${newTeam}, refreshing data`);
          loadContractData();
        }
      };
      
      // Check for team changes
      const intervalId = setInterval(checkTeamChange, 2000);
      
      return () => {
        clearInterval(intervalId);
      };
    }, [refreshContracts]);

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

  // Update this function to check subscription limits
  const handleAddContract = async () => {
    // Check if user has reached contract limit
    const contractCount = contracts.length;
    const canAddContract = checkAccess('contracts', contractCount + 1);
    
    if (!canAddContract) {
      setShowSubscriptionAlert(true);
      return;
    }
    
    // If they have access, show the add contract form
    setShowAddContractForm(true);
  };

  // Add this to render usage information
  const renderUsageInfo = () => {
    const { usage, limit } = getFeatureUsageAndLimit('contracts');
    const actualUsage = contracts.length; // Use actual count from state
    
    return (
      <div className="mb-4 bg-gray-50 p-4 rounded-md border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Smart Contract Usage</span>
          <span className="text-sm text-gray-600">{actualUsage} of {limit}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${actualUsage >= limit ? 'bg-red-600' : 'bg-blue-600'}`}
            style={{ width: `${Math.min((actualUsage / limit) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
    );
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
                    idy={idy}
                    setidy={setidy}
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
                    idy={idy}
                    setidy={setidy}
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
                                           idy={idy}
                                           setidy={setidy}
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
                                            idy={idy}
                                            setidy={setidy}
                                            selectedPage={selectedPage}
                                            onMenuClick={onMenuClick}
                        
                                          />
                        <Onchainwalletinsights/>
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

        {/* Subscription alert */}
        {showSubscriptionAlert && (
          <div className="p-4 md:p-8">
            <UpgradePrompt 
              feature="contracts"
              teamId={team} 
              currentPlan={subscription?.plan || 'current'}
            />
          </div>
        )}
      </div>
    );
    };
    
    export default OnchainExplorer;
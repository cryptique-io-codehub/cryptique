import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip } from "recharts";
import Header from '../../components/Header';
import AnalyticsChart from '../Offchainpart/AnalyticsChart';
import TrafficSourcesComponent from '../Offchainpart/TrafficSourcesComponent';
import Filters from '../Offchainpart/Filters';
import GeoAnalyticsMap from '../Offchainpart/GeoAnalyticsMap';
import TrafficAnalytics from '../Offchainpart/Trafficanalytics/TrafficAnalytics ';
import GeoAnalyticss from '../Offchainpart/Trafficanalytics/GeoAnalyticss';
import RetentionAnalytics from '../Offchainpart/Trafficanalytics/RetentionAnalytics';
import FunnelDashboard from '../Offchainpart/FunnelDashboard';
import { useNavigate } from 'react-router-dom';
import sdkApi from '../../utils/sdkApi';
import { calculateAverageDuration, formatDuration, calculateWeb3Stats } from '../../utils/analyticsHelpers';

const OffchainAnalytics = ({ onMenuClick, screenSize,selectedPage }) => {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [selectedWebsite, setSelectedWebsite] = useState();
  const [selectedDate, setSelectedDate] = useState('Select Date');
  const [selectedFilters, setSelectedFilters] = useState('Select Filters');
  const [secondNavOpen, setSecondNavOpen] = useState(false);
  const [websitearray,setWebsitearray]=useState([]);
  const[contractarray,setcontractarray]=useState([]);
  const [analytics,setanalytics]=useState({});
  const [idy,setidy]=useState(localStorage.getItem("idy"));
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState();
  const [verifyload,setverifyload]=useState(false);

  // State for analytics cards
  // console.log(analytics);
  useEffect(()=>{
    const handleSelectWebsite=async()=>{
      const idt=localStorage.getItem("idy");
      if(idt){
        setverifyload(true);
        try {
          // Use the SDK API utility instead of the axios instance
          const response = await sdkApi.getAnalytics(idt);
          if (response && response.analytics) {
            setanalytics(response.analytics);
            // Initialize chart data if not already set
            if (!chartData) {
              setChartData({
                labels: [],
                datasets: [
                  {
                    label: 'Visitors',
                    data: [],
                    backgroundColor: 'rgba(252, 211, 77, 0.5)',
                    borderColor: '#fcd34d',
                    borderWidth: 1
                  },
                  {
                    label: 'Wallets',
                    data: [],
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1
                  }
                ]
              });
            }
          }
        } catch (error) {
          console.error('Error fetching analytics:', error);
          setError('Failed to load analytics data. Please check your connection or try again later.');
        } finally {
          setverifyload(false);
        }
      }
    }
    handleSelectWebsite();
  },[idy]);


console.log(idy);
  const totalPageViews = Object.values(analytics?.pageViews || {}).reduce((sum, views) => sum + views, 0);
  const totalSessions = analytics?.sessions?.length || 1; // Use 1 as fallback to avoid division by zero
  const pagepervisit = (totalPageViews / totalSessions).toFixed(2);

  const calculateBounceRate = (sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return 0;
    
    // Filter out any sessions with invalid isBounce property
    const validSessions = sessions.filter(session => 
      typeof session?.isBounce === 'boolean'
    );
    
    if (validSessions.length === 0) return 0;
    
    const bounceCount = validSessions.reduce((count, session) => {
      return session.isBounce ? count + 1 : count;
    }, 0);
    
    // Calculate percentage and round to 2 decimal places
    return (bounceCount / validSessions.length) * 100;
  };

const bounceRate = calculateBounceRate(analytics?.sessions).toFixed(2);
const rawAvgDuration = calculateAverageDuration(analytics?.sessions);
const avgVisitDuration = formatDuration(rawAvgDuration);

  // State for Web3 analytics data
  const [web3Data, setWeb3Data] = useState({
    visitorsPercentage: "0.00%",
    visitorsIncrease: "0.0% Increase",
    walletsConnected: 0,
    walletsIncrease: "0.0% Increase"
  });
  
  // State for traffic sources
  const [trafficSources, setTrafficSources] = useState([
    { source: 'Twitter', icon: 'twitter', visitors: 0, wallets: 0 ,wallets_section:0},
    { source: 'Linkedin', icon: 'linkedin', visitors: 0, wallets: 0,wallets_section:0 },
    { source: 'Instagram', icon: 'instagram', visitors: 0, wallets: 0,wallets_section:0 },
    { source: 'Dribbble', icon: 'dribbble', visitors: 0, wallets: 0,wallets_section:0 },
    { source: 'Behance', icon: 'behance', visitors: 0, wallets: 0,wallets_section:0 },
    { source: 'Pinterest', icon: 'pinterest', visitors: 0, wallets: 0,wallets_section:0 }
  ]);
  
  // State for user information
  const [userData, setUserData] = useState({
    name: "User"
  });

  const navItems = [
    { section: 'Off-chain analytics', type: 'header' },
    { label: 'Dashboard', category: 'Off-chain analytics' },
    { label: 'Traffic analytics', category: 'Off-chain analytics' },
    { label: 'Geo Insights', category: 'Off-chain analytics' },
    { section: 'BEHAVIOR', type: 'header' },
    { label: 'Retention', category: 'BEHAVIOR' },
    { label: 'Event Conversions', category: 'BEHAVIOR' }
  ];

  const data = [
    { 
      name: "New", 
      value: analytics?.uniqueVisitors || 0, 
      color: "#3B82F6",
      percentage: totalSessions > 0 ? ((analytics?.uniqueVisitors || 0) / totalSessions * 100).toFixed(2) : "0.00"
    },
    { 
      name: "Returning", 
      value: totalSessions > 0 ? (totalSessions - (analytics?.uniqueVisitors || 0)) : 0, 
      color: "#F59E0B",
      percentage: totalSessions > 0 ? ((totalSessions - (analytics?.uniqueVisitors || 0)) / totalSessions * 100).toFixed(2) : "0.00"
    }
  ];
  
  // Updated AnalyticsCard to match On-chain styling with Montserrat for headings and Poppins for body
  const AnalyticsCard = ({ label, data, bgColor, textColor }) => (
    <div className={`${bgColor} ${textColor} p-4 rounded-lg shadow text-center`}>
      <h2 className="font-semibold text-lg mb-2 font-montserrat">{label}</h2>
      <h3 className="text-xl font-bold font-montserrat">{data}</h3>
      <p className="text-xs text-gray-500 font-poppins">Total Overall</p>
    </div>
  );


  // Fetch analytics data from server when filters change
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching data for siteId:', idy);
        
        // Get date range from selectedDate
        let startDate, endDate;
        if (selectedDate === 'Select Date') {
          // If no date is selected, use today's date
          const today = new Date();
          startDate = today.toISOString().split('T')[0];
          endDate = startDate;
        } else if (selectedDate === 'today') {
          const today = new Date();
          startDate = today.toISOString().split('T')[0];
          endDate = startDate;
        } else if (selectedDate === 'yesterday') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = yesterday.toISOString().split('T')[0];
          endDate = startDate;
        } else if (selectedDate === 'last7days') {
          const end = new Date();
          const start = new Date();
          start.setDate(start.getDate() - 7);
          startDate = start.toISOString().split('T')[0];
          endDate = end.toISOString().split('T')[0];
        } else if (selectedDate === 'last30days') {
          const end = new Date();
          const start = new Date();
          start.setDate(start.getDate() - 30);
          startDate = start.toISOString().split('T')[0];
          endDate = end.toISOString().split('T')[0];
        } else {
          // Custom date range
          startDate = selectedDate;
          endDate = selectedDate;
        }

        console.log('Fetching chart data with params:', {
          siteId: idy,
          timeframe: 'hourly',
          start: startDate,
          end: endDate
        });

        // Fetch chart data from API - use try-catch for each request
        let chartResponse;
        try {
          chartResponse = await sdkApi.getChart(idy, startDate, endDate);
        } catch (chartError) {
          console.error('Chart API Error:', chartError);
          // Continue execution even if this request fails
        }

        if (chartResponse?.data) {
          if (chartResponse.data.error) {
            console.warn("Chart data error:", chartResponse.data.error);
          } else {
            // Transform the data to match the expected format
            const transformedChartData = {
              labels: chartResponse.data.labels || [],
              datasets: [
                {
                  label: 'Visitors',
                  data: chartResponse.data.visitors || []
                },
                {
                  label: 'Wallets',
                  data: chartResponse.data.wallets || []
                }
              ]
            };
            
            setChartData(transformedChartData);
          }
        }

        // Fetch traffic sources data - use try-catch for each request
        let trafficResponse;
        try {
          trafficResponse = await sdkApi.getTrafficSources(idy, startDate, endDate);
          
          if (trafficResponse?.data) {
            if (trafficResponse.data.error) {
              console.warn("Traffic sources data error:", trafficResponse.data.error);
            } else {
              setTrafficSources(trafficResponse.data.sources || []);
            }
          }
        } catch (trafficError) {
          console.error('Traffic Sources API Error:', trafficError);
          // Continue execution even if this request fails
        }

        // Update Web3 data using the standardized helper
        const web3Stats = calculateWeb3Stats(analytics?.sessions, analytics?.uniqueVisitors);
        
        // Update web3Data state with the standardized values
        const web3Data = {
          visitorsPercentage: `${web3Stats.web3Percentage}%`,
          visitorsIncrease: `${web3Stats.web3Percentage}% Increase`,
          walletsConnected: web3Stats.walletsConnected,
          walletsIncrease: `${web3Stats.walletsPercentage}% Increase`
        };

        setWeb3Data(web3Data);

      } catch (err) {
        console.error('Error in fetchData:', err);
        setError(err.message || 'Failed to load analytics data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (idy) {
      console.log('Starting data fetch with idy:', idy);
      fetchData();
    } else {
      console.log('No idy available, skipping data fetch');
      setError('No website selected. Please select a website to view analytics.');
    }
  }, [idy, selectedDate, selectedFilters, activeSection, analytics?.uniqueVisitors, analytics?.sessions]);

  // Handler for clicking on a data point - updated to also set traffic sources data
  const handleDataPointClick = (dataPoint, index) => {
    setSelectedDataPoint(dataPoint);
    
    // Calculate percentages based on actual data
    const totalVisitors = analytics?.uniqueVisitors || 1;
    const totalWallets = analytics?.walletsConnected || 1;
    
    const visitorsPercent = ((dataPoint.visitors / totalVisitors) * 100).toFixed(2);
    const visitorsIncreasePercent = ((dataPoint.visitors / totalVisitors) * 100).toFixed(1);
    const walletsIncreasePercent = ((dataPoint.wallets / totalWallets) * 100).toFixed(1);
    
    setWeb3Data({
      visitorsPercentage: `${visitorsPercent}%`,
      visitorsIncrease: `${visitorsIncreasePercent}% Increase`,
      walletsConnected: dataPoint.wallets,
      walletsIncrease: `${walletsIncreasePercent}% Increase`
    });
    
    // Update traffic sources based on actual data
    const updatedSources = trafficSources.map(source => {
      // Calculate factors based on actual data
      const totalSourceVisitors = trafficSources.reduce((sum, s) => sum + s.visitors, 0) || 1;
      const totalSourceWallets = trafficSources.reduce((sum, s) => sum + s.wallets, 0) || 1;
      
      const visitorFactor = source.visitors / totalSourceVisitors;
      const walletFactor = source.wallets / totalSourceWallets;
      
      return {
        ...source,
        visitors: Math.round(dataPoint.visitors * visitorFactor),
        wallets: Math.round(dataPoint.wallets * walletFactor)
      };
    });
    
    setTrafficSources(updatedSources);
  };

  // Toggle second navigation on mobile
  const toggleSecondNav = () => {
    setSecondNavOpen(!secondNavOpen);
  };
    
// setDatas(datas);
console.log(analytics);
return (
  <div className="flex h-screen overflow-hidden bg-gray-50">
    {/* Import fonts in the head */}
    <style>
      {`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Montserrat', sans-serif;
        }
        
        body, p, span, div {
          font-family: 'Poppins', sans-serif;
        }

        .font-montserrat {
          font-family: 'Montserrat', sans-serif;
        }
        
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }
      `}
    </style>

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
        <div className={`bg-white shadow-md h-full border-r border-gray-200 md:block md:w-56 md:static md:z-auto
              ${secondNavOpen ? 'fixed left-0 top-0 w-64 z-30 pt-16' : 'hidden'}`}>
          <nav className="p-4 space-y-2 overflow-y-auto max-h-full">
            {navItems.map((item, index) => (
              item.type === 'header' ? (
                <div 
                  key={index} 
                  className="text-xs text-gray-500 uppercase mt-4 mb-2 font-semibold font-montserrat"
                >
                  {item.section}
                </div>
              ) : (
                <div 
                  key={index}
                  className={`
                    px-3 py-2 rounded-md cursor-pointer font-poppins
                    ${activeSection === item.label 
                      ? 'bg-purple-100 text-purple-600 font-medium' 
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
        <div className="flex-1 p-4 md:p-6 pb-16 overflow-y-auto">
          <div className="container mx-auto">
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
                {verifyload ? (
                  <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
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
                      <span className="text-sm text-gray-600 font-poppins">Loading analytics data...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* MODIFICATION: Analytics cards in full width single row */}
                    {websitearray.length > 0 && analytics && Object.keys(analytics).length > 0 ? (
                      <div className="h-full flex flex-col">
                        <div className="flex flex-col space-y-6">
                          {/* Analytics Cards */}
                          <div className="w-full grid grid-rows-2 gap-6 h-auto mb-6">
                            {/* First row - 4 cards */}
                            <div className="grid grid-cols-4 gap-6">
                              <AnalyticsCard 
                                label="Unique visitors" 
                                data={analytics?.uniqueVisitors} 
                                bgColor="bg-white" 
                                textColor="text-black" 
                              />
                              <AnalyticsCard 
                                label="Wallets Connected" 
                                data={analytics?.walletsConnected}
                                bgColor="bg-white" 
                                textColor="text-black" 
                              />
                              <AnalyticsCard 
                                label="Pages per visit" 
                                data={pagepervisit} 
                                bgColor="bg-white" 
                                textColor="text-black" 
                              />
                              <AnalyticsCard 
                                label="Total Page Views" 
                                data={totalPageViews}
                                bgColor="bg-white" 
                                textColor="text-black" 
                              />
                            </div>
                            
                            {/* Second row - 3 cards */}
                            <div className="grid grid-cols-3 gap-6">
                              <AnalyticsCard 
                                label="Avg. visit duration" 
                                data={avgVisitDuration} 
                                bgColor="bg-white" 
                                textColor="text-black" 
                              />
                              <AnalyticsCard 
                                label="Web3 Users" 
                                data={analytics?.web3Visitors}
                                bgColor="bg-white" 
                                textColor="text-black" 
                              />
                              <AnalyticsCard 
                                label="Bounce rate" 
                                data={bounceRate + '%'} 
                                bgColor="bg-white" 
                                textColor="text-black" 
                              />
                            </div>
                          </div>
                          
                          {/* Dynamic Analytics chart with spacing */}
                          <div className="w-full">
                            <AnalyticsChart 
                              analytics={analytics}
                              setAnalytics={setanalytics}
                              isLoading={isLoading}
                              error={error}
                            />
                          </div>
                          
                          {/* Funnel Dashboard with spacing */}
                          <div className="w-full">
                            <FunnelDashboard analytics={analytics}/>
                          </div>
                          
                          {/* MODIFICATION: Traffic Sources & User Type cards in same line */}
                          <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-6 lg:space-y-0">
                            {/* Traffic Sources Component - Now 50% width */}
                            <div className="w-full lg:w-1/2">
                              <TrafficSourcesComponent 
                                setanalytics={setanalytics}
                                analytics={analytics}
                                trafficSources={trafficSources} 
                                setTrafficSources={setTrafficSources}
                                className="h-full"
                              />
                            </div>
                            
                            {/* User Type Donut Chart - Now 50% width */}
                            <div className="w-full lg:w-1/2 bg-white shadow-md rounded-lg p-6">
                              <h3 className="text-lg font-semibold mb-4 font-montserrat text-center">User Type</h3>
                              <div style={{ height: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={data}
                                      dataKey="value"
                                      nameKey="name"
                                      cx="50%"
                                      cy="50%"
                                      innerRadius="40%"
                                      outerRadius="60%"
                                      startAngle={90}
                                      endAngle={450}
                                      stroke="none"
                                    >
                                      {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>

                              {/* Table */}
                              <div className="mt-4">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="p-2 text-gray-600 text-sm font-montserrat text-center">Type</th>
                                        <th className="p-2 text-gray-600 text-sm font-montserrat text-center">Visitors</th>
                                        <th className="p-2 text-gray-600 text-sm font-montserrat text-center">%</th>
                                      </tr>
                                    </thead>
                                    <tbody className="font-poppins">
                                      {data.map((item, index) => (
                                        <tr key={index} className="border-b">
                                          <td className="p-2 flex items-center text-sm justify-center">
                                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                                            {item.name}
                                          </td>
                                          <td className="p-2 text-sm text-center">{item.value}</td>
                                          <td className="p-2 text-green-500 text-sm text-center">{item.percentage}%</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* MODIFICATION: Full width Geo Analytics Map at bottom */}
                          <div className="w-full mb-4">
                            <div className="w-full bg-white shadow-md rounded-lg p-6 min-h-128">
                              <GeoAnalyticsMap 
                                analytics={analytics} 
                                selectedCountry={selectedCountry} 
                                setSelectedCountry={setSelectedCountry}
                                className="h-96 w-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-screen">
                        <div className="flex-1 flex items-center justify-center bg-gray-50">
                          <div className="text-center p-8 bg-blue-100 rounded-xl shadow-lg">
                            <h1 className="text-4xl font-bold text-blue-800 mb-4">
                              Please Add atleast one website <br/> or verify your current website to get analytics
                            </h1>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
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
                {analytics && Object.keys(analytics).length > 0 ? (
                  <TrafficAnalytics 
                    analytics={analytics}
                    setanalytics={setanalytics}
                    trafficSources={trafficSources} 
                    setTrafficSources={setTrafficSources}
                  />
                ) : (
                  <div className="flex h-screen">
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                      <div className="text-center p-8 bg-blue-100 rounded-xl shadow-lg">
                        <h1 className="text-4xl font-bold text-blue-800 mb-4">
                          Please Add atleast one website <br/> or verify your current website to get analytics
                        </h1>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {activeSection === 'Geo Insights' && (
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
                {analytics && Object.keys(analytics).length > 0 ? (
                  <GeoAnalyticss analytics={analytics} selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} />
                ) : (
                  <div className="flex h-screen">
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                      <div className="text-center p-8 bg-blue-100 rounded-xl shadow-lg">
                        <h1 className="text-4xl font-bold text-blue-800 mb-4">
                          Please Add atleast one website <br/> or verify your current website to get analytics
                        </h1>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {activeSection === 'Retention' && (
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
                {analytics && Object.keys(analytics).length > 0 ? (
                  <RetentionAnalytics analytics={analytics} setanalytics={setanalytics}/>
                ) : (
                  <div className="flex h-screen">
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                      <div className="text-center p-8 bg-blue-100 rounded-xl shadow-lg">
                        <h1 className="text-4xl font-bold text-blue-800 mb-4">
                          Please Add atleast one website <br/> or verify your current website to get analytics
                        </h1>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* For all other sections, display placeholder content */}
            {!['Dashboard', 'Traffic analytics', 'Geo Insights', 'Retention'].includes(activeSection) && (
              <div className="w-full bg-white p-4 md:p-6 rounded-xl md:rounded-2xl">
                <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-4">{activeSection} Content</h2>
                <p className="text-sm md:text-base">This is the content for the {activeSection} section. It spans the full width without the right panel.</p>
                <div className="h-32 md:h-64 bg-gray-100 rounded-lg mt-4"></div>
              </div>
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

export default OffchainAnalytics;
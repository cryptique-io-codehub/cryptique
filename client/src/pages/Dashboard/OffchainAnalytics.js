import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip } from "recharts";
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import AnalyticsChart from '../Offchainpart/AnalyticsChart';
import TrafficSourcesComponent from '../Offchainpart/TrafficSourcesComponent';
import Filters from '../Offchainpart/Filters';
import GeoAnalyticsMap from '../Offchainpart/GeoAnalyticsMap';
import TrafficAnalytics from '../Offchainpart/Trafficanalytics/TrafficAnalytics';
import GeoAnalyticss from '../Offchainpart/Trafficanalytics/GeoAnalyticss';
import RetentionAnalytics from '../Offchainpart/Trafficanalytics/RetentionAnalytics';
import FunnelDashboard from '../Offchainpart/FunnelDashboard';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../axiosInstance';


const OffchainAnalytics = () => {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [selectedWebsite, setSelectedWebsite] = useState();
  const [selectedDate, setSelectedDate] = useState('Select Date');
  const [selectedFilters, setSelectedFilters] = useState('Select Filters');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [secondNavOpen, setSecondNavOpen] = useState(false);
  const [websitearray,setWebsitearray]=useState([]);
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
          const new_response = await axiosInstance.get(`/sdk/analytics/${idt}`);
          if (new_response.data && new_response.data.analytics) {
            setanalytics(new_response.data.analytics);
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
          setError('Failed to load analytics data');
        } finally {
          setverifyload(false);
        }
      }
    }
    handleSelectWebsite();
  },[idy]);


console.log(idy);
  const totalPageViews = Object.values(analytics?.pageViews || {}).reduce((sum, views) => sum + views, 0);
  const pageViews_size = Object.keys(analytics?.pageViews ?? {}).length;
  const pagepervisit=(totalPageViews/pageViews_size).toFixed(2);
  const calculateAverageDuration = (sessions) => {
     if (!Array.isArray(sessions) || sessions.length === 0) return 0;
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
    return totalDuration / sessions.length;
  };

  const calculateBounceRate = (sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return 0;
  
    const bounceCount = sessions.reduce((count, session) => {
      return session.isBounce === true ? count + 1 : count;
    }, 0);
  
    return bounceCount / sessions.length;
  };

const bounceRate = (calculateBounceRate(analytics?.sessions)*100).toFixed(2);
const rawAvgDuration = calculateAverageDuration(analytics?.sessions);
const avgVisitDuration = formatDuration(rawAvgDuration);

function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(0)} sec`;
  } else if (seconds < 3600) {
    return `${(seconds / 60).toFixed(1)} min`;
  } else if (seconds < 86400) {
    return `${(seconds / 3600).toFixed(1)} hr`;
  } else if (seconds < 31536000) {
    return `${(seconds / 86400).toFixed(1)} days`;
  } else {
    return `${(seconds / 31536000).toFixed(1)} years`;
  }
}
  
 
  
  console.log(pageViews_size);
  console.log(totalPageViews);
  // const [analyticsData, setAnalyticsData] = useState({
  //   uniqueVisitors:analytics.uniqueVisitors,
  //   totalPageView:totalPageViews,
  //   pagePerVisit:totalPageViews/pageViews_size,
  //   bounceRate:0,
  //   avgVisitDuration:0,
  //   TotalWalletsConnected:analytics.walletsConnected, 
  //   Web3Users:analytics.web3Visitors,
  //   TotalOnChainValue:0
  // });

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
    { name: "New", value: analytics?.newVisitors, color: "#3B82F6" }, // Blue
    { name: "Returning", value: analytics?.returningVisitors, color: "#F59E0B" }, // Orange
  ];
  
  // Updated AnalyticsCard to be responsive
  const AnalyticsCard = ({ label, data, bgColor, textColor }) => (
    <div className={`rounded-xl p-2 md:p-3 ${bgColor} ${textColor} flex flex-col justify-between h-full`}>
      <div className="text-[9px] sm:text-xs opacity-80 mb-0.5">{label}</div>
      <div className="flex items-center justify-between">
        <div className="text-[10px] sm:text-sm font-bold">{data}</div>
        {/* <div className="pl-1 opacity-70 text-[9px] sm:text-xs">↑ {data.increase}</div> */}
      </div>
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

        // Fetch chart data from API
        const chartResponse = await axiosInstance.get(`/analytics/chart`, {
          params: {
            siteId: idy,
            timeframe: 'hourly',
            start: startDate,
            end: endDate
          }
        }).catch(error => {
          console.error('Chart API Error:', error.response?.data || error.message);
          throw new Error(error.response?.data?.message || 'Failed to fetch chart data');
        });

        if (!chartResponse?.data) {
          throw new Error('No data received from chart API');
        }

        if (chartResponse.data.error) {
          throw new Error(chartResponse.data.error);
        }

        console.log('Chart API Response:', chartResponse.data);

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

        // Fetch traffic sources data
        console.log('Fetching traffic sources with params:', {
          siteId: idy,
          start: startDate,
          end: endDate
        });

        const trafficResponse = await axiosInstance.get(`/analytics/traffic-sources`, {
          params: {
            siteId: idy,
            start: startDate,
            end: endDate
          }
        }).catch(error => {
          console.error('Traffic Sources API Error:', error.response?.data || error.message);
          throw new Error(error.response?.data?.message || 'Failed to fetch traffic sources data');
        });

        if (!trafficResponse?.data) {
          throw new Error('No data received from traffic sources API');
        }

        if (trafficResponse.data.error) {
          throw new Error(trafficResponse.data.error);
        }

        console.log('Traffic Sources API Response:', trafficResponse.data);

        setTrafficSources(trafficResponse.data.sources || []);

        // Update Web3 data
        const web3Data = {
          visitorsPercentage: `${((analytics?.web3Visitors / analytics?.uniqueVisitors) * 100).toFixed(2)}%`,
          visitorsIncrease: `${((analytics?.web3Visitors / analytics?.uniqueVisitors) * 100).toFixed(1)}% Increase`,
          walletsConnected: analytics?.walletsConnected || 0,
          walletsIncrease: `${((analytics?.walletsConnected / analytics?.uniqueVisitors) * 100).toFixed(1)}% Increase`
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
  }, [idy, selectedDate, selectedFilters, activeSection]);

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

  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Toggle second navigation on mobile
  const toggleSecondNav = () => {
    setSecondNavOpen(!secondNavOpen);
  };
    
// setDatas(datas);
console.log(analytics);
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
                  <div className="flex flex-col">
                    <div className="bg-[#CAA968] p-4 md:p-6 rounded-xl md:rounded-2xl m-2 md:m-4">
                      <div className="max-w-7xl mx-auto">
                        <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-white">Welcome back, {userData.name}!</h1>
                        <p className="text-xs md:text-sm text-white opacity-80">Get an overall overview of how things are now with our real time analytics</p>
                      </div>
                    </div>
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
                       <span className="text-sm text-gray-600">Loading analytics data...</span>
                     </div>
                   </div>
                  ):
                  (<>
                    {/* MODIFICATION: Analytics cards in full width single row */}
                   {websitearray.length>0 && analytics && Object.keys(analytics).length > 0 ?  <div>
                    <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 h-auto pl-2">
                      
                      <AnalyticsCard 
                        label="Unique visitors" 
                        data={analytics?.uniqueVisitors} 
                        bgColor="bg-[#CAA968]" 
                        textColor="text-black" 
                      />
                      <AnalyticsCard 
                        label="Total Wallets Connected " 
                        data= {analytics?.walletsConnected}
                        bgColor="bg-[#1D0C46]" 
                        textColor="text-white" 
                      />
                       <AnalyticsCard 
                        label="Pages per visit" 
                        data= {pagepervisit} 
                        bgColor="bg-white" 
                        textColor="black" 
                      />
                      <AnalyticsCard 
                        label="Total Page Views" 
                        data= {totalPageViews}
                        bgColor="bg-white" 
                        textColor="black" 
                      />
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
                        data={bounceRate} 
                        bgColor="bg-white" 
                        textColor="text-black" 
                      />
                    </div>
                    
                    {/* Dynamic Analytics chart */}
                    <div className="w-full">
                    <AnalyticsChart 
                      analytics={analytics}
                      setAnalytics={setanalytics}
                      isLoading={isLoading}
                       error={error}
                    />
                    </div>
                    
                    <FunnelDashboard analytics={analytics}/>
                    
                    {/* MODIFICATION: Remaining content in two-column layout */}
                    <div className="flex flex-col lg:flex-row lg:space-x-4 space-y-4 lg:space-y-0">
                      {/* Left side */}
                      <div className="w-full lg:w-3/5">
                        {/* Geo Analytics Map */}
                        <GeoAnalyticsMap analytics={analytics} selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry}/>
                      </div>
                      
                      {/* Right side */}
                      <div className="w-full lg:w-2/5">
                        {/* Traffic Sources Component */}
                        <TrafficSourcesComponent 
                          setanalytics={setanalytics}
                          analytics={analytics}
                          trafficSources={trafficSources} 
                          setTrafficSources={setTrafficSources}
                           
                        />
                        
                        {/* User Type Donut Chart */}
                        <div className="w-full bg-white shadow-md rounded-lg p-4 md:p-6 mt-4">
                          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-4">User Type</h3>
                          <div className="h-48 md:h-64">
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
                                    <th className="p-1 md:p-2 text-gray-600 text-xs md:text-sm">Type</th>
                                    <th className="p-1 md:p-2 text-gray-600 text-xs md:text-sm">Visitors</th>
                                    <th className="p-1 md:p-2 text-gray-600 text-xs md:text-sm">%</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.map((item, index) => (
                                    <tr key={index} className="border-b">
                                      <td className="p-1 md:p-2 flex items-center text-xs md:text-sm">
                                        <span className="w-2 h-2 md:w-3 md:h-3 rounded-full mr-1 md:mr-2" style={{ backgroundColor: item.color }}></span>
                                        {item.name}
                                      </td>
                                      <td className="p-1 md:p-2 text-xs md:text-sm">{item.value}</td>
                                      <td className="p-1 md:p-2 text-green-500 text-xs md:text-sm">{(item.value/(analytics?.newVisitors + analytics?.returningVisitors)*100).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                  :(
                    
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
                  </div>
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
                      {analytics && Object.keys(analytics).length > 0 ? 
                      <TrafficAnalytics 
                      analytics={analytics}
                      setanalytics={setanalytics}
                      trafficSources={trafficSources} 
                      setTrafficSources={setTrafficSources}  
                    />:(
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
                     {analytics && Object.keys(analytics).length > 0 ?
                    <GeoAnalyticss analytics={analytics} selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} />
                    
                    :(
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
                    {analytics && Object.keys(analytics).length > 0 ?
                    <RetentionAnalytics analytics={analytics} setanalytics={setanalytics}/>
                    :(
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

export default OffchainAnalytics;
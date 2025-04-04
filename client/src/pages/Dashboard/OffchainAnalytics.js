import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip } from "recharts";
import Sidebar from '../../components/Sidebar';
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

  // State for analytics cards
  // console.log(analytics);
  useEffect(()=>{
  const handleSelectWebsite=async()=>{
   console.log(idy);
    const idt=localStorage.getItem("idy");
    if(idt){
    const new_response = await axiosInstance.get(`/sdk/analytics/${idt}`);
    setanalytics(new_response.data.analytics);
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
  const avgVisitDuration = calculateAverageDuration(analytics?.sessions).toFixed(2);
  
 
  
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
        // This would be your actual API calls
        // const chartResponse = await fetch(`/api/analytics/chart?website=${selectedWebsite}&date=${selectedDate}&filters=${selectedFilters}`);
        // const chartData = await chartResponse.json();
        
        // Using mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Helper function for random values
        const getRandomValue = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        
        // Mock chart data
        const mockChartData = {
          timeLabels: ['11:30', '12:30', '1:30', '2:30', '3:30', '4:30', '5:30', '6:30', '7:30','8:30','9:30','10:30','11:30'],
          datasets: {
            visitors: [12, 15, 28, 38, 29, 42, 45, 56, 65],
            wallets: [9, 12, 15, 18, 12, 24, 28, 33, 41]
          },
          dataPoints: [
            { time: 'Jul 07, 11:30', visitors: 124, wallets: 9 },
            { time: 'Jul 07, 12:30', visitors: 15, wallets: 12 },
            { time: 'Jul 07, 1:30', visitors: 28, wallets: 15 },
            { time: 'Jul 07, 2:30', visitors: 38, wallets: 18 },
            { time: 'Jul 07, 3:30', visitors: 29, wallets: 12 },
            { time: 'Jul 07, 4:30', visitors: 42, wallets: 24 },
            { time: 'Jul 07, 5:30', visitors: 45, wallets: 28 },
            { time: 'Jul 07, 6:30', visitors: 56, wallets: 63 },
            { time: 'Jul 07, 7:30', visitors: 65, wallets: 41 },
            { time: 'Jul 07, 8:30', visitors: 70, wallets: 9 },
            { time: 'Jul 07, 9:30', visitors: 52, wallets: 9 },
            { time: 'Jul 07, 10:30', visitors: 81, wallets: 9 },
          ]
        };
        
        // Generate random Web3 data based on selected filters
        const visitorsPercent = (40 + getRandomValue(0, 20)).toFixed(2);
        const visitorsIncreasePercent = (5 + getRandomValue(0, 10)).toFixed(1);
        const walletsCount = getRandomValue(400, 700);
        const walletsIncreasePercent = (4 + getRandomValue(0, 8)).toFixed(1);
        
        const mockWeb3Data = {
          visitorsPercentage: `${visitorsPercent}%`,
          visitorsIncrease: `${visitorsIncreasePercent}% Increase`,
          walletsConnected: walletsCount,
          walletsIncrease: `${walletsIncreasePercent}% Increase`
        };
        
        
        // Generate traffic sources data
        const mockTrafficSources = [
          { source: 'Twitter', icon: 'twitter', visitors: 0, wallets: 0,wallets_section:0},
          { source: 'Linkedin', icon: 'linkedin', visitors: 0, wallets: 0,wallets_section:0 },
          { source: 'Instagram', icon: 'instagram', visitors:0, wallets: 0,wallets_section:0 },
          { source: 'Dribbble', icon: 'dribbble', visitors: 0, wallets: 0,wallets_section:0 },
          { source: 'Behance', icon: 'behance', visitors: 0, wallets: 0,wallets_section:0 },
          { source: 'Pinterest', icon: 'pinterest', visitors: 0, wallets: 0,wallets_section:0 }
        ];
        
        setChartData(mockChartData);
        setWeb3Data(mockWeb3Data);
        // setAnalyticsData(mockAnalyticsData);
        setTrafficSources(mockTrafficSources);
        // Set the first data point as selected by default
        setSelectedDataPoint(mockChartData.dataPoints[0]);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, selectedFilters, activeSection]);

  // Handler for clicking on a data point - updated to also set traffic sources data
  const handleDataPointClick = (dataPoint, index) => {
    setSelectedDataPoint(dataPoint);
    
    // Update Web3 data based on the selected data point
    const visitorsPercent = (40 + (dataPoint.visitors / 10)).toFixed(2);
    const visitorsIncreasePercent = ((dataPoint.visitors / 100) * 3).toFixed(1);
    const walletsIncreasePercent = ((dataPoint.wallets / 100) * 5).toFixed(1);
    
    setWeb3Data({
      visitorsPercentage: `${visitorsPercent}%`,
      visitorsIncrease: `${visitorsIncreasePercent}% Increase`,
      walletsConnected: dataPoint.wallets * 10,
      walletsIncrease: `${walletsIncreasePercent}% Increase`
    });
    
   
    
    // Update traffic sources based on the data point
    const updatedSources = trafficSources.map(source => {
      // Create variation factors based on source
      let visitorFactor = 0;
      let walletFactor = 0;
      let wallets_sectionFactor=0;
      
      switch(source.source) {
        case 'Twitter':
          visitorFactor = 0.24;
          walletFactor = 0.09;
          wallets_sectionFactor=0.04;
          break;
        case 'Linkedin':
          visitorFactor = 0.05;
          walletFactor = 0.14;
          wallets_sectionFactor=0.23;
          break;
        case 'Instagram':
          visitorFactor = 0.07;
          walletFactor = 0.21;
          wallets_sectionFactor=0.31;
          break;
        case 'Dribbble':
          visitorFactor = 0.05;
          walletFactor = 0.16;
          wallets_sectionFactor=0.14;
          break;
        case 'Behance':
          visitorFactor = 0.03;
          walletFactor = 0.22;
          wallets_sectionFactor=0.34;
          break;
        case 'Pinterest':
          visitorFactor = 0.01;
          walletFactor = 0.06;
          wallets_sectionFactor=0.09;
          break;
        default:
          visitorFactor = 0.02;
          walletFactor = 0.05;
          wallets_sectionFactor=0.06;
      }
      
      // Calculate visitors and wallets based on the data point and factor
      const visitors = Math.round(dataPoint.visitors * visitorFactor * 1000);
      const wallets = Math.round(dataPoint.wallets * walletFactor * 1000);
      
      return {
        ...source,
        visitors,
        wallets
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
// console.log(datas);
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
                        label="Avg. visit duration (in sec)" 
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
                        chartData={chartData}
                        selectedDataPoint={selectedDataPoint}
                        setSelectedDataPoint={handleDataPointClick}
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
                    <RetentionAnalytics/>
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
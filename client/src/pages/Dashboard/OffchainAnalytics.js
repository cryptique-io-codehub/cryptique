import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import AnalyticsChart from '../Offchainpart/AnalyticsChart';
import TrafficSourcesComponent from '../Offchainpart/TrafficSourcesComponent';
import Filters from '../Offchainpart/Filters';
import GeoAnalyticsMap from '../Offchainpart/GeoAnalyticsMap';
import TrafficAnalytics from '../Offchainpart/Trafficanalytics/TrafficAnalytics ';
import GeoAnalyticss from '../Offchainpart/Trafficanalytics/GeoAnalyticss';
import RetentionAnalytics from '../Offchainpart/Trafficanalytics/RetentionAnalytics';

const OffchainAnalytics = () => {
  const [activeSection, setActiveSection] = useState('Off-chain Overview');
  const [selectedWebsite, setSelectedWebsite] = useState('Dropdown');
  const [selectedDate, setSelectedDate] = useState('Select Date');
  const [selectedFilters, setSelectedFilters] = useState('Select Filters');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [secondNavOpen, setSecondNavOpen] = useState(false);
  
  // State for chart data
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);

  // State for analytics cards
  const [analyticsData, setAnalyticsData] = useState({
    uniqueVisitors: { value: "0K", increase: "0.0%" },
    totalPageView: { value: "0", increase: "0.0%" },
    pagePerVisit: { value: "0", increase: "0.0%" },
    bounceRate: { value: "0%", increase: "0.0%" },
    avgVisitDuration: { value: "0m", increase: "0.0%" }
  });

  // State for Web3 analytics data
  const [web3Data, setWeb3Data] = useState({
    visitorsPercentage: "0.00%",
    visitorsIncrease: "0.0% Increase",
    walletsConnected: 0,
    walletsIncrease: "0.0% Increase"
  });
  
  // State for traffic sources
  const [trafficSources, setTrafficSources] = useState([
    { source: 'Twitter', icon: 'twitter', visitors: 0, wallets: 0 },
    { source: 'Linkedin', icon: 'linkedin', visitors: 0, wallets: 0 },
    { source: 'Instagram', icon: 'instagram', visitors: 0, wallets: 0 },
    { source: 'Dribbble', icon: 'dribbble', visitors: 0, wallets: 0 },
    { source: 'Behance', icon: 'behance', visitors: 0, wallets: 0 },
    { source: 'Pinterest', icon: 'pinterest', visitors: 0, wallets: 0 }
  ]);
  
  // State for user information
  const [userData, setUserData] = useState({
    name: "User"
  });

  const navItems = [
    { section: 'Off-chain analytics', type: 'header' },
    { label: 'Off-chain Overview', category: 'Off-chain analytics' },
    { label: 'Traffic analytics', category: 'Off-chain analytics' },
    { label: 'Geo analytics', category: 'Off-chain analytics' },
    { section: 'BEHAVIOR', type: 'header' },
    { label: 'Acquisition', category: 'BEHAVIOR' },
    { label: 'Conversions', category: 'BEHAVIOR' },
    { label: 'Retention', category: 'BEHAVIOR' },
    { section: 'OTHER', type: 'header' },
    { label: 'Other Overview', category: 'OTHER' },
    { label: 'Holdings', category: 'OTHER' },
    { label: 'dApps', category: 'OTHER' },
  ];

  const data = [
    { name: "New", value: 85, color: "#3B82F6" }, // Blue
    { name: "Returning", value: 15, color: "#F59E0B" }, // Orange
  ];
  
  // Updated AnalyticsCard to be responsive
  const AnalyticsCard = ({ label, data, bgColor, textColor }) => (
    <div className={`rounded-xl p-2 md:p-3 ${bgColor} ${textColor} flex flex-col justify-between h-full`}>
      <div className="text-[9px] sm:text-xs opacity-80 mb-0.5">{label}</div>
      <div className="flex items-center justify-between">
        <div className="text-[10px] sm:text-sm font-bold">{data.value}</div>
        <div className="pl-1 opacity-70 text-[9px] sm:text-xs">↑ {data.increase}</div>
      </div>
    </div>
  );

  // Fetch analytics data from server when filters change
  useEffect(() => {
    const fetchData = async () => {
      if (activeSection !== 'Off-chain Overview') return;
      
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
          timeLabels: ['11:30', '12:30', '1:30', '2:30', '3:30', '4:30', '5:30', '6:30', '7:30'],
          datasets: {
            visitors: [24, 35, 28, 38, 29, 42, 45, 56, 65],
            wallets: [9, 12, 15, 18, 12, 24, 28, 33, 41]
          },
          dataPoints: [
            { time: 'Jul 07, 11:30', visitors: 24, wallets: 9 },
            { time: 'Jul 07, 12:30', visitors: 35, wallets: 12 },
            { time: 'Jul 07, 1:30', visitors: 28, wallets: 15 },
            { time: 'Jul 07, 2:30', visitors: 38, wallets: 18 },
            { time: 'Jul 07, 3:30', visitors: 29, wallets: 12 },
            { time: 'Jul 07, 4:30', visitors: 42, wallets: 24 },
            { time: 'Jul 07, 5:30', visitors: 45, wallets: 28 },
            { time: 'Jul 07, 6:30', visitors: 56, wallets: 33 },
            { time: 'Jul 07, 7:30', visitors: 65, wallets: 41 }
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
        
        // Generate random analytics card data
        const mockAnalyticsData = {
          uniqueVisitors: { 
            value: `${getRandomValue(20, 28)},${getRandomValue(100, 999)}K`, 
            increase: `${getRandomValue(2, 8)}.${getRandomValue(0, 9)}%` 
          },
          totalPageView: { 
            value: `${getRandomValue(30, 42)},${getRandomValue(100, 999)}`, 
            increase: `${getRandomValue(3, 9)}.${getRandomValue(0, 9)}%` 
          },
          pagePerVisit: { 
            value: `${getRandomValue(3, 7)}.${getRandomValue(1, 9)}`, 
            increase: `${getRandomValue(1, 5)}.${getRandomValue(0, 9)}%` 
          },
          bounceRate: { 
            value: `${getRandomValue(20, 45)}%`, 
            increase: `${getRandomValue(1, 4)}.${getRandomValue(0, 9)}%` 
          },
          avgVisitDuration: { 
            value: `${getRandomValue(2, 8)}m ${getRandomValue(10, 59)}s`, 
            increase: `${getRandomValue(2, 7)}.${getRandomValue(0, 9)}%` 
          }
        };
        
        // Generate traffic sources data
        const mockTrafficSources = [
          { source: 'Twitter', icon: 'twitter', visitors: getRandomValue(600000, 700000), wallets: getRandomValue(3000, 4000) },
          { source: 'Linkedin', icon: 'linkedin', visitors: getRandomValue(10000, 15000), wallets: getRandomValue(500, 800) },
          { source: 'Instagram', icon: 'instagram', visitors: getRandomValue(15000, 20000), wallets: getRandomValue(5000, 6000) },
          { source: 'Dribbble', icon: 'dribbble', visitors: getRandomValue(12000, 15000), wallets: getRandomValue(60000, 70000) },
          { source: 'Behance', icon: 'behance', visitors: getRandomValue(8000, 10000), wallets: getRandomValue(600000, 700000) },
          { source: 'Pinterest', icon: 'pinterest', visitors: getRandomValue(3000, 4000), wallets: getRandomValue(10000, 17000) }
        ];
        
        setChartData(mockChartData);
        setWeb3Data(mockWeb3Data);
        setAnalyticsData(mockAnalyticsData);
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
  }, [selectedWebsite, selectedDate, selectedFilters, activeSection]);

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
    
    // Update analytics cards based on the data point
    setAnalyticsData({
      uniqueVisitors: { 
        value: `${dataPoint.visitors * 0.1}K`, 
        increase: `${(dataPoint.visitors / 100).toFixed(1)}%` 
      },
      totalPageView: { 
        value: `${dataPoint.visitors * 1.5}`, 
        increase: `${(dataPoint.visitors / 80).toFixed(1)}%` 
      },
      pagePerVisit: { 
        value: `${(dataPoint.visitors / 10).toFixed(1)}`, 
        increase: `${(dataPoint.visitors / 150).toFixed(1)}%` 
      },
      bounceRate: { 
        value: `${30 - (dataPoint.visitors / 10).toFixed(0)}%`, 
        increase: `${(dataPoint.visitors / 200).toFixed(1)}%` 
      },
      avgVisitDuration: { 
        value: `${Math.max(2, Math.round(dataPoint.visitors / 10))}m ${Math.round(dataPoint.visitors / 2)}s`, 
        increase: `${(dataPoint.visitors / 120).toFixed(1)}%` 
      }
    });
    
    // Update traffic sources based on the data point
    const updatedSources = trafficSources.map(source => {
      // Create variation factors based on source
      let visitorFactor = 0;
      let walletFactor = 0;
      
      switch(source.source) {
        case 'Twitter':
          visitorFactor = 0.24;
          walletFactor = 0.09;
          break;
        case 'Linkedin':
          visitorFactor = 0.05;
          walletFactor = 0.14;
          break;
        case 'Instagram':
          visitorFactor = 0.07;
          walletFactor = 0.21;
          break;
        case 'Dribbble':
          visitorFactor = 0.05;
          walletFactor = 0.16;
          break;
        case 'Behance':
          visitorFactor = 0.03;
          walletFactor = 0.22;
          break;
        case 'Pinterest':
          visitorFactor = 0.01;
          walletFactor = 0.06;
          break;
        default:
          visitorFactor = 0.02;
          walletFactor = 0.05;
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
            {/* Banner with dynamic user name */}
            <div className="bg-[#e4c86b] p-4 md:p-6 rounded-xl md:rounded-2xl m-2 md:m-4">
              <div className="max-w-7xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-white">Welcome back, {userData.name}!</h1>
                <p className="text-xs md:text-sm text-white opacity-80">Get an overall overview of how things are now with our real time analytics</p>
              </div>
            </div>

            {/* Filters */}
            <Filters 
              selectedDate={selectedDate} 
              setSelectedDate={setSelectedDate} 
              selectedWebsite={selectedWebsite} 
              setSelectedWebsite={setSelectedWebsite}
              selectedFilters={selectedFilters} 
              setSelectedFilters={setSelectedFilters}
            />

            {/* Main content */}
            <div className="px-2 md:px-4 pb-4">
              {/* Main content section */}
              <div className="flex flex-col lg:flex-row lg:space-x-4 space-y-4 lg:space-y-0">
                {/* Left side */}
                {activeSection === 'Off-chain Overview' ? (
                  <>
                    {/* Left side content for Off-chain Overview */}
                    <div className="w-full lg:w-3/5 flex flex-col space-y-4">
                      {/* Analytics cards in a single row */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 h-auto">
                        <AnalyticsCard 
                          label="Unique visitors" 
                          data={analyticsData.uniqueVisitors} 
                          bgColor="bg-[#e4c86b]" 
                          textColor="text-black" 
                        />
                        <AnalyticsCard 
                          label="Total page view" 
                          data={analyticsData.totalPageView} 
                          bgColor="bg-purple-900" 
                          textColor="text-white" 
                        />
                        <AnalyticsCard 
                          label="Page per visit" 
                          data={analyticsData.pagePerVisit} 
                          bgColor="bg-white" 
                          textColor="text-black" 
                        />
                        <AnalyticsCard 
                          label="Bounce rate" 
                          data={analyticsData.bounceRate} 
                          bgColor="bg-white" 
                          textColor="text-black" 
                        />
                        <AnalyticsCard 
                          label="Avg. visit duration" 
                          data={analyticsData.avgVisitDuration} 
                          bgColor="bg-white" 
                          textColor="text-black" 
                        />
                      </div>
                      
                      {/* Dynamic Analytics chart */}
                      <AnalyticsChart 
                        chartData={chartData}
                        selectedDataPoint={selectedDataPoint}
                        setSelectedDataPoint={handleDataPointClick}
                        isLoading={isLoading}
                        error={error}
                      />
                      
                      {/* Geo Analytics Map */}
                      <GeoAnalyticsMap/>
                    </div>
                    
                    {/* Right side - Web3 visitors and wallets card */}
                    <div className="w-full lg:w-2/5 bg-white p-4 md:p-6 rounded-xl md:rounded-2xl">
                      <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">Web3 visitors and wallets</h2>
                      
                      <div className="flex flex-col sm:flex-row justify-between mb-4 md:mb-6 space-y-4 sm:space-y-0">
                        <div>
                          <div className="text-2xl md:text-3xl font-bold">{web3Data.visitorsPercentage}</div>
                          <div className="flex items-center text-green-500 text-xs">
                            <span className="mr-1">↑</span> {web3Data.visitorsIncrease}
                          </div>
                          <div className="text-sm md:text-base font-bold mt-1">Web3 visitors</div>
                        </div>
                        
                        <div className="sm:text-right">
                          <div className="text-2xl md:text-3xl font-bold">{web3Data.walletsConnected}</div>
                          <div className="flex items-center sm:justify-end text-green-500 text-xs">
                            <span className="mr-1">↑</span> {web3Data.walletsIncrease}
                          </div>
                          <div className="text-sm md:text-base font-bold mt-1">Wallets connected</div>
                        </div>
                      </div>
                      
                      {/* Simplified funnel visualization */}
                      <div className="w-full h-24 md:h-32 relative mt-4">
                        <div className="flex h-20 md:h-24 w-full items-center">
                          <div className="h-20 md:h-24 w-1/3 bg-indigo-900 rounded-l-lg"></div>
                          <div className="h-16 md:h-20 w-1/4 bg-purple-500" style={{ clipPath: 'polygon(0 0, 100% 10%, 100% 90%, 0 100%)' }}></div>
                          <div className="h-12 md:h-16 w-1/5 bg-orange-300" style={{ clipPath: 'polygon(0 10%, 100% 25%, 100% 75%, 0 90%)' }}></div>
                          <div className="h-8 md:h-12 w-1/5 bg-yellow-200" style={{ clipPath: 'polygon(0 25%, 100% 45%, 100% 55%, 0 75%)' }}></div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full flex text-xs">
                          <div className="w-1/3 text-center">Visitors</div>
                          <div className="w-1/4 text-center">Web3 Users</div>
                          <div className="w-1/5 text-center">Wallets</div>
                          <div className="w-1/5 text-center">Transactions</div>
                        </div>
                      </div>
                      
                      {/* Traffic Sources Component - pass state as props */}
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
                                  <th className="p-1 md:p-2 text-gray-600 text-xs md:text-sm">Wallet</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.map((item, index) => (
                                  <tr key={index} className="border-b">
                                    <td className="p-1 md:p-2 flex items-center text-xs md:text-sm">
                                      <span className="w-2 h-2 md:w-3 md:h-3 rounded-full mr-1 md:mr-2" style={{ backgroundColor: item.color }}></span>
                                      {item.name}
                                    </td>
                                    <td className="p-1 md:p-2 text-xs md:text-sm">547,914</td>
                                    <td className="p-1 md:p-2 text-green-500 text-xs md:text-sm">81.94%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : activeSection === 'Traffic analytics' ? (
                  // Render the Traffic Analytics component when Traffic analytics is selected
                  <TrafficAnalytics />
                ) : 
                activeSection === 'Geo analytics' ? (
                  // Render the GeoAnalytics component when Geo analytics is selected
                  <GeoAnalyticss />
                ) :
                activeSection === 'Retention' ? (
                  // Render the GeoAnalytics component when Geo analytics is selected
                  <RetentionAnalytics/>
                ) 
                :
                (
                  // For all other sections, display placeholder content
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
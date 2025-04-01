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

const AddWebsitePopup = ({ isOpen, onClose, onSuccess }) => {
  const [domain, setDomain] = useState('');
  const [name, setName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [scriptCode, setScriptCode] = useState('');
  const [showScript, setShowScript] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate domain
    if (!domain) {
      setError('Domain is required');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setShowScript(false);
    
    try {
      // Send POST request to the website/create endpoint
      const response = await fetch('http://localhost:3002/api/website/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Domain: domain,
          Name: name || domain, // Use domain as name if no name provided
          teamName: selectedTeam // Include team name in request body
        }),
      });
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error('Failed to add website');
      }
      
      // Check if there is an ID in the response
      const siteId = responseData.website.siteId;
      console.log(siteId);
      
      if (siteId) {
        // Create the script code with the siteId
        const scriptHTML = `<script>
  var script = document.createElement('script');
  script.src = 'https://cryptique-cdn.vercel.app/scripts/analytics/1.0.1/cryptique.script.min.js';
  script.setAttribute('site-id', '${siteId}');
  document.head.appendChild(script);
</script>`;
        
        setScriptCode(scriptHTML);
        setShowScript(true);
      }
      
      // Success
      onSuccess && onSuccess();
      // Note: We're not closing the popup immediately so the user can see and copy the script
    } catch (error) {
      console.error('Error adding website:', error);
      setError(error.message || 'Failed to add website');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = () => {
    // You can add verification logic here if needed
    // For example, checking if the script is installed on the website
    
    // For now, just close the popup
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4">
        <div className="flex items-center mb-6">
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold ml-2">Add a new website</h2>
        </div>
        
        {showScript ? (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Installation Script</h3>
            <p className="text-sm text-gray-600 mb-3">
              Add this script to your website to start tracking:
            </p>
            <div className="bg-gray-100 p-3 rounded-md">
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap">{scriptCode}</pre>
            </div>
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => {navigator.clipboard.writeText(scriptCode)}}
                className="py-2 px-4 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Copy to clipboard
              </button>
              <button
                onClick={handleVerify}
                className="py-2 px-4 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                Verify
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                Domain<span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500">https://</span>
                </div>
                <input
                  type="text"
                  id="domain"
                  placeholder="example.com"
                  className="pl-16 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Just the domain or subdomain without 'https://' and/or 'www' (e.g. 'example.com' or 'subdomain.example.com')
              </p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name (optional)
              </label>
              <input
                type="text"
                id="name"
                placeholder="Please enter a name for your website"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                This is the name that will be displayed in the dashboard
              </p>
            </div>
            
            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <p className="text-sm text-gray-600 mb-4">
              By adding a website, you agree to our privacy policy
            </p>
            
            <button
              type="submit"
              className="w-full py-2 px-4 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 flex items-center justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add website'} 
              {!isSubmitting && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
// Main AddWebsiteForm Component - Unchanged for GET requests
const AddWebsiteForm = ({ hasAddedWebsite, setHasAddedWebsite }) => {
  const [websites, setWebsites] = useState([]);
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddWebsitePopupOpen, setIsAddWebsitePopupOpen] = useState(false);

  // Fetch websites on component mount - Keeping original endpoint
  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/websites', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch websites');
        }
        
        const data = await response.json();
        setWebsites(data.websites || []);
        
        // Set first website as selected if available and no selection exists
        if (data.websites && data.websites.length > 0 && !selectedWebsite) {
          setSelectedWebsite(data.websites[0].domain);
        }
      } catch (error) {
        console.error('Error fetching websites:', error);
      }
    };
    
    fetchWebsites();
  }, [selectedWebsite]);

  // Handle website selection
  const handleSelectWebsite = (domain) => {
    setSelectedWebsite(domain);
    setIsDropdownOpen(false);
    // You might want to trigger other actions here, like changing context
  };

  // Handle add website option click
  const handleAddWebsite = () => {
    setIsAddWebsitePopupOpen(true);
    setIsDropdownOpen(false);
  };

  // Handle successful website addition - Keeping original GET endpoint
  const handleWebsiteAdded = async () => {
    // Refresh the websites list
    try {
      const response = await fetch('http://localhost:3002/api/websites', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch websites');
      }
      
      const data = await response.json();
      setWebsites(data.websites || []);
      
      // Set newly added website as selected if available
      if (data.websites && data.websites.length > 0) {
        setSelectedWebsite(data.websites[0].domain);
      }
      
      // Update parent component state if needed
      if (setHasAddedWebsite) {
        setHasAddedWebsite(true);
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
    }
  };

  return (
    <div className="relative">
      <div className="select-website mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select website
        </label>
        
        <div className="relative">
          <button
            type="button"
            className="flex items-center justify-between w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {selectedWebsite ? (
              <div className="flex items-center">
                <span className="inline-block w-6 h-6 mr-2 bg-red-600 rounded-sm text-white flex-shrink-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <span className="text-gray-800">{selectedWebsite}</span>
              </div>
            ) : (
              <span className="text-gray-500">Select a website</span>
            )}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200">
              <ul className="py-1 max-h-60 overflow-auto">
                {websites.length > 0 ? (
                  websites.map((website) => (
                    <li key={website.id || website.domain}>
                      <button
                        type="button"
                        className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100"
                        onClick={() => handleSelectWebsite(website.domain)}
                      >
                        <span className="inline-block w-6 h-6 mr-2 bg-red-600 rounded-sm text-white flex-shrink-0 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span>{website.name || website.domain}</span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-2 text-gray-500">No websites found</li>
                )}
                
                {/* Add website option */}
                <li className="border-t border-gray-200">
                  <button
                    type="button"
                    className="flex items-center w-full px-4 py-2 text-left text-blue-600 hover:bg-gray-100"
                    onClick={handleAddWebsite}
                  >
                    <span className="inline-block w-6 h-6 mr-2 bg-blue-600 rounded-full text-white flex-shrink-0 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span>Add website</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      
      {/* Add website popup */}
      <AddWebsitePopup 
        isOpen={isAddWebsitePopupOpen}
        onClose={() => setIsAddWebsitePopupOpen(false)}
        onSuccess={handleWebsiteAdded}
      />
    </div>
  );
};



const OffchainAnalytics = () => {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [selectedWebsite, setSelectedWebsite] = useState('Dropdown');
  const [selectedDate, setSelectedDate] = useState('Select Date');
  const [selectedFilters, setSelectedFilters] = useState('Select Filters');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [secondNavOpen, setSecondNavOpen] = useState(false);
  const [hasAddedWebsite, setHasAddedWebsite] = useState(false);
  const [addedWebsite, setAddedWebsite] = useState(null);
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
    avgVisitDuration: { value: "0m", increase: "0.0%" },
    TotalWalletsConnected:{value: "0m", increase: "0.0%" },
    Web3Users:{value: "0m", increase: "0.0%" },
    TotalOnChainValue:{value: "0m", increase: "0.0%" }

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

  const handleWebsiteAdded = (website) => {
    setAddedWebsite(website);
    setSelectedWebsite(website.name || website.domain);
    // setHasAddedWebsite(true);
  };

  // Fetch analytics data from server when filters change
  useEffect(() => {
    const fetchData = async () => {
      if (!hasAddedWebsite || activeSection !== 'Dashboard') return;
    
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
            { time: 'Jul 07, 12:30', visitors: 12, wallets: 12 },
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
          },
          TotalWalletsConnected: { 
            value: `${getRandomValue(2, 8)}m ${getRandomValue(10, 59)}s`, 
            increase: `${getRandomValue(2, 7)}.${getRandomValue(0, 9)}%` 
          },
          Web3Users: { 
            value: `${getRandomValue(2, 8)}m ${getRandomValue(10, 59)}s`, 
            increase: `${getRandomValue(2, 7)}.${getRandomValue(0, 9)}%` 
          },
          TotalOnChainValue: { 
            value: `${getRandomValue(2, 8)}m ${getRandomValue(10, 59)}s`, 
            increase: `${getRandomValue(2, 7)}.${getRandomValue(0, 9)}%` 
          }
        };
        
        // Generate traffic sources data
        const mockTrafficSources = [
          { source: 'Twitter', icon: 'twitter', visitors: getRandomValue(600000, 700000), wallets: getRandomValue(3000, 4000),wallets_section:getRandomValue(3000, 4000) },
          { source: 'Linkedin', icon: 'linkedin', visitors: getRandomValue(10000, 15000), wallets: getRandomValue(500, 800),wallets_section:getRandomValue(3000, 4000) },
          { source: 'Instagram', icon: 'instagram', visitors: getRandomValue(15000, 20000), wallets: getRandomValue(5000, 6000),wallets_section:getRandomValue(3000, 4000) },
          { source: 'Dribbble', icon: 'dribbble', visitors: getRandomValue(12000, 15000), wallets: getRandomValue(60000, 70000),wallets_section:getRandomValue(3000, 4000) },
          { source: 'Behance', icon: 'behance', visitors: getRandomValue(8000, 10000), wallets: getRandomValue(600000, 700000),wallets_section:getRandomValue(3000, 4000) },
          { source: 'Pinterest', icon: 'pinterest', visitors: getRandomValue(3000, 4000), wallets: getRandomValue(10000, 17000),wallets_section:getRandomValue(3000, 4000) }
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
  }, [hasAddedWebsite,selectedWebsite, selectedDate, selectedFilters, activeSection]);

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
      },
      TotalWalletsConnected: { 
        value: `${(dataPoint.visitors / 10).toFixed(1)}`, 
        increase: `${(dataPoint.visitors / 150).toFixed(1)}%`
      },
      Web3Users: { 
        value: `${(dataPoint.visitors / 10).toFixed(1)}`, 
        increase: `${(dataPoint.visitors / 150).toFixed(1)}%`
      },
      TotalOnChainValue: { 
        value: `${(dataPoint.visitors / 10).toFixed(1)}`, 
        increase: `${(dataPoint.visitors / 150).toFixed(1)}%` 
      }

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
          {!hasAddedWebsite ? (
            // Show AddWebsiteForm if no website has been added yet, regardless of which section is active
            <AddWebsiteForm hasAddedWebsite={hasAddedWebsite} setHasAddedWebsite={setHasAddedWebsite}/>
          ) : (
            <>
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
                      selectedDate={selectedDate} 
                      setSelectedDate={setSelectedDate} 
                      selectedWebsite={selectedWebsite} 
                      setSelectedWebsite={setSelectedWebsite}
                      selectedFilters={selectedFilters} 
                      setSelectedFilters={setSelectedFilters}
                    />
                    
                    {/* MODIFICATION: Analytics cards in full width single row */}
                    <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 h-auto pl-2">
                      <AnalyticsCard 
                        label="Unique visitors" 
                        data={analyticsData.uniqueVisitors} 
                        bgColor="bg-[#CAA968]" 
                        textColor="text-black" 
                      />
                      <AnalyticsCard 
                        label="Total Wallets Connected " 
                        data= {analyticsData.TotalWalletsConnected}
                        bgColor="bg-[#1D0C46]" 
                        textColor="text-white" 
                      />
                       <AnalyticsCard 
                        label="Pages per visit" 
                        data= {analyticsData.pagePerVisit} 
                        bgColor="bg-white" 
                        textColor="black" 
                      />
                      <AnalyticsCard 
                        label="Total Page Views" 
                        data= {analyticsData.totalPageView}
                        bgColor="bg-white" 
                        textColor="black" 
                      />
                       <AnalyticsCard 
                        label="Avg. visit duration" 
                        data={analyticsData.avgVisitDuration} 
                        bgColor="bg-white" 
                        textColor="text-black" 
                      />
                      <AnalyticsCard 
                        label="Web3 Users" 
                        data={analyticsData.Web3Users}
                        bgColor="bg-white" 
                        textColor="text-black" 
                      />
                      <AnalyticsCard 
                        label="Bounce rate" 
                        data={analyticsData.bounceRate} 
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
                    
                    <FunnelDashboard/>
                    
                    {/* MODIFICATION: Remaining content in two-column layout */}
                    <div className="flex flex-col lg:flex-row lg:space-x-4 space-y-4 lg:space-y-0">
                      {/* Left side */}
                      <div className="w-full lg:w-3/5">
                        {/* Geo Analytics Map */}
                        <GeoAnalyticsMap/>
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
                    </div>
                  </div>
                )}
                
                {activeSection === 'Traffic analytics' && (
                  <>
                    <Filters 
                      selectedDate={selectedDate} 
                      setSelectedDate={setSelectedDate} 
                      selectedWebsite={selectedWebsite} 
                      setSelectedWebsite={setSelectedWebsite}
                      selectedFilters={selectedFilters} 
                      setSelectedFilters={setSelectedFilters}
                    />
                    <TrafficAnalytics 
                      trafficSources={trafficSources} 
                      setTrafficSources={setTrafficSources}
                    />
                  </>
                )}
                
                {activeSection === 'Geo Insights' && (
                  <>
                    <Filters 
                      selectedDate={selectedDate} 
                      setSelectedDate={setSelectedDate} 
                      selectedWebsite={selectedWebsite} 
                      setSelectedWebsite={setSelectedWebsite}
                      selectedFilters={selectedFilters} 
                      setSelectedFilters={setSelectedFilters}
                    />
                    <GeoAnalyticss />
                  </>
                )}
                
                {activeSection === 'Retention' && (
                  <>
                    <Filters 
                      selectedDate={selectedDate} 
                      setSelectedDate={setSelectedDate} 
                      selectedWebsite={selectedWebsite} 
                      setSelectedWebsite={setSelectedWebsite}
                      selectedFilters={selectedFilters} 
                      setSelectedFilters={setSelectedFilters}
                    />
                    <RetentionAnalytics/>
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
            </>
          )}
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
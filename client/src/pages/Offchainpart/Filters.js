import React, { useState, useEffect } from 'react';
import axiosInstance from '../../axiosInstance';
import axios from 'axios';
import SmartContractFilter from './SmartContractFilters'
import SmartContractFilters from './SmartContractFilters';
import sdkApi from '../../utils/sdkApi';
import { useNavigate } from 'react-router-dom';

const Filters = ({ websitearray, setWebsitearray,contractarray,setcontractarray,analytics, setanalytics, selectedDate, setSelectedDate, selectedWebsite, setSelectedWebsite, selectedFilters, setSelectedFilters,idy,setidy,selectedPage, onMenuClick}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem("selectedTeam"));
  const [scriptmodel, setscriptmodel] = useState(false);
  const [scriptcode, setscriptcode] = useState('');
  const [verifyid, setverifyid] = useState('');
  const [falsemessage, setfalsemessage] = useState('');
  const[selectedContract,setSelectedContract]=useState('');
  const[verifyload,setverifyload]=useState(false);
  const[deleteload,setdeleteload]=useState(false);
  // fetch website
  // depend-selectedTeam
  useEffect(() => {
    const selectteam = localStorage.getItem("selectedTeam");
    setSelectedTeam(selectteam);
    
    console.log("Fetching websites, current selectedWebsite:", localStorage.getItem("selectedWebsite"));
  
    const fetchWebsites = async () => {
      setIsLoading(true);
      try {
        // Clean the team name to remove any quotes
        let teamName = selectteam;
        
        // If it starts with a quote and ends with a quote, try to parse it
        if (typeof teamName === 'string' && teamName.startsWith('"') && teamName.endsWith('"')) {
          try {
            teamName = JSON.parse(teamName);
          } catch (e) {
            console.error("Error parsing teamName with quotes:", e);
            // If parsing fails, we'll still use the string but remove quotes manually
            teamName = teamName.replace(/^"|"$/g, '');
          }
        }
        
        console.log("Using teamName for API call:", teamName);
        // Use the correct GET endpoint with team name in path parameter
        const response = await axiosInstance.get(`/website/team/${teamName}`);
        
        if (response.status === 200) {
          console.log("Fetched websites:", response.data.websites);
          if (response && response.data.websites.length > 0) {
            setWebsitearray(response.data.websites);
            
            // Auto-verify websites with analytics data
            try {
              await axiosInstance.post('/website/auto-verify-all');
              console.log('Auto-verify process completed');
              
              // Get the updated websites with verification status
              const updatedResponse = await axiosInstance.get(`/website/team/${teamName}`);
              if (updatedResponse.status === 200) {
                setWebsitearray(updatedResponse.data.websites);
              }
            } catch (verifyError) {
              console.error('Error in auto-verify process:', verifyError);
              // Continue with the websites we already have
            }
            
            const savedWebsiteDomain = localStorage.getItem("selectedWebsite");
            
            // If no website is selected or selection is empty
            if(!savedWebsiteDomain || savedWebsiteDomain === '') {
              const firstWebsite = response.data.websites[0];
              localStorage.setItem("idy", firstWebsite.siteId);
              localStorage.setItem("selectedWebsite", firstWebsite.Domain);
              setSelectedWebsite(firstWebsite);
              setidy(firstWebsite.siteId);
              
              // Generate script code for the first website
              const iD = firstWebsite.siteId;
              const scriptHTML = `<script>
              var script = document.createElement('script');
              script.src = 'https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js';  
              script.setAttribute('site-id', '${iD}');
              document.head.appendChild(script);
            </script>`;
              setscriptcode(scriptHTML);
            } else {
              // Find the selected website in the array
              const currentWebsite = response.data.websites.find(
                website => website.Domain === savedWebsiteDomain
              );
              
              if (currentWebsite) {
                console.log("Setting selected website:", currentWebsite);
                setSelectedWebsite(currentWebsite);
                setidy(currentWebsite.siteId);
                
                // Generate script code for current website
                const iD = currentWebsite.siteId;
                const scriptHTML = `<script>
                var script = document.createElement('script');
                script.src = 'https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js';  
                script.setAttribute('site-id', '${iD}');
                document.head.appendChild(script);
              </script>`;
                setscriptcode(scriptHTML);
              }
            }
            
            setIsDropdownOpen(false);
          }
        }
      } catch (error) {
        console.error("Error refreshing websites:", error);
        setfalsemessage("Error refreshing websites");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (selectteam) {
      fetchWebsites();
    }
    
    // Setup event listener to detect team changes
    const handleStorageChange = () => {
      const newTeamRaw = localStorage.getItem("selectedTeam");
      
      // Clean the new team value
      let newTeam = newTeamRaw;
      if (typeof newTeam === 'string' && newTeam.startsWith('"') && newTeam.endsWith('"')) {
        try {
          newTeam = JSON.parse(newTeam);
        } catch (e) {
          console.error("Error parsing newTeam with quotes:", e);
          // If parsing fails, we'll still use the string but remove quotes manually
          newTeam = newTeam.replace(/^"|"$/g, '');
        }
      }
      
      // Clean the selected team value for comparison
      let currentTeam = selectedTeam;
      if (typeof currentTeam === 'string' && currentTeam.startsWith('"') && currentTeam.endsWith('"')) {
        try {
          currentTeam = JSON.parse(currentTeam);
        } catch (e) {
          console.error("Error parsing currentTeam with quotes:", e);
          // If parsing fails, we'll still use the string but remove quotes manually
          currentTeam = currentTeam.replace(/^"|"$/g, '');
        }
      }
      
      if (newTeam && newTeam !== currentTeam) {
        console.log("Team changed from:", currentTeam, "to:", newTeam);
        setSelectedTeam(newTeamRaw); // Keep the raw value in state
        localStorage.removeItem("selectedWebsite");
        localStorage.removeItem("idy");
        if (newTeamRaw) {
          fetchWebsites();
        }
      }
    };
    
    // Check for team changes every second
    const intervalId = setInterval(handleStorageChange, 1000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [selectedTeam]);
  

  const handleSelectWebsite = async (website) => {
    console.log(website);
    localStorage.setItem("selectedWebsite", website.Domain);
    localStorage.setItem("idy", website.siteId);
    setSelectedWebsite(website);
    setidy(website.siteId);
    
    const iD = website.siteId;
    const scriptHTML = `<script>
    var script = document.createElement('script');
    script.src = 'https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js';  
    script.setAttribute('site-id', '${iD}');
    document.head.appendChild(script);
  </script>`;
    setscriptcode(scriptHTML);
    
    // Only show installation popup if website is not verified
    if (!website.isVerified) {
      setscriptmodel(true);
    }
    
    if (website.isVerified) {
      const new_response = await axiosInstance.get(`/sdk/analytics/${website.siteId}`);
      setanalytics(new_response.data.analytics);
    }
    
    setIsDropdownOpen(false);
  }

  // Generate GTM script code for Google Tag Manager
  const generateGTMCode = (siteId) => {
    return `// Custom HTML Tag in Google Tag Manager
<script>
  // Check if script is already loaded to prevent duplicate initialization
  if (!window.CryptiqueSDK) {
    window.CryptiqueSDK = { initialized: true, siteId: '${siteId}' };
    
    var script = document.createElement('script');
    script.src = 'https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js';  
    script.setAttribute('site-id', '${siteId}');
    document.head.appendChild(script);
  } else if (!window.CryptiqueSDK.siteId) {
    // If SDK exists but no siteId set, just set the siteId
    window.CryptiqueSDK.siteId = '${siteId}';
  }
</script>

<!-- Trigger Configuration -->
Trigger Type: Page View / Window Loaded
`;
  };

  // Generate GTM variable code for better management
  const generateGTMVariableCode = (siteId) => {
    return `// 1. Create a Constant Variable in GTM
Name: CryptiqueID
Type: Constant
Value: ${siteId}

// 2. Create a Custom HTML Tag
Name: Cryptique Analytics
HTML:
<script>
  // Check if script is already loaded to prevent duplicate initialization
  if (!window.CryptiqueSDK) {
    window.CryptiqueSDK = { initialized: true, siteId: '{{CryptiqueID}}' };
    
    var script = document.createElement('script');
    script.src = 'https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js';  
    script.setAttribute('site-id', '{{CryptiqueID}}');
    document.head.appendChild(script);
  } else if (!window.CryptiqueSDK.siteId) {
    // If SDK exists but no siteId set, just set the siteId
    window.CryptiqueSDK.siteId = '{{CryptiqueID}}';
  }
</script>

// 3. Set the tag to fire on "All Pages" trigger`;
  };

  const handleDropdownToggle = () => {
    const newDropdownState = !isDropdownOpen;
    setIsDropdownOpen(newDropdownState);
    
    // Refresh website data when opening the dropdown
    if (newDropdownState === true) {
      refreshWebsites();
    }
  };

  const handleClosescriptmodel = () => {
    setfalsemessage('');
    setscriptmodel(false);
    // localStorage.removeItem("showInstallationPopup");
  }

  // Function to refresh website data
  const refreshWebsites = async () => {
    console.log("Manually refreshing websites");
    try {
      // Clean the team name to remove any quotes
      let teamName = selectedTeam;
      
      // If it starts with a quote and ends with a quote, try to parse it
      if (typeof teamName === 'string' && teamName.startsWith('"') && teamName.endsWith('"')) {
        try {
          teamName = JSON.parse(teamName);
        } catch (e) {
          console.error("Error parsing teamName with quotes:", e);
          // If parsing fails, we'll still use the string but remove quotes manually
          teamName = teamName.replace(/^"|"$/g, '');
        }
      }
      
      console.log("Using teamName for API call:", teamName);
      const response = await axiosInstance.get(`/website/team/${teamName}`);
      
      if (response.status === 200 && response.data.websites) {
        console.log("Refreshed websites data:", response.data.websites);
        setWebsitearray(response.data.websites);
        
        // Update the currently selected website if it exists in the new data
        if (selectedWebsite) {
          const refreshedWebsite = response.data.websites.find(
            website => website.siteId === selectedWebsite.siteId
          );
          
          if (refreshedWebsite) {
            console.log("Updated selected website:", refreshedWebsite);
            setSelectedWebsite(refreshedWebsite);
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing websites:", error);
    }
  };

  const handleVerify = async () => {
    try {
      setverifyload(true);
      
      // Use the verify site method from the SDK API utility
      const response = await axiosInstance.post('/website/verify', {
        Domain: selectedWebsite.Domain,
        siteId: selectedWebsite.siteId
      });

      if (response.status === 200) {
        // Update the local website object with verified status
        if (response.data.website) {
          const updatedWebsite = response.data.website;
          
          // Update the current website with verified status
          setSelectedWebsite(updatedWebsite);
          
          // Update the website in the websitearray
          const updatedWebsites = websitearray.map(site => 
            site.siteId === updatedWebsite.siteId ? updatedWebsite : site
          );
          setWebsitearray(updatedWebsites);
          
          // Set success message
          setfalsemessage("Website verified successfully!");
        } else {
          // Handle legacy response format
          selectedWebsite.isVerified = true;
          setfalsemessage("Website verified successfully!");
          
          // Manual refresh to ensure UI is updated
          await refreshWebsites();
        }
        
        localStorage.setItem("idy", selectedWebsite.siteId);
        localStorage.setItem("selectedWebsite", selectedWebsite.Domain);
        setscriptmodel(false);
        
        // Use the SDK API utility for analytics
        const analyticsResponse = await sdkApi.getAnalytics(verifyid || selectedWebsite.siteId);
        setanalytics(analyticsResponse.analytics);
        console.log(analytics);
        setidy(selectedWebsite.siteId);
      } 
    } catch (error) {
      // Handle specific status codes
      if (error.response) {
        if (error.response.status === 404) {
          setfalsemessage("Cryptique analytics script not found on the page. For JavaScript frameworks, make sure the script is loaded before verification.");
        } else if (error.response.status === 403) {
          setfalsemessage("site-id does not match or is missing. Check your installation code.");
        } else {
          setfalsemessage("Verification failed. Please check that your site is accessible.");
        }
      } else {
        setfalsemessage("Verification failed. Please try again later.");
      }
    }
    finally {
      setverifyload(false);
    }
  };

  const handleDelete = async () => {
    try {
      setdeleteload(true);
      // console.log(selectedWebsite);
    
      // Clean the team name to remove any quotes
      let teamName = selectedTeam;
      
      // If it starts with a quote and ends with a quote, try to parse it
      if (typeof teamName === 'string' && teamName.startsWith('"') && teamName.endsWith('"')) {
        try {
          teamName = JSON.parse(teamName);
        } catch (e) {
          console.error("Error parsing teamName with quotes:", e);
          // If parsing fails, we'll still use the string but remove quotes manually
          teamName = teamName.replace(/^"|"$/g, '');
        }
      }
    
      const response = await axiosInstance.post('/website/delete', {
        teamName: teamName,
        webId: selectedWebsite._id
      });
  
      if (response.status === 200) {
        setfalsemessage("Website deleted successfully");
        setSelectedWebsite(null);
        localStorage.setItem("selectedWebsite", '');
        localStorage.setItem("idy", '');
        setscriptmodel(false);

        // Use the updated refreshWebsites function to load websites after deletion
        refreshWebsites();
      } 
    } catch (error) {
      // Handle specific status codes
      if (error.response) {
        if (error.response.status === 500) {
          setfalsemessage("Error while deleting the website");
        } 
      }
    } finally {
      setdeleteload(false);
    }
  };
  
  console.log(selectedPage);
  return (
    <div className="bg-white p-3 shadow-sm rounded-2xl mx-4 mb-4 font-['Inter']">
    <div className="max-w-7xl mx-auto">
      {/* Main flex container to put all three items in one row */}
      <div className="flex space-x-4">
        {/* Website selector - with reduced size */}
        <div className="flex-1">
          <div className="select-website">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Select website
            </label>
            
            <div className="relative">
              <button
                type="button"
                className="flex items-center justify-between w-full px-3 py-1.5 text-base bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none"
                onClick={handleDropdownToggle}
                disabled={isLoading}
              >
                {localStorage.getItem("selectedWebsite") !== null ? (
                  <div className="flex items-center">
                    {selectedWebsite && selectedWebsite.isVerified === true ? (
                      <span className="inline-block w-5 h-5 mr-2 bg-green-600 rounded-sm text-white flex-shrink-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="inline-block w-5 h-5 mr-2 bg-red-600 rounded-sm text-white flex-shrink-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                    <span className="text-gray-800 text-base">{localStorage.getItem("selectedWebsite")}</span>
                  </div>
                ) : (
                  <span className="text-gray-500 text-base">Select a website</span>
                )}
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4 ml-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              {/* Dropdown menu */}
              {isDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200">
                  <ul className="py-1 max-h-60 overflow-auto">
                    {isLoading ? (
                      <li className="px-3 py-1.5 text-gray-500 text-base">Loading websites...</li>
                    ) : websitearray.length > 0 ? (
                      websitearray.map((website, index) => (
                        <li key={website.siteId || index}>
                          <button
                            type="button"
                            className="flex items-center w-full px-3 py-1.5 text-base text-left hover:bg-gray-100"
                            onClick={() => handleSelectWebsite(website)}
                          >
                            {website.isVerified === true ? (
                              <span className="inline-block w-5 h-5 mr-2 bg-green-600 rounded-sm text-white flex-shrink-0 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            ) : (
                              <span className="inline-block w-5 h-5 mr-2 bg-red-600 rounded-sm text-white flex-shrink-0 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                            )}
                            <span className="text-base">{website.Domain}</span>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-1.5 text-gray-500 text-base">No websites found</li>
                    )}
                    
                    {/* Add website option - replaced with a note about Manage Websites tab */}
                    <li className="border-t border-gray-200">
                      <div 
                        className="px-3 py-2 text-sm text-indigo-600 font-medium hover:bg-gray-100 cursor-pointer flex items-center"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          const teamName = localStorage.getItem("selectedTeam");
                          navigate(`/${teamName}/managewebsites`);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add/Manage Websites
                      </div>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
  
        {selectedPage.selectedPage==='onchain-explorer' && <>
        <SmartContractFilters 
        contractarray={contractarray} 
        setcontractarray={setcontractarray}
        selectedContract={selectedContract}
        setSelectedContract={setSelectedContract}/>
        </>}
  
  
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Dates
          </label>
          <select 
            className="w-full border text-base px-3 py-1.5 bg-gray-100 border-gray-300 rounded-md shadow-sm focus:outline-none"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option>Select Date</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>This month</option>
            <option>Custom range</option>
          </select>
        </div>
       
  
        {/* Filters selector - smaller size */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Filters
          </label>
          <select 
            className="w-full border text-base px-3 py-1.5 bg-gray-100 border-gray-300 rounded-md shadow-sm focus:outline-none"
            value={selectedFilters}
            onChange={(e) => setSelectedFilters(e.target.value)}
          >
            <option>Select Filters</option>
            <option>New users</option>
            <option>Returning users</option>
            <option>All traffic sources</option>
          </select>
        </div>
      </div>
    </div>
  
    {/* Script Modal */}
    {scriptmodel && selectedWebsite && (
      <div className="fixed inset-0 z-50 overflow-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Installation Instructions</h2>
              <button onClick={handleClosescriptmodel} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <InstallationTabs 
              siteId={selectedWebsite.siteId}
              domain={selectedWebsite.Domain}
              scriptcode={scriptcode}
              generateGTMCode={generateGTMCode}
            />
            
            <div className="flex justify-center space-x-4 mt-6">
              {selectedWebsite && (selectedWebsite.isVerified === false) ? (
                <button
                  onClick={handleVerify}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition duration-150 flex items-center"
                  disabled={verifyload}
                >
                {verifyload ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ):(
                  <>
                 
                  Verify Installation
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  </>
                )}
                </button>
              ) : (
                <></>
              )}
              
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition duration-150 flex items-center"
              >
                Delete
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className='flex justify-center text-red-500 my-2'>
              {falsemessage && (
                <>{falsemessage}</>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}

// Tab component for installation methods
const InstallationTabs = ({ siteId, domain, scriptcode, generateGTMCode }) => {
  const [activeTab, setActiveTab] = useState('html');
  
  const jsCode = `// Add to your main component or App.js
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js';
  script.setAttribute('site-id', '${siteId}');
  document.head.appendChild(script);
}, []);`;

  return (
    <div>
      <p className="mb-3">
        To track analytics for <span className="font-semibold">{domain}</span>, 
        select your preferred installation method:
      </p>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('html')}
            className={`${
              activeTab === 'html'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            HTML
          </button>
          <button
            onClick={() => setActiveTab('js')}
            className={`${
              activeTab === 'js'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            JavaScript/React
          </button>
          <button
            onClick={() => setActiveTab('gtm')}
            className={`${
              activeTab === 'gtm'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Google Tag Manager
          </button>
        </nav>
      </div>
      
      <div className="py-4">
        {activeTab === 'html' && (
          <div>
            <p className="mb-2 text-sm text-gray-700">
              Add this script to the <code className="bg-gray-100 px-1 py-0.5 rounded">&lt;head&gt;</code> 
              section of your website:
            </p>
            <div className="bg-gray-50 rounded-md border border-gray-200 p-4 overflow-x-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-40">
                {scriptcode}
              </pre>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(scriptcode);
                alert('Script copied to clipboard!');
              }}
              className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Copy to Clipboard
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
        )}
        
        {activeTab === 'js' && (
          <div>
            <p className="mb-2 text-sm text-gray-700">
              For React, Next.js, or other JavaScript frameworks, add this code to your component:
            </p>
            <div className="bg-gray-50 rounded-md border border-gray-200 p-4 overflow-x-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-40">
                {jsCode}
              </pre>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(jsCode);
                alert('Code copied to clipboard!');
              }}
              className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Copy to Clipboard
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
        )}
        
        {activeTab === 'gtm' && (
          <div>
            <p className="mb-2 text-sm text-gray-700">
              Create a new Custom HTML Tag in Google Tag Manager:
            </p>
            <div className="bg-gray-50 rounded-md border border-gray-200 p-4 overflow-x-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-40">
                {generateGTMCode(siteId)}
              </pre>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(generateGTMCode(siteId));
                alert('GTM code copied to clipboard!');
              }}
              className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Copy to Clipboard
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Filters;
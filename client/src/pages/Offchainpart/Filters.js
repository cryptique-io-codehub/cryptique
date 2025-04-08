import React, { useState, useEffect } from 'react';
import axiosInstance from '../../axiosInstance';

const Filters = ({ websitearray, setWebsitearray, analytics, setanalytics, selectedDate, setSelectedDate, selectedWebsite, setSelectedWebsite, selectedFilters, setSelectedFilters,idy,setidy }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem("selectedTeam"));
  const [showAddWebsiteModal, setShowAddWebsiteModal] = useState(false);
  const [newWebsiteDomain, setNewWebsiteDomain] = useState('');
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [scriptmodel, setscriptmodel] = useState(false);
  const [scriptcode, setscriptcode] = useState('');
  const [verifyid, setverifyid] = useState('');
  const [falsemessage, setfalsemessage] = useState('');
  const[verifyload,setverifyload]=useState(false);
  const[deleteload,setdeleteload]=useState(false);
  // fetch website
  // depend-selectedTeam
  useEffect(() => {
    const selectteam = localStorage.getItem("selectedTeam");
    setSelectedTeam(selectteam);
  
    const fetchWebsites = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.post('/website/getWebsites', {
          teamName: selectteam // use the value from localStorage directly
        });
        if (response.status === 200) {
          console.log(response.data.websites);
          if (response && response.data.websites.length > 0) {
            setWebsitearray(response.data.websites);
            console.log('c');
            if(localStorage.getItem("selectedWebsite") === '') {
              console.log('a');
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
              
              // Show installation popup if needed for first website
              if (!firstWebsite.isVerified) {
                // setscriptmodel(true);
                setidy(firstWebsite.siteId);
                // localStorage.setItem("showInstallationPopup", "true");
              }
            } else {
              // Find the selected website in the array
              const currentWebsite = response.data.websites.find(
                website => website.Domain === localStorage.getItem("selectedWebsite")
              );
              
              if (currentWebsite) {
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
                
                // Show installation popup if website is not verified
                // if (!currentWebsite.isVerified) {
                  // setscriptmodel(true);
                  // localStorage.setItem("showInstallationPopup", "true");
                // }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching websites:", error);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchWebsites();
  }, [localStorage.getItem("selectedWebsite")]);
  

  const handleSelectWebsite = async (website) => {
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
    setscriptmodel(true);
    // localStorage.setItem("showInstallationPopup", "true");
    
    if (website.isVerified) {
      const new_response = await axiosInstance.get(`/sdk/analytics/${website.siteId}`);
      setanalytics(new_response.data.analytics);
    }
    
    setIsDropdownOpen(false);
  }

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleOpenAddWebsiteModal = () => {
    setShowAddWebsiteModal(true);
    setIsDropdownOpen(false);
  };

  const handleCloseAddWebsiteModal = () => {
    setShowAddWebsiteModal(false);
  };

  const handleClosescriptmodel = () => {
    setfalsemessage('');
    setscriptmodel(false);
    // localStorage.removeItem("showInstallationPopup");
  }

  const handleAddWebsite = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/website/create',
        {
          Domain: newWebsiteDomain,
          Name: newWebsiteName, // Use domain as name if no name provided
          teamName: selectedTeam // Include team name in request body
        }
      );
      setSelectedWebsite(response.data.website);
      console.log(response);
      localStorage.setItem("selectedWebsite",response.data.website.Domain);
      if(response.data.message === "Website added successfully" ) {
        const iD = response.data.website.siteId;
        localStorage.setItem("idy",iD);
        setverifyid(iD);
        const scriptHTML = `<script>
        var script = document.createElement('script');
        script.src = 'https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js';  
        script.setAttribute('site-id', '${iD}');
        document.head.appendChild(script);
      </script>`;
        setscriptcode(scriptHTML);
        setscriptmodel(true);
        // localStorage.setItem("showInstallationPopup", "true");
        setShowAddWebsiteModal(false);
      }
    } catch (error) {
      console.error("Error adding website:", error);
    }
  };

  const handleVerify = async () => {
    try {
      setverifyload(true);
      console.log(selectedWebsite);
    
      const response = await axiosInstance.post('/website/verify', {
        Domain: selectedWebsite.Domain,
        siteId: selectedWebsite.siteId
      });
  
      if (response.status === 200) {
        selectedWebsite.isVerified=true;

        localStorage.setItem("idy", selectedWebsite.siteId);
        localStorage.setItem("selectedWebsite",selectedWebsite.Domain);
        setscriptmodel(false);
        // localStorage.removeItem("showInstallationPopup");
        const new_response = await axiosInstance.get(`/sdk/analytics/${verifyid || selectedWebsite.siteId}`);
        setanalytics(new_response.data.analytics);
        setidy(selectedWebsite.siteId);
      } 
    } catch (error) {
      // Handle specific status codes
      if (error.response) {
        if (error.response.status === 404) {
          setfalsemessage("Cryptique analytics script not found on the page");
        } else if(error.response.status === 403)
        {
          setfalsemessage("site-id does not match or is missing");
        }
      } else {
        setfalsemessage("Verification failed");
      }
    }
    finally {
      setverifyload(false);
    }
  };

  const handleDelete = async () => {
    try {
      console.log(selectedWebsite);
    
      const response = await axiosInstance.post('/website/delete', {
        teamName: selectedTeam,
        webId: selectedWebsite._id
      });
  
      if (response.status === 200) {
        setfalsemessage("website deleted successfully");
        setSelectedWebsite();
        localStorage.setItem("selectedWebsite", '');
        // localStorage.removeItem("showInstallationPopup");
        setscriptmodel(false);


        const fetchWebsites = async () => {
          setIsLoading(true);
          
          try {
            const response = await axiosInstance.post('/website/getWebsites', {
              teamName: localStorage.getItem("selectedTeam") // use the value from localStorage directly
            });
      
            if (response.status === 200) {
              console.log('adf');
              console.log(response.data.websites);
              if (response && response.data.websites.length > 0) {
                setWebsitearray(response.data.websites);
                if(localStorage.getItem("selectedWebsite") === null) {
                const firstWebsite = response.data.websites[0];
                localStorage.setItem("idy", firstWebsite.siteId);
                localStorage.setItem("selectedWebsite", firstWebsite.Domain);
                setSelectedWebsite(firstWebsite);
                setidy(firstWebsite.siteId);
                }
                setfalsemessage('');
                setscriptmodel(false);
              }
            }
          } catch (error) {
            console.error("Error fetching websites:", error);
          } finally {
            setIsLoading(false);
          }
        };
      
        fetchWebsites();
      } 
    } catch (error) {
      // Handle specific status codes
      if (error.response) {
        if (error.response.status === 500) {
          setfalsemessage("Error while deleting the website");
        } 
      }
    }
  };
  

  return (
    <div className="bg-white p-3 shadow-sm rounded-2xl mx-4 mb-4">
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
                  className="flex items-center justify-between w-full px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none"
                  onClick={handleDropdownToggle}
                  disabled={isLoading}
                >
                  {localStorage.getItem("selectedWebsite") !== null ? (
                    <div className="flex items-center">
                      {selectedWebsite && selectedWebsite.isVerified?(<span className="inline-block w-5 h-5 mr-2 bg-green-600 rounded-sm text-white flex-shrink-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </span>):(
                        <span className="inline-block w-5 h-5 mr-2 bg-red-600 rounded-sm text-white flex-shrink-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      )}
                      <span className="text-gray-800 text-sm">{localStorage.getItem("selectedWebsite")}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Select a website</span>
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
                        <li className="px-3 py-1.5 text-gray-500 text-sm">Loading websites...</li>
                      ) : websitearray.length > 0 ? (
                        websitearray.map((website, index) => (
                          <li key={website.siteId || index}>
                            <button
                              type="button"
                              className="flex items-center w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                              onClick={() => handleSelectWebsite(website)}
                            >
                              {website.isVerified ? (<span className="inline-block w-5 h-5 mr-2 bg-green-600 rounded-sm text-white flex-shrink-0 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </span>):(
                                <span className="inline-block w-5 h-5 mr-2 bg-red-600 rounded-sm text-white flex-shrink-0 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                              )}
                              <span className="text-sm">{website.Domain}</span>
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="px-3 py-1.5 text-gray-500 text-sm">No websites found</li>
                      )}
                      
                      {/* Add website option */}
                      <li className="border-t border-gray-200">
                        <button
                          type="button"
                          className="flex items-center w-full px-3 py-1.5 text-sm text-left text-blue-600 hover:bg-gray-100"
                          onClick={handleOpenAddWebsiteModal}
                        >
                          <span className="inline-block w-5 h-5 mr-2 bg-blue-600 rounded-full text-white flex-shrink-0 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                          </span>
                          <span className="text-sm">Add new website</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dates selector - smaller size */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Dates
            </label>
            <select 
              className="w-full border text-sm px-3 py-1.5 bg-gray-100 border-gray-300 rounded-md shadow-sm focus:outline-none"
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
              className="w-full border text-sm px-3 py-1.5 bg-gray-100 border-gray-300 rounded-md shadow-sm focus:outline-none"
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

      {/* Add Website Modal */}
      {showAddWebsiteModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4">
              <div className="flex items-center mb-4">
                <button onClick={handleCloseAddWebsiteModal} className="text-gray-500 hover:text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <h2 className="text-xl font-semibold ml-2">Add a new website</h2>
              </div>
              
              <form onSubmit={handleAddWebsite}>
                <div className="mb-4">
                  <label className="block font-medium text-gray-700 mb-2">Domain*</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-100 text-gray-700 text-sm">
                      https://
                    </span>
                    <input
                      type="text"
                      className="flex-1 min-w-0 block w-full px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="example.com"
                      value={newWebsiteDomain}
                      onChange={(e) => setNewWebsiteDomain(e.target.value)}
                      required
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Just the domain or subdomain without 'https://' and/or 'www' (e.g. 'example.com' or 'subdomain.example.com')
                  </p>
                </div>
                
                <div className="mb-6">
                  <label className="block font-medium text-gray-700 mb-2">Name (optional)</label>
                  <input
                    type="text"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Please enter a name for your website"
                    value={newWebsiteName}
                    onChange={(e) => setNewWebsiteName(e.target.value)}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This is the name that will be displayed in the dashboard
                  </p>
                </div>
                
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600">
                    By adding a website, you agree to our privacy policy
                  </p>
                </div>
                
                <button
                  type="submit"
                  className="w-full flex justify-center items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none"
                >
                  Add website
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {scriptmodel && (
                <div className="fixed inset-0 z-50 overflow-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"> {/* Increased max-width */}
                  <div className="p-6"> {/* Increased padding */}
                    <div className="flex items-center justify-between mb-4"> {/* Added justify-between */}
                      <h2 className="text-xl font-semibold">Installation Instructions</h2>
                      <button onClick={handleClosescriptmodel} className="text-gray-500 hover:text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
                    <p className="mb-4 text-gray-700">
                      Add this script to your website to start tracking analytics:
                    </p>
                    
                    <div className="bg-gray-50 rounded-md border border-gray-200 p-4 mb-6 relative">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-40">
                        {scriptcode}
                      </pre>
                      {/* <button 
                        onClick={copyToClipboard}
                        className="absolute top-2 right-2 bg-gray-200 hover:bg-gray-300 p-1 rounded"
                        title="Copy to clipboard"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button> */}
                    </div>
                    
                    <div className="flex justify-center space-x-4">
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
                    <div className='flex justify-center text-red-500 my-2'   >
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

export default Filters;
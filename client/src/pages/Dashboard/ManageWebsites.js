import React, { useState, useEffect } from "react";
import axiosInstance from "../../axiosInstance";
import sdkApi from '../../utils/sdkApi';
import GracePeriodWarning from '../../components/GracePeriodWarning';

const ManageWebsites = ({ onMenuClick, onClose, screenSize }) => {
  // State declarations
  const [websiteArray, setWebsiteArray] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem("selectedTeam"));
  const [showAddWebsiteModal, setShowAddWebsiteModal] = useState(false);
  const [newWebsiteDomain, setNewWebsiteDomain] = useState('');
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [scriptModal, setScriptModal] = useState(false);
  const [scriptCode, setScriptCode] = useState('');
  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Add subscription grace period state
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [gracePeriodInfo, setGracePeriodInfo] = useState(null);

  // Fetch websites when component mounts
  useEffect(() => {
    fetchWebsites();
    checkSubscriptionStatus();
  }, []);
  
  // Check subscription status
  const checkSubscriptionStatus = async () => {
    try {
      // Call a subscription status endpoint
      const response = await axiosInstance.get(`/team/subscription-status/${selectedTeam}`);
      
      if (response.data.inGracePeriod) {
        setInGracePeriod(true);
        setGracePeriodInfo(response.data.gracePeriod);
      } else {
        setInGracePeriod(false);
        setGracePeriodInfo(null);
      }
    } catch (error) {
      console.error("Error checking subscription status:", error);
      // If we can't determine status, assume not in grace period to avoid blocking unnecessarily
      setInGracePeriod(false);
      
      // Handle 404 errors silently - this happens if the endpoint isn't implemented yet
      if (error.response && error.response.status === 404) {
        console.log("Subscription status endpoint not available, continuing without subscription check");
      } else {
        // For other errors, log them but don't show to the user to avoid disrupting experience
        console.warn("Unable to check subscription status:", 
          error.response?.data?.message || error.message);
      }
    }
  };

  // Function to fetch websites
  const fetchWebsites = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/website/team/${selectedTeam}`);
      
      if (response.status === 200) {
        setWebsiteArray(response.data.websites || []);
      }
    } catch (error) {
      console.error("Error fetching websites:", error);
      showMessage("Failed to load websites. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to show a message
  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
    
    // Clear the message after 5 seconds
    setTimeout(() => {
      setMessage('');
    }, 5000);
  };

  // Function to generate script code
  const generateScriptCode = (siteId) => {
    const code = `<script async src="${process.env.REACT_APP_API_SERVER_URL || 'https://cryptique-backend.vercel.app'}/api/sdk/cq.js?siteId=${siteId}" data-cryptique="${siteId}"></script>`;
    setScriptCode(code);
  };

  // Function to handle adding a new website
  const handleAddWebsite = async (e) => {
    e.preventDefault();
    
    // Check if in grace period
    if (inGracePeriod) {
      showMessage("Cannot add new websites during grace period. Please renew your subscription.", "error");
      return;
    }
    
    try {
      const response = await axiosInstance.post('/website/create', {
        Domain: newWebsiteDomain,
        Name: newWebsiteName,
        teamName: selectedTeam
      });
      
      if (response.status === 200) {
        showMessage("Website added successfully!", "success");
        setShowAddWebsiteModal(false);
        setNewWebsiteDomain('');
        setNewWebsiteName('');
        fetchWebsites();
        
        // Select the newly added website
        if (response.data.website) {
          setSelectedWebsite(response.data.website);
          generateScriptCode(response.data.website.siteId);
          setScriptModal(true);
        }
      }
    } catch (error) {
      console.error("Error adding website:", error);
      
      // Handle specific error messages from server
      if (error.response) {
        if (error.response.status === 403) {
          if (error.response.data?.error === 'Subscription required') {
            // Subscription grace period issue
            setInGracePeriod(true);
            setGracePeriodInfo(error.response.data.gracePeriod);
            showMessage(error.response.data.message || "Failed to add website due to subscription issues", "error");
          } else if (error.response.data?.error === 'Resource limit reached') {
            // Subscription limit reached
            const message = error.response.data.message || "You have reached the maximum number of websites for your current plan.";
            
            // Add upgrade options if available
            let fullMessage = message;
            if (error.response.data?.upgradeOptions?.length > 0) {
              const nextPlan = error.response.data.upgradeOptions[0];
              fullMessage += ` Consider upgrading to ${nextPlan.plan} plan to add up to ${nextPlan.websites} websites.`;
            }
            
            showMessage(fullMessage, "error");
          } else {
            showMessage(error.response.data.message || "Permission denied.", "error");
          }
        } else {
          showMessage(error.response.data.message || "Failed to add website. Please try again.", "error");
        }
      } else {
        showMessage("Failed to add website. Please try again.", "error");
      }
    }
  };

  // Function to verify a website
  const handleVerify = async (website) => {
    setVerifyLoading(true);
    try {
      const response = await axiosInstance.post('/website/verify', {
        Domain: website.Domain,
        siteId: website.siteId
      });

      if (response.status === 200) {
        showMessage("Website verified successfully! Analytics data will now be collected.", "success");
        
        // Update the local state with the verified website
        if (response.data.website) {
          // Update the website in the array
          const updatedWebsites = websiteArray.map(site => 
            site.siteId === response.data.website.siteId ? response.data.website : site
          );
          setWebsiteArray(updatedWebsites);
          
          // Update selected website if it's the one being verified
          if (selectedWebsite && selectedWebsite.siteId === response.data.website.siteId) {
            setSelectedWebsite(response.data.website);
          }
          
          // If this is the currently selected website in the app, update localStorage
          if (localStorage.getItem("idy") === response.data.website.siteId) {
            localStorage.setItem("idy", response.data.website.siteId);
            localStorage.setItem("selectedWebsite", response.data.website.Domain);
          }
        } else {
          // Fallback to reloading all websites if no website is returned
          fetchWebsites();
        }
        
        setScriptModal(false);
      }
    } catch (error) {
      console.error("Error verifying website:", error);
      showMessage("Failed to verify website. Please try again.", "error");
    } finally {
      setVerifyLoading(false);
    }
  };

  // Function to delete a website
  const handleDelete = async (website) => {
    if (window.confirm(`Are you sure you want to delete ${website.Domain}? This action cannot be undone.`)) {
      setDeleteLoading(true);
      try {
        const response = await axiosInstance.delete(`/website/delete/${website.siteId}`);
        
        if (response.status === 200) {
          showMessage(`${website.Domain} has been deleted successfully`, "success");
          
          // Remove from local state
          setWebsiteArray(websiteArray.filter(site => site.siteId !== website.siteId));
          
          // If this was the selected website, clear selection
          if (selectedWebsite && selectedWebsite.siteId === website.siteId) {
            setSelectedWebsite(null);
          }
          
          // If this was the currently selected website in the app, clear localStorage
          if (localStorage.getItem("idy") === website.siteId) {
            localStorage.removeItem("idy");
            localStorage.removeItem("selectedWebsite");
          }
        }
      } catch (error) {
        console.error("Error deleting website:", error);
        showMessage("Failed to delete website. Please try again.", "error");
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Websites</h1>
        <button
          onClick={() => {
            // Check if in grace period
            if (inGracePeriod) {
              showMessage("Cannot add new websites during grace period. Please renew your subscription.", "error");
              return;
            }
            setShowAddWebsiteModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Website
        </button>
      </div>
      
      {/* Grace Period Warning */}
      {inGracePeriod && gracePeriodInfo && (
        <GracePeriodWarning 
          daysLeft={gracePeriodInfo.daysLeft} 
          gracePeriodEndDate={gracePeriodInfo.endDate} 
        />
      )}

      {/* Success/Error message */}
      {message && (
        <div className={`mb-4 p-3 rounded-md ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* Website List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin mx-auto h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-500">Loading websites...</p>
          </div>
        ) : websiteArray.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">You don't have any websites yet.</p>
            <button
              onClick={() => {
                if (inGracePeriod) {
                  showMessage("Cannot add new websites during grace period. Please renew your subscription.", "error");
                  return;
                }
                setShowAddWebsiteModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center"
              disabled={inGracePeriod}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Your First Website
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {websiteArray.map((website) => (
                  <tr key={website.siteId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{website.Domain}</div>
                          <div className="text-sm text-gray-500">{website.Name || <em>No name provided</em>}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {website.isVerified ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Not Verified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {!website.isVerified && (
                        <button
                          onClick={() => {
                            setSelectedWebsite(website);
                            generateScriptCode(website.siteId);
                            setScriptModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(website)}
                        className="text-red-600 hover:text-red-900"
                        disabled={deleteLoading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Website Modal */}
      {showAddWebsiteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Add New Website</h2>
              <button
                onClick={() => setShowAddWebsiteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddWebsite}>
              <div className="mb-4">
                <label className="block font-medium text-gray-700 mb-2">Domain*</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-100 text-gray-700 text-base">
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
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddWebsiteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={inGracePeriod}
                >
                  {inGracePeriod ? "Disabled During Grace Period" : "Add Website"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Script Modal for Verification */}
      {scriptModal && selectedWebsite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Verify Your Website</h2>
              <button
                onClick={() => setScriptModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-4">
                To verify ownership of <strong>{selectedWebsite.Domain}</strong>, please add the following script to your website's HTML just before the closing <code>&lt;/head&gt;</code> tag:
              </p>
              
              <div className="bg-gray-100 p-3 rounded-md overflow-auto">
                <code className="text-sm font-mono text-gray-800">{scriptCode}</code>
              </div>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(scriptCode);
                  showMessage("Script copied to clipboard!", "success");
                }}
                className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy to Clipboard
              </button>
            </div>
            
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setScriptModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => handleVerify(selectedWebsite)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                disabled={verifyLoading}
              >
                {verifyLoading ? (
                  <>
                    <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verify Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageWebsites;
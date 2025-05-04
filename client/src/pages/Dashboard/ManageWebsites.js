import React, { useState, useEffect } from "react";
import axiosInstance from "../../axiosInstance";
import sdkApi from '../../utils/sdkApi';

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

  // Fetch websites when component mounts
  useEffect(() => {
    fetchWebsites();
  }, []);

  // Function to fetch websites for the selected team
  const fetchWebsites = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/website/getWebsites', {
        teamName: selectedTeam
      });
      
      if (response.status === 200) {
        setWebsiteArray(response.data.websites);
        
        // Check if there's a currently selected website in localStorage
        const savedWebsiteDomain = localStorage.getItem("selectedWebsite");
        if (savedWebsiteDomain && response.data.websites.length > 0) {
          const currentWebsite = response.data.websites.find(
            website => website.Domain === savedWebsiteDomain
          );
          if (currentWebsite) {
            setSelectedWebsite(currentWebsite);
            generateScriptCode(currentWebsite.siteId);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching websites:", error);
      showMessage("Failed to load websites. Please try again later.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to generate script code for a website
  const generateScriptCode = (siteId) => {
    const scriptHTML = `<script>
    var script = document.createElement('script');
    script.src = 'https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js';  
    script.setAttribute('site-id', '${siteId}');
    document.head.appendChild(script);
  </script>`;
    setScriptCode(scriptHTML);
  };

  // Function to show a message to the user
  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // Function to handle adding a new website
  const handleAddWebsite = async (e) => {
    e.preventDefault();
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
      showMessage("Failed to add website. Please try again.", "error");
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
        fetchWebsites();
        setScriptModal(false);
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          showMessage(
            "Verification failed: Script not found on the page. For TypeScript/JavaScript sites, ensure the script has loaded before any verification requests.", 
            "error"
          );
        } else if (error.response.status === 403) {
          showMessage(
            "Verification failed: The site-id attribute doesn't match or is missing. Make sure the site-id is exactly as shown in the installation instructions.",
            "error"
          );
        } else {
          showMessage(
            "Verification failed. Please make sure your site is publicly accessible and the script is properly loaded.",
            "error"
          );
        }
      } else {
        showMessage(
          "Verification failed. This could be due to network issues or problems accessing your website. Please try again later.",
          "error"
        );
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  // Function to delete a website
  const handleDelete = async (website) => {
    if (!window.confirm(`Are you sure you want to delete ${website.Domain}?`)) {
      return;
    }
    
    setDeleteLoading(true);
    try {
      const response = await axiosInstance.post('/website/delete', {
        teamName: selectedTeam,
        webId: website._id
      });

      if (response.status === 200) {
        showMessage("Website deleted successfully!", "success");
        
        // If the deleted website was selected, clear the selection
        if (selectedWebsite && selectedWebsite._id === website._id) {
          setSelectedWebsite(null);
          setScriptModal(false);
          
          // If this was the currently selected website in the app, clear that too
          if (localStorage.getItem("selectedWebsite") === website.Domain) {
            localStorage.setItem("selectedWebsite", '');
            localStorage.setItem("idy", '');
          }
        }
        
        fetchWebsites();
      }
    } catch (error) {
      console.error("Error deleting website:", error);
      showMessage("Failed to delete website. Please try again.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Function to view website installation instructions
  const handleViewScript = (website) => {
    setSelectedWebsite(website);
    generateScriptCode(website.siteId);
    setScriptModal(true);
  };

  // Function to close script modal
  const handleCloseScriptModal = () => {
    setScriptModal(false);
  };

  return (
    <div className="flex flex-col h-screen p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Websites</h1>
        <button
          onClick={() => setShowAddWebsiteModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
        >
          Add Website
        </button>
      </div>

      {/* Message display */}
      {message && (
        <div className={`mb-4 p-3 rounded-md ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* Websites table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Domain
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading websites...
                </td>
              </tr>
            ) : websiteArray.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  No websites found. Add your first website to get started.
                </td>
              </tr>
            ) : (
              websiteArray.map((website) => (
                <tr key={website.siteId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {website.Domain}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {website.Name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${website.isVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {website.isVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                    <button
                      onClick={() => handleViewScript(website)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Script
                    </button>
                    {!website.isVerified && (
                      <button
                        onClick={() => handleVerify(website)}
                        className="text-green-600 hover:text-green-900 ml-2"
                        disabled={verifyLoading}
                      >
                        Verify
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(website)}
                      className="text-red-600 hover:text-red-900 ml-2"
                      disabled={deleteLoading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Website Modal */}
      {showAddWebsiteModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Add a new website</h2>
                <button onClick={() => setShowAddWebsiteModal(false)} className="text-gray-500 hover:text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
                
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600">
                    By adding a website, you agree to our privacy policy
                  </p>
                </div>
                
                <button
                  type="submit"
                  className="w-full flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
                >
                  Add website
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Script Installation Modal */}
      {scriptModal && selectedWebsite && (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Website Installation Script</h2>
                <button onClick={handleCloseScriptModal} className="text-gray-500 hover:text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="mb-4">
                  To track analytics for <span className="font-semibold">{selectedWebsite.Domain}</span>, 
                  choose the installation method that matches your website:
                </p>
                
                {/* Traditional HTML */}
                <div className="mb-4">
                  <h3 className="text-md font-semibold mb-2">Option 1: Traditional HTML</h3>
                  <p className="mb-2">
                    Add the following script to the <code className="bg-gray-100 px-1 py-0.5 rounded">&lt;head&gt;</code> 
                    section of your website:
                  </p>
                  <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                    <pre className="text-sm text-gray-800">{scriptCode}</pre>
                  </div>
                </div>
                
                {/* TypeScript/JavaScript */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Option 2: For TypeScript/JavaScript Projects</h3>
                  <p className="mb-2">
                    Add the following code to your main component or script file:
                  </p>
                  <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                    <pre className="text-sm text-gray-800">{`// Add this to your main component (e.g., in useEffect or componentDidMount)
const script = document.createElement('script');
script.src = 'https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js';
script.setAttribute('site-id', '${selectedWebsite.siteId}');
document.head.appendChild(script);`}</pre>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="text-md font-semibold text-blue-800 mb-1">Verification Note</h3>
                <p className="text-sm text-blue-800">
                  After adding the script to your website, please make sure:
                </p>
                <ul className="list-disc pl-5 mt-1 text-sm text-blue-800">
                  <li>Your website is deployed and publicly accessible</li>
                  <li>The script is properly loaded (check network tab in DevTools)</li>
                  <li>The site-id attribute is correctly set to <code className="bg-blue-100 px-1 py-0.5 rounded">{selectedWebsite.siteId}</code></li>
                </ul>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={handleCloseScriptModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none"
                >
                  Close
                </button>
                {!selectedWebsite.isVerified && (
                  <button
                    onClick={() => handleVerify(selectedWebsite)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none"
                    disabled={verifyLoading}
                  >
                    {verifyLoading ? 'Verifying...' : 'Verify Installation'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageWebsites;
import React, { useState, useEffect } from "react";
import { X, Check, AlertCircle, Info } from "lucide-react";
import StripeSubscription from "./StripeSubscription";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";

// Billing Details Modal Component
const BillingDetailsModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    city: "",
    zipCode: "",
    country: "",
    isRegisteredCompany: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(formData);
    onClose();
  };

  const handleClear = () => {
    setFormData({
      companyName: "",
      address: "",
      city: "",
      zipCode: "",
      country: "",
      isRegisteredCompany: false
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4">
          <h2 className="text-lg font-medium">Provide Billing Detail</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Company name
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="flex gap-4 mb-4">
            <div className="w-1/2">
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City*
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div className="w-1/2">
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                Zip/Postal Code*
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <div className="relative">
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md appearance-none pr-8"
                required
              >
                <option value="">Select a country</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="IN">India</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="JP">Japan</option>
                <option value="BR">Brazil</option>
                <option value="IT">Italy</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="isRegisteredCompany"
                name="isRegisteredCompany"
                checked={formData.isRegisteredCompany}
                onChange={handleChange}
                className="mt-1 mr-2"
              />
              <label htmlFor="isRegisteredCompany" className="text-sm text-gray-700">
                I hereby confirm that this product is being purchased on behalf of a registered company.
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Billing Component
const Billing = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billingDetails, setBillingDetails] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Get query parameters (for Stripe redirect handling)
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const success = queryParams.get("success");
  const sessionId = queryParams.get("session_id");
  const canceled = queryParams.get("canceled");
  
  useEffect(() => {
    // Handle Stripe redirect
    const checkStripeSession = async () => {
      if (success && sessionId) {
        try {
          const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
          
          const response = await axios.get(`${API_URL}/api/stripe/checkout-status?session_id=${sessionId}`);
          
          if (response.data.success) {
            setSuccessMessage(response.data.message);
          } else {
            setError(response.data.message);
          }
        } catch (err) {
          console.error("Error checking session:", err);
          setError("Could not verify subscription status. Please contact support if your subscription is not active.");
        }
      } else if (canceled) {
        setError("You canceled the subscription process. No charges were made.");
      }
    };
    
    checkStripeSession();
  }, [success, sessionId, canceled]);
  
  useEffect(() => {
    const loadTeam = async () => {
      try {
        setLoading(true);
        
        // Get team from localStorage - could be name or object depending on your app's implementation
        const storedTeam = localStorage.getItem("selectedTeam");
        
        if (!storedTeam) {
          setError("No team selected. Please select a team first.");
          setLoading(false);
          return;
        }
        
        // Try to parse the stored team in case it's a JSON object
        let teamData;
        try {
          teamData = JSON.parse(storedTeam);
        } catch (e) {
          // If parsing fails, it's probably just a string (team name)
          teamData = { name: storedTeam };
        }
        
        // Check if we have a team ID stored separately
        const teamId = localStorage.getItem("selectedTeamId") || teamData._id;
        
        // For this app, we'll use any valid-looking ID - remove the temp-id check
        const finalTeamObj = {
          ...teamData,
          name: teamData.name || storedTeam,
          _id: teamId || storedTeam, // Use the team name as ID if nothing else available
          subscription: teamData.subscription || {
            plan: "free",
            status: "inactive"
          }
        };
        
        setCurrentTeam(finalTeamObj);
        setLoading(false);
      } catch (err) {
        console.error("Error loading team:", err);
        setError("Failed to load team information.");
        setLoading(false);
      }
    };
    
    loadTeam();
  }, [success, sessionId]); // Reload team data after successful subscription

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSaveBillingDetails = (data) => {
    setBillingDetails(data);
  };

  const handleDismissMessage = () => {
    setSuccessMessage(null);
    setError(null);
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
        </div>
        <div className="text-center mt-2">Loading team information...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Pricing Plans
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Choose the plan that best fits your needs. All plans include a secure dashboard and analytics.
          </p>
        </div>
        
        {/* Success notification if present */}
        {successMessage && (
          <div className="mb-8 bg-green-50 border-l-4 border-green-400 p-4 rounded shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex justify-between w-full">
                <p className="text-sm text-green-700">
                  {successMessage}
                </p>
                <button onClick={handleDismissMessage} className="text-green-700">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Error notification if present */}
        {error && (
          <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex justify-between w-full">
                <p className="text-sm text-yellow-700">
                  {error}
                  {error.includes("No team selected") && (
                    <span className="ml-2">
                      <Link to="/teams" className="font-medium underline text-yellow-700 hover:text-yellow-600">
                        Go to Teams
                      </Link>
                    </span>
                  )}
                </p>
                <button onClick={handleDismissMessage} className="text-yellow-700">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Info Badge */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-indigo-100 border border-indigo-200 rounded-full">
            <span className="font-medium text-indigo-800 mr-2">Current team:</span> 
            <span className="px-3 py-1 bg-indigo-800 text-white rounded-full text-sm">
              {currentTeam?.name || 'No Team Selected'}
            </span>
            <span className="mx-2">|</span>
            <span className="font-medium text-indigo-800 mr-2">Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm ${
              currentTeam?.subscription?.status === 'active' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-300 text-gray-800'
            }`}>
              {currentTeam?.subscription?.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        {/* Plans Grid */}
        <div className="hidden lg:block">
          {currentTeam && (
            <StripeSubscription teamId={currentTeam._id} currentTeam={currentTeam} />
          )}
        </div>
        
        {/* Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {/* Billing Details Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Billing Details</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                To receive a VAT invoice, please provide your company's details.
              </p>
              
              <button 
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={openModal}
              >
                {billingDetails ? 'Update company details' : 'Add company details'}
              </button>
              
              {/* Display billing details if available */}
              {billingDetails && (
                <div className="mt-5 bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <h4 className="font-medium text-gray-900">{billingDetails.companyName}</h4>
                  <p className="text-sm text-gray-600 mt-1">{billingDetails.address}</p>
                  <p className="text-sm text-gray-600">
                    {billingDetails.city}, {billingDetails.zipCode}
                  </p>
                  <p className="text-sm text-gray-600">{billingDetails.country}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Payment Info Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Subscription Details</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-sm font-medium text-gray-500">Current Plan</span>
                  <span className="text-sm text-gray-900 font-semibold">
                    {currentTeam?.subscription?.plan 
                      ? currentTeam.subscription.plan.charAt(0).toUpperCase() + currentTeam.subscription.plan.slice(1)
                      : 'Free'}
                  </span>
                </div>
                
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-sm font-medium text-gray-500">Billing Cycle</span>
                  <span className="text-sm text-gray-900 font-semibold">
                    {currentTeam?.subscription?.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                  </span>
                </div>
                
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-sm font-medium text-gray-500">Next Billing Date</span>
                  <span className="text-sm text-gray-900 font-semibold">
                    {currentTeam?.subscription?.endDate 
                      ? new Date(currentTeam.subscription.endDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-sm font-medium text-gray-500">CQ Intelligence</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    currentTeam?.subscription?.cqIntelligence ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {currentTeam?.subscription?.cqIntelligence ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              {currentTeam?.subscription?.status === 'active' && (
                <div className="mt-5">
                  <button 
                    onClick={() => window.location.href = '/settings/billing#subscription-management'}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Manage Subscription
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">How does billing work?</h3>
              <p className="text-gray-600">
                You'll be charged immediately upon subscribing, and then on the same day each month or year, depending on your billing cycle.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Can I cancel my subscription?</h3>
              <p className="text-gray-600">
                Yes, you can cancel at any time. Your subscription will remain active until the end of your current billing period.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">What's included in the CQ Intelligence add-on?</h3>
              <p className="text-gray-600">
                CQ Intelligence provides AI-powered analytics and insights to help you make better decisions and optimize your blockchain activities.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">How do I change my plan?</h3>
              <p className="text-gray-600">
                You can upgrade your plan at any time. Downgrades will take effect at the end of your current billing period.
              </p>
            </div>
          </div>
        </div>
        
        {/* Contact Support */}
        <div className="mt-16 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-8 md:p-10 md:flex md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Need help with your subscription?</h2>
              <p className="mt-2 max-w-3xl text-indigo-100">
                Our support team is ready to assist you with any questions about plans, billing, or features.
              </p>
            </div>
            <div className="mt-4 md:mt-0 md:ml-6 shrink-0">
              <a
                href="mailto:support@cryptique.io"
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-indigo-600 bg-white hover:bg-indigo-50"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Billing Details Modal */}
      <BillingDetailsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveBillingDetails}
      />
    </div>
  );
};

export default Billing;
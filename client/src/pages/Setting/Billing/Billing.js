import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import StripeSubscription from "./StripeSubscription";
import axios from "axios";
import { Link } from "react-router-dom";

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
  
  useEffect(() => {
    const loadTeam = async () => {
      try {
        setLoading(true);
        
        // Get team name from localStorage
        const teamName = localStorage.getItem("selectedTeam");
        
        if (!teamName) {
          setError("No team selected. Please select a team first.");
          setLoading(false);
          return;
        }
        
        try {
          // Try to get actual team data from API if possible
          // This is just a placeholder - implement actual API call based on your backend
          // const response = await axios.get(`/api/teams/by-name/${teamName}`);
          // setCurrentTeam(response.data);
          
          // For now, simulate a team object
          const teamObj = {
            name: teamName,
            _id: localStorage.getItem("selectedTeamId") || "temp-id", // Try to get a real ID if available
            subscription: {
              plan: "free",
              status: "inactive"
            }
          };
          
          setCurrentTeam(teamObj);
          setError(null);
        } catch (apiError) {
          console.error("Error fetching team:", apiError);
          
          // Fallback to basic team object
          const teamObj = {
            name: teamName,
            _id: "temp-id",
            subscription: {
              plan: "free",
              status: "inactive"
            }
          };
          
          setCurrentTeam(teamObj);
          setError("Unable to fetch complete team details. Some functionality may be limited.");
        }
      } catch (err) {
        console.error("Error loading team:", err);
        setError("Failed to load team information.");
      } finally {
        setLoading(false);
      }
    };
    
    loadTeam();
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSaveBillingDetails = (data) => {
    setBillingDetails(data);
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
    <div className="p-6">
      {/* Error notification if present */}
      {error && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
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
            </div>
          </div>
        </div>
      )}

      {/* Plan management section */}
      <div className="mt-6 mb-10">
        <div className="text-lg font-semibold flex flex-wrap items-center gap-4 md:gap-6 px-4 text-center">
          <span className="whitespace-nowrap">Plan management</span>
          <div className="bg-indigo-900 text-white p-4 rounded-md w-full sm:w-auto flex justify-center items-center text-center break-words">
            <p className="text-sm md:text-base break-words">
              {currentTeam?.name || 'No Team Selected'} - {currentTeam?.subscription?.status || 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Left card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Billing details</h2>
          
          <p className="text-sm text-gray-600 mb-4">
            To receive a VAT invoice, you must provide your company's details.
          </p>
          
          <button 
            className="px-4 py-2 border border-gray-300 rounded-md text-sm"
            onClick={openModal}
          >
            Add company details
          </button>
          
          {/* Display billing details if available */}
          {billingDetails && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm font-medium">{billingDetails.companyName}</p>
              <p className="text-sm text-gray-600">{billingDetails.address}</p>
              <p className="text-sm text-gray-600">
                {billingDetails.city}, {billingDetails.zipCode}
              </p>
              <p className="text-sm text-gray-600">{billingDetails.country}</p>
            </div>
          )}
        </div>
        
        {/* Right card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Billing & Payment</h2>
          
          <div className="flex justify-between border-b pb-2 mb-2">
            <span className="text-sm text-gray-600">Subscription end date</span>
            <span className="text-sm">
              {currentTeam?.subscription?.endDate 
                ? new Date(currentTeam.subscription.endDate).toLocaleDateString() 
                : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between border-b pb-2 mb-2">
            <span className="text-sm text-gray-600">Current Plan</span>
            <span className="text-sm">
              {currentTeam?.subscription?.plan 
                ? currentTeam.subscription.plan.charAt(0).toUpperCase() + currentTeam.subscription.plan.slice(1)
                : 'Free'}
            </span>
          </div>
          {currentTeam?._id === "temp-id" && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200 text-sm text-yellow-800">
              You need to select a valid team to subscribe to a plan.
              <Link to="/teams" className="block mt-2 text-blue-600 hover:underline">
                Go to Teams Page
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Stripe Subscription Management */}
      <div className="bg-white rounded-lg shadow overflow-hidden p-6">
        {currentTeam && (
          <StripeSubscription teamId={currentTeam._id} currentTeam={currentTeam} />
        )}
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
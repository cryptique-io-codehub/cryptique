import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import StripeSubscription from "./StripeSubscription";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTeam } from "../../../context/teamContext";
import { CircularProgress, Alert, Button, Paper } from '@mui/material';

// Billing Details Modal Component
const BillingDetailsModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    email: "",
    tax_number: "",
    isRegisteredCompany: false
  });

  // Load initial data when the modal opens or initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        line1: initialData.line1 || initialData.address || "",
        line2: initialData.line2 || "",
        city: initialData.city || "",
        state: initialData.state || "",
        postal_code: initialData.postal_code || initialData.zipCode || "",
        country: initialData.country || "",
        email: initialData.email || "",
        tax_number: initialData.tax_number || "",
        isRegisteredCompany: initialData.isRegisteredCompany || false
      });
    }
  }, [initialData, isOpen]);

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
      name: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      email: "",
      tax_number: "",
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
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Company name*
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address*
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="tax_number" className="block text-sm font-medium text-gray-700 mb-1">
              Company tax number
            </label>
            <input
              type="text"
              id="tax_number"
              name="tax_number"
              value={formData.tax_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="line1" className="block text-sm font-medium text-gray-700 mb-1">
              Address line 1*
            </label>
            <input
              type="text"
              id="line1"
              name="line1"
              value={formData.line1}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="line2" className="block text-sm font-medium text-gray-700 mb-1">
              Address line 2
            </label>
            <input
              type="text"
              id="line2"
              name="line2"
              value={formData.line2}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State/Province*
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            <div className="w-1/2">
              <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                Zip/Postal Code*
              </label>
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div className="w-1/2">
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Country*
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

const PLAN_LIMITS = {
  OFFCHAIN: {
    name: "Off-chain",
    websites: 1,
    contracts: 0,
    apiCalls: 0,
    members: 1,
    description: "Off-chain analytics only. 1 website, no smart contracts, 1 team member."
  },
  BASIC: {
    name: "Basic",
    websites: 2,
    contracts: 1,
    apiCalls: 40000,
    members: 2,
    description: "Full app, 2 websites, 1 smart contract, 40,000 API calls/month, 2 team members."
  },
  PRO: {
    name: "Pro",
    websites: 3,
    contracts: 3,
    apiCalls: 150000,
    members: 3,
    description: "Full app, 3 websites, 3 smart contracts, 150,000 API calls/month, 3 team members."
  },
  ENTERPRISE: {
    name: "Enterprise",
    websites: "Custom",
    contracts: "Custom",
    apiCalls: "Custom",
    members: "Custom",
    description: "Custom plan. Contact us for details."
  }
};

const getPlanKey = (plan) => {
  if (!plan) return "OFFCHAIN";
  const key = plan.toUpperCase();
  if (PLAN_LIMITS[key]) return key;
  return "OFFCHAIN";
};

const fetchWebsites = async (teamId) => {
  try {
    const cached = sessionStorage.getItem("preloadedWebsites");
    if (cached) return JSON.parse(cached);
    const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    const res = await axios.get(`${API_URL}/api/website/team/${teamId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.data.websites || [];
  } catch {
    return [];
  }
};
const fetchContracts = async (teamId) => {
  try {
    const cached = sessionStorage.getItem("preloadedContracts");
    if (cached) return JSON.parse(cached);
    const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    const res = await axios.get(`${API_URL}/api/contracts/team/${teamId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.data.contracts || [];
  } catch {
    return [];
  }
};
const fetchMembers = async (teamName) => {
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    const res = await axios.get(`${API_URL}/api/team/${teamName._id || teamName}/members`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.data || [];
  } catch (error) {
    console.error("Error fetching members:", error);
    return [];
  }
};

const fetchSubscription = async (teamId) => {
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    const res = await axios.get(`${API_URL}/api/stripe/subscription/${teamId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.data;
  } catch {
    return null;
  }
};

const fetchBillingDetails = async (teamId) => {
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    const res = await axios.get(`${API_URL}/api/team/${teamId}/billing-address`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching billing details:", error);
    return null;
  }
};

const saveBillingDetails = async (teamId, billingData) => {
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    const res = await axios.post(`${API_URL}/api/team/${teamId}/billing-address`, billingData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.data;
  } catch (error) {
    console.error("Error saving billing details:", error);
    throw error;
  }
};

const Billing = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billingDetails, setBillingDetails] = useState(null);
  const { selectedTeam, isLoading: teamLoading } = useTeam();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [usage, setUsage] = useState({ websites: 0, contracts: 0, members: 0 });
  const [planKey, setPlanKey] = useState("OFFCHAIN");
  const [subscription, setSubscription] = useState(null);
  const navigate = useNavigate();
  
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
          const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
          
          const response = await axios.get(`${API_URL}/api/stripe/checkout-status?session_id=${sessionId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
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
    const loadData = async () => {
      try {
        if (!selectedTeam || !selectedTeam._id) {
          setLoading(false);
          return;
        }
        setLoading(true);
        // Fetch usage
        const [websites, contracts, members, sub, billingData] = await Promise.all([
          fetchWebsites(selectedTeam._id),
          fetchContracts(selectedTeam._id),
          fetchMembers(selectedTeam),
          fetchSubscription(selectedTeam._id),
          fetchBillingDetails(selectedTeam._id)
        ]);
        setUsage({
          websites: websites.length,
          contracts: contracts.length,
          members: members.length
        });
        setSubscription(sub);
        setPlanKey(getPlanKey(sub?.subscription?.plan));
        
        // Set billing details if available
        if (billingData) {
          setBillingDetails(billingData);
        }
      } catch (e) {
        setError('Failed to load usage or subscription info.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedTeam]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSaveBillingDetails = async (data) => {
    try {
      if (!selectedTeam || !selectedTeam._id) {
        setError('No team selected. Cannot save billing details.');
        return;
      }
      
      // Save to state
      setBillingDetails(data);
      
      // Save to database
      await saveBillingDetails(selectedTeam._id, data);
      
      // Show success message
      setSuccessMessage('Billing details saved successfully');
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setError('Failed to save billing details to the database.');
      console.error('Error saving billing details:', error);
    }
  };

  const handleDismissMessage = () => {
    setSuccessMessage(null);
    setError(null);
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  if (loading || teamLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert severity="error">{error}</Alert>
      </div>
    );
  }

  if (!selectedTeam || !selectedTeam._id) {
    return (
      <div className="p-4">
        <Alert severity="warning">Please select a team to view billing information.</Alert>
      </div>
    );
  }

  const planLimits = PLAN_LIMITS[planKey];

  // Helper function to safely format dates or return N/A for invalid dates
  const formatSubscriptionDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date value:', dateString);
        return 'N/A';
      }
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <Button variant="contained" color="primary" onClick={() => navigate(`/${selectedTeam.name}/settings/pricing`)}>
          View all pricing plans
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {/* Active Subscription */}
      <Paper elevation={2} className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-2">Active Subscription</h2>
        {subscription ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Plan</div>
              <div className="font-medium">{planLimits.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium">{subscription.subscription.status}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Billing Period</div>
              <div className="font-medium">{subscription.subscription.billingCycle || 'Monthly'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Current Period</div>
              <div className="font-medium">
                {formatSubscriptionDate(subscription.subscription.currentPeriodStart)} - {formatSubscriptionDate(subscription.subscription.currentPeriodEnd)}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-500">Add-ons</div>
              <div className="font-medium">{subscription.subscription.addons?.some(a => a.name === 'cq_intelligence' && a.active) ? 'CQ Intelligence' : 'None'}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No active subscription found.</div>
        )}
      </Paper>

      {/* Usage & Limits */}
      <Paper elevation={2} className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-2">Usage & Limits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Websites</div>
            <div className="font-medium">{usage.websites} / {planLimits.websites}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Smart Contracts</div>
            <div className="font-medium">{planLimits.contracts === 0 ? 'N/A' : `${usage.contracts} / ${planLimits.contracts}`}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Team Members</div>
            <div className="font-medium">{usage.members} / {planLimits.members}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Explorer API Calls</div>
            <div className="font-medium">{planLimits.apiCalls === 0 ? 'N/A' : `${planLimits.apiCalls} / mo`}</div>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-2">Plan: {planLimits.description}</div>
      </Paper>

      {/* Billing Details */}
      <Paper elevation={2} className="p-6">
        <h2 className="text-xl font-semibold mb-4">Billing Details</h2>
        {billingDetails ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Company Name</p>
                <p className="font-medium">{billingDetails.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{billingDetails.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tax Number</p>
                <p className="font-medium">{billingDetails.tax_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{billingDetails.line1} {billingDetails.line2}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">City</p>
                <p className="font-medium">{billingDetails.city}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">State</p>
                <p className="font-medium">{billingDetails.state}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Zip/Postal Code</p>
                <p className="font-medium">{billingDetails.postal_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Country</p>
                <p className="font-medium">{billingDetails.country}</p>
              </div>
          </div>
        ) : (
          <Button variant="contained" color="primary" onClick={() => setIsModalOpen(true)}>
            Add Billing Details
          </Button>
        )}
        {billingDetails && (
          <Button onClick={() => setIsModalOpen(true)} className="mt-4 text-blue-600 hover:text-blue-800">
            Edit Details
          </Button>
        )}
      </Paper>

      <BillingDetailsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveBillingDetails}
        initialData={billingDetails}
      />
    </div>
  );
};

export default Billing;
import React, { useState, useEffect } from "react";
import { X, CreditCard } from "lucide-react";
import StripeSubscription from "./StripeSubscription";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTeam } from "../../../context/teamContext";
import { 
  CircularProgress, 
  Alert, 
  Button, 
  Paper, 
  Typography, 
  Box, 
  Chip, 
  LinearProgress,
  Grid
} from '@mui/material';
import { createPortalSession } from '../../../services/stripeService';

// Style definitions for futuristic theme
const styles = {
  headingFont: { 
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 600
  },
  bodyFont: { 
    fontFamily: "'Poppins', sans-serif" 
  },
  primaryColor: "#1d0c46", // Deep purple
  accentColor: "#caa968",  // Gold accent
  futuristicGradient: "linear-gradient(135deg, #1d0c46 0%, #3a1d8a 50%, #1d0c46 100%)",
  activeGlow: "0 0 15px rgba(202, 169, 104, 0.6)",
  cardHover: {
    transform: 'translateY(-8px)',
    boxShadow: '0 10px 25px rgba(29, 12, 70, 0.2)',
    transition: 'all 0.3s ease-in-out'
  },
  glassmorphism: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  },
  statusChipColors: {
    active: '#10B981', // Green
    pastdue: '#F59E0B', // Amber
    cancelled: '#EF4444', // Red
    inactive: '#6B7280', // Gray
    trial: '#3B82F6' // Blue
  }
};

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
    websites: 5,
    contracts: 5,
    apiCalls: 150000,
    members: 5,
    description: "Full app, 5 websites, 5 smart contracts, 150,000 API calls/month, 5 team members."
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
    <Box 
      className="container mx-auto px-4 py-8"
      sx={{ 
        maxWidth: '1100px',
        background: 'radial-gradient(circle at 50% 50%, rgba(29, 12, 70, 0.03), transparent)',
        ...styles.bodyFont
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: {xs: 'column', md: 'row'}, 
          alignItems: {xs: 'flex-start', md: 'center'}, 
          justifyContent: 'space-between', 
          mb: 4,
          gap: 2
        }}
      >
        <Typography 
          variant="h4" 
          sx={{ 
            ...styles.headingFont,
            background: styles.futuristicGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: {xs: 2, md: 0}
          }}
        >
          Billing & Subscription
        </Typography>
        
        <Button 
          variant="contained" 
          onClick={() => navigate(`/${selectedTeam.name}/settings/pricing`)}
          sx={{
            background: styles.futuristicGradient,
            px: 3,
            py: 1.2,
            borderRadius: '30px',
            '&:hover': {
              boxShadow: styles.activeGlow
            }
          }}
        >
          View All Pricing Plans
        </Button>
      </Box>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            borderRadius: '10px', 
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}
        >
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3, 
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}
        >
          {successMessage}
        </Alert>
      )}

      {/* Active Subscription */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 4, 
          p: 4, 
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" sx={{ ...styles.headingFont, color: styles.primaryColor }}>
            Active Subscription
          </Typography>
          {subscription && (
            <Chip 
              label={subscription.subscription.status.toUpperCase()} 
              sx={{ 
                bgcolor: styles.statusChipColors[subscription.subscription.status.toLowerCase()] || styles.statusChipColors.inactive,
                color: 'white',
                fontWeight: 600,
                borderRadius: '20px',
                px: 1
              }}
            />
          )}
        </Box>
        
        {subscription ? (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                    Plan
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: styles.primaryColor }}>
                    {planLimits.name}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                    Billing Cycle
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: styles.primaryColor }}>
                    {subscription.subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                    Current Period
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: styles.primaryColor }}>
                    {formatSubscriptionDate(subscription.subscription.currentPeriodStart)} - {formatSubscriptionDate(subscription.subscription.currentPeriodEnd)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, mb: 4 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Add-ons
              </Typography>
              {subscription.subscription.addons?.some(a => a.name === 'cq_intelligence' && a.active) ? (
                <Chip 
                  label="CQ Intelligence" 
                  sx={{ 
                    bgcolor: 'rgba(202, 169, 104, 0.1)', 
                    color: styles.accentColor,
                    fontWeight: 600,
                    borderRadius: '12px',
                    border: `1px solid ${styles.accentColor}`
                  }}
                />
              ) : (
                <Typography variant="body1" sx={{ color: 'text.primary' }}>None</Typography>
              )}
            </Box>
            
            <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: styles.primaryColor }}>
                Subscription Management
              </Typography>
              
              <Button 
                variant="contained" 
                onClick={async () => {
                  try {
                    setLoading(true);
                    const hostUrl = window.location.origin;
                    
                    try {
                      // First attempt: Try using the createPortalSession via teamId
                      const session = await createPortalSession(
                        selectedTeam._id,
                        `${hostUrl}/${selectedTeam.name}/settings/billing`
                      );
                      
                      window.location.href = session.url;
                    } catch (teamErr) {
                      console.error('Error with team-based portal session, trying subscription-based approach:', teamErr);
                      
                      // Second attempt: Try using the subscription ID directly
                      if (subscription && subscription.subscription && subscription.subscription.id) {
                        const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
                        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
                        
                        const response = await axios.post(`${API_URL}/api/stripe/create-portal-session-by-subscription`, {
                          subscriptionId: subscription.subscription.id,
                          returnUrl: `${hostUrl}/${selectedTeam.name}/settings/billing`
                        }, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        window.location.href = response.data.url;
                      } else {
                        throw new Error('No subscription ID available for fallback');
                      }
                    }
                  } catch (err) {
                    console.error('Error opening Stripe portal:', err);
                    setError('Failed to open billing portal. Please try again later.');
                    setLoading(false);
                  }
                }}
                startIcon={<CreditCard />}
                disabled={loading}
                fullWidth
                sx={{
                  background: styles.futuristicGradient,
                  borderRadius: '8px',
                  py: 1.5,
                  maxWidth: '500px',
                  '&:hover': {
                    boxShadow: styles.activeGlow
                  }
                }}
              >
                Manage Subscription in Stripe Portal
              </Button>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', opacity: 0.8 }}>
                The Stripe Portal allows you to update payment methods, view invoices, and manage your subscription details.
                {subscription?.subscription?.id && (
                  <Box sx={{ mt: 1.5, p: 2, bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                    <strong>Note:</strong> The Stripe Portal settings need to be configured first. 
                    If you're the administrator, please <a 
                      href="https://dashboard.stripe.com/settings/billing/portal" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      configure the Customer Portal in Stripe
                    </a>.
                  </Box>
                )}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            py: 4 
          }}>
            <Typography variant="body1" sx={{ mb: 2, textAlign: 'center', color: 'text.secondary' }}>
              No active subscription found.
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => navigate(`/${selectedTeam.name}/settings/pricing`)}
              sx={{
                background: styles.futuristicGradient,
                px: 4,
                py: 1.2,
                borderRadius: '30px',
                '&:hover': {
                  boxShadow: styles.activeGlow
                }
              }}
            >
              Subscribe to a Plan
            </Button>
          </Box>
        )}
      </Paper>

      {/* Usage & Limits */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 4, 
          p: 4, 
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        <Typography variant="h5" sx={{ ...styles.headingFont, color: styles.primaryColor, mb: 3 }}>
          Usage & Limits
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Websites</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {usage.websites} / {planLimits.websites}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(100, (usage.websites / planLimits.websites) * 100)}
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  bgcolor: 'rgba(29, 12, 70, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: styles.futuristicGradient
                  }
                }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Smart Contracts</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {planLimits.contracts === 0 ? 'N/A' : `${usage.contracts} / ${planLimits.contracts}`}
                </Typography>
              </Box>
              {planLimits.contracts > 0 && (
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(100, (usage.contracts / planLimits.contracts) * 100)}
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'rgba(29, 12, 70, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: styles.futuristicGradient
                    }
                  }}
                />
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Team Members</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {usage.members} / {planLimits.members}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(100, (usage.members / planLimits.members) * 100)}
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  bgcolor: 'rgba(29, 12, 70, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: styles.futuristicGradient
                  }
                }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Explorer API Calls</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {planLimits.apiCalls === 0 ? 'N/A' : `${planLimits.apiCalls.toLocaleString()} / mo`}
                </Typography>
              </Box>
              {planLimits.apiCalls > 0 && (
                <LinearProgress 
                  variant="determinate" 
                  value={50} // Placeholder for API usage, would need actual data
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'rgba(29, 12, 70, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: styles.futuristicGradient
                    }
                  }}
                />
              )}
            </Box>
          </Grid>
        </Grid>
        
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          borderRadius: '8px', 
          bgcolor: 'rgba(29, 12, 70, 0.03)', 
          border: '1px solid rgba(29, 12, 70, 0.05)' 
        }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            <strong>Plan Details:</strong> {planLimits.description}
          </Typography>
        </Box>
      </Paper>

      {/* Billing Details */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, 
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        <Typography variant="h5" sx={{ ...styles.headingFont, color: styles.primaryColor, mb: 3 }}>
          Billing Details
        </Typography>
        
        {billingDetails ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Company Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{billingDetails.name}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Email</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{billingDetails.email}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Tax Number</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {billingDetails.tax_number || 'Not provided'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Address</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {billingDetails.line1} {billingDetails.line2}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>City</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{billingDetails.city}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>State</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{billingDetails.state}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Country</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{billingDetails.country}</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: { xs: 'center', md: 'flex-end' },
                mt: 2 
              }}>
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  sx={{ 
                    color: styles.primaryColor,
                    '&:hover': {
                      backgroundColor: 'rgba(29, 12, 70, 0.05)'
                    }
                  }}
                >
                  Edit Billing Details
                </Button>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            py: 4 
          }}>
            <Typography variant="body1" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
              No billing details have been provided yet.
            </Typography>
            <Button 
              variant="outlined"
              onClick={() => setIsModalOpen(true)}
              sx={{
                borderColor: styles.primaryColor,
                color: styles.primaryColor,
                borderRadius: '8px',
                px: 3,
                '&:hover': {
                  borderColor: styles.primaryColor,
                  backgroundColor: 'rgba(29, 12, 70, 0.05)'
                }
              }}
            >
            Add Billing Details
          </Button>
          </Box>
        )}
      </Paper>

      <BillingDetailsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveBillingDetails}
        initialData={billingDetails}
      />
    </Box>
  );
};

export default Billing;
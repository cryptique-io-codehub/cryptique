import React, { useState, useEffect } from "react";
import { Button, Card, CardContent, CardActions, Chip, Typography, Grid, Paper, Divider, Box, ToggleButton, ToggleButtonGroup, FormControl, InputLabel, Select, MenuItem, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, CircularProgress } from "@mui/material";
import { Check, Close, Psychology, Teams } from '@mui/icons-material';
import { useNavigate } from "react-router-dom";
import { useTeam } from "../context/teamContext";
import axiosInstance from "../axiosInstance";
import { createCheckoutSession } from "../services/stripeService";

// Style definitions
const styles = {
  headingFont: { 
    fontFamily: "'Montserrat', sans-serif" 
  },
  bodyFont: { 
    fontFamily: "'Poppins', sans-serif" 
  },
  primaryColor: "#1d0c46",
  accentColor: "#caa968",
  primaryGradient: "linear-gradient(135deg, #1d0c46 0%, #2a1063 100%)",
  accentGradient: "linear-gradient(135deg, #caa968 0%, #e0c088 100%)",
  futuristicGradient: "linear-gradient(135deg, #1d0c46 0%, #3a1d8a 50%, #1d0c46 100%)"
};

const plans = [
  {
    id: "offchain",
    name: "Off-chain",
    price: 49,
    annualPrice: 539,
    description: "Off-chain analytics for individuals or small businesses needing basic insights.",
    mostPopular: false,
    features: {
      websites: "1 website",
      extraUsers: "No extra users",
      smartContracts: "No smart contracts",
      apiCalls: "N/A",
      userJourney: "Limited tracking",
      walletBreakdown: "Not available",
      prioritySupport: false,
      blockchains: "Limited",
      dataExport: false,
      customEvents: "Not available",
      campaigns: "Not available"
    }
  },
  {
    id: "basic",
    name: "Basic",
    price: 349,
    annualPrice: 3799,
    description: "Full app access with essential limits for growing teams.",
    mostPopular: false,
    features: {
      websites: "2 websites",
      extraUsers: "2 team members",
      smartContracts: "1 smart contract",
      apiCalls: "40,000 / month",
      userJourney: "Up to 10,000 journeys",
      walletBreakdown: "Up to 10,000 wallets",
      prioritySupport: false,
      blockchains: "All supported",
      dataExport: false,
      customEvents: "5 events",
      campaigns: "5 campaigns"
    }
  },
  {
    id: "pro",
    name: "Pro",
    price: 799,
    annualPrice: 8599,
    description: "Full access and higher limits for advanced analytics teams.",
    mostPopular: true,
    features: {
      websites: "3 websites",
      extraUsers: "3 team members",
      smartContracts: "3 smart contracts",
      apiCalls: "150,000 / month",
      userJourney: "Up to 50,000 journeys",
      walletBreakdown: "Up to 100,000 wallets",
      prioritySupport: true,
      blockchains: "All supported",
      dataExport: true,
      customEvents: "Unlimited",
      campaigns: "Unlimited"
    }
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    annualPrice: null,
    description: "Tailored solutions for organizations with unique needs.",
    mostPopular: false,
    features: {
      websites: "Custom",
      extraUsers: "Custom",
      smartContracts: "Custom",
      apiCalls: "Custom",
      userJourney: "Custom",
      walletBreakdown: "Custom",
      prioritySupport: true,
      blockchains: "All supported",
      dataExport: true,
      customEvents: "Unlimited",
      campaigns: "Unlimited"
    }
  }
];

const cqIntelligence = {
  name: "CQ Intelligence",
  description: "AI-powered analytics and insights to supercharge your decision making. Leverage cutting-edge algorithms for predictive analytics and deeper blockchain intelligence.",
  price: 299,
  annualPrice: 3199,
  comingSoon: false
};

const comparisonRows = [
  { label: "Websites", values: ["1 website", "2 websites", "3 websites", "Custom"] },
  { label: "Team Members", values: ["1 (owner only)", "2 team members", "3 team members", "Custom"] },
  { label: "Smart Contracts", values: ["N/A", "1 smart contract", "3 smart contracts", "Custom"] },
  { label: "Explorer API Calls", values: ["N/A", "40,000 / month", "150,000 / month", "Custom"] },
  { label: "User Journey Tracking", values: ["Limited", "Up to 10,000", "Up to 50,000", "Custom"] },
  { label: "Wallet-level Breakdown", values: ["N/A", "Up to 10,000 wallets", "Up to 100,000 wallets", "Custom"] },
  { label: "Priority Support", values: [false, false, true, true] },
  { label: "Supported Blockchains", values: ["Limited", "All supported", "All supported", "All supported"] },
  { label: "Data Export", values: [false, false, true, true] },
  { label: "Custom Events", values: ["N/A", "5 events", "Unlimited", "Unlimited"] },
  { label: "Campaigns", values: ["N/A", "5 campaigns", "Unlimited", "Unlimited"] }
];

// Add these functions to handle billing details
const fetchBillingDetails = async (teamId, axiosInstance) => {
  try {
    // Use the provided axiosInstance which should already have the token in its configuration
    const response = await axiosInstance.get(`/team/${teamId}/billing-address`);
    return response.data;
  } catch (error) {
    console.error("Error fetching billing details:", error);
    return null;
  }
};

const saveBillingDetails = async (teamId, billingData, axiosInstance) => {
  try {
    // Use the provided axiosInstance which should already have the token in its configuration
    const response = await axiosInstance.post(`/team/${teamId}/billing-address`, billingData);
    return response.data;
  } catch (error) {
    console.error("Error saving billing details:", error);
    throw error;
  }
};

// Billing Address Form Component
const BillingAddressForm = ({ billingAddress, setBillingAddress }) => {
  const [formData, setFormData] = useState(billingAddress || {
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US"
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setBillingAddress(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            name="name"
            label="Full Name / Company Name"
            value={formData.name}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            name="line1"
            label="Address Line 1"
            value={formData.line1}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            name="line2"
            label="Address Line 2 (Optional)"
            value={formData.line2 || ""}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            name="city"
            label="City"
            value={formData.city}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            name="state"
            label="State/Province"
            value={formData.state}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            name="postalCode"
            label="Postal Code"
            value={formData.postalCode}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            name="country"
            label="Country"
            value={formData.country}
            onChange={handleChange}
          />
        </Grid>
      </Grid>
    </form>
  );
};

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState("yearly");
  const navigate = useNavigate();
  const { selectedTeam, isLoading: teamLoading } = useTeam();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New state variables for confirmation
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [billingAddress, setBillingAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Fetch available teams for the user
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        // Get user token from localStorage
        const token = localStorage.getItem("token");
        
        if (!token) {
          setError("You must be logged in to view pricing for your teams.");
          setLoading(false);
          return;
        }

        // Use the selectedTeam from context if available
        if (selectedTeam) {
          setSelectedTeamId(selectedTeam._id);
          setTeams([selectedTeam]);
          
          // Try to load saved billing address for team
          try {
            const billingData = await fetchBillingDetails(selectedTeam._id, axiosInstance);
            if (billingData) {
              setBillingAddress(billingData);
            }
          } catch (err) {
            console.error("Error loading billing address:", err);
          }
          
          setLoading(false);
        } else {
          // Try to get teams from local storage first
          const storedTeams = localStorage.getItem("userTeams");
          if (storedTeams) {
            const parsedTeams = JSON.parse(storedTeams);
            setTeams(parsedTeams);
            if (parsedTeams.length > 0) {
              setSelectedTeamId(parsedTeams[0]._id);
              
              // Try to load saved billing address for the first team
              try {
                const billingData = await fetchBillingDetails(parsedTeams[0]._id, axiosInstance);
                if (billingData) {
                  setBillingAddress(billingData);
                }
              } catch (err) {
                console.error("Error loading billing address:", err);
              }
            }
            setLoading(false);
          } else {
            // If not available in local storage, fetch from API
            const response = await axiosInstance.get("/team/myteams");
            if (response.data && Array.isArray(response.data)) {
              setTeams(response.data);
              if (response.data.length > 0) {
                setSelectedTeamId(response.data[0]._id);
                
                // Try to load saved billing address for the first team
                try {
                  const billingData = await fetchBillingDetails(response.data[0]._id, axiosInstance);
                  if (billingData) {
                    setBillingAddress(billingData);
                  }
                } catch (err) {
                  console.error("Error loading billing address:", err);
                }
              }
            }
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error fetching teams:", err);
        setError("Failed to load your teams. Please try again later.");
        setLoading(false);
      }
    };

    fetchTeams();
  }, [selectedTeam]);

  const handleTeamChange = (event) => {
    setSelectedTeamId(event.target.value);
    
    // Try to load saved billing address for this team
    fetchBillingDetails(event.target.value, axiosInstance)
      .then(billingData => {
        if (billingData) {
          setBillingAddress(billingData);
        } else {
          setBillingAddress(null);
        }
      })
      .catch(err => {
        console.error("Error loading billing address for team:", err);
        setBillingAddress(null);
      });
  };

  const handleSelectPlan = (planId) => {
    if (!selectedTeamId) {
      setError("Please select a team before choosing a plan.");
      return;
    }
    
    // Store selected plan ID
    setSelectedPlanId(planId);
    
    // Check if we have billing address
    if (!billingAddress) {
      setShowAddressForm(true);
    } else {
      // We have billing address, show it in the confirmation
      setShowAddressForm(false);
    }
    
    console.log("Opening plan confirmation dialog with billing address:", billingAddress);
    
    // Open confirmation dialog
    setConfirmDialogOpen(true);
  };
  
  const handleConfirmPlan = async () => {
    try {
      if (!selectedTeamId) {
        setError("Please select a team before proceeding to payment.");
        return;
      }
      
      // Validate the billing address
      if (!billingAddress || !billingAddress.name || !billingAddress.line1 || !billingAddress.city) {
        setError("Please provide a complete billing address.");
        setShowAddressForm(true);
        return;
      }
      
      // Save billing address to team if needed
      if (billingAddress) {
        try {
          await saveBillingDetails(selectedTeamId, billingAddress, axiosInstance);
        } catch (err) {
          console.error("Error saving billing address:", err);
          // Continue even if saving address fails
        }
      }
      
      // Close dialog
      setConfirmDialogOpen(false);
      
      // Create checkout session directly instead of navigating
      const teamName = teams.find(team => team._id === selectedTeamId)?.name;
      if (!teamName) {
        setError("Could not determine team name. Please try again.");
        return;
      }
      
      setLoading(true);
      
      // Get host URL for success/cancel redirects
      const hostUrl = window.location.origin;
      
      // Create checkout session with Stripe
      const session = await createCheckoutSession(
        selectedTeamId,
        selectedPlanId,
        `${hostUrl}/${teamName}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        `${hostUrl}/${teamName}/settings/billing?canceled=true`,
        billingCycle,
        billingAddress
      );
      
      // Redirect to Stripe Checkout
      window.location.href = session.url;
    } catch (err) {
      console.error("Error in confirmation process:", err);
      setError("There was an error processing your selection. Please try again.");
      setConfirmDialogOpen(false);
      setLoading(false);
    }
  };

  const handleCancelPlan = () => {
    setConfirmDialogOpen(false);
    setShowAddressForm(false);
  };

  return (
    <div className="bg-white pb-16">
      {/* Header */}
      <div className="max-w-4xl mx-auto pt-4 pb-4 px-4">
        <Typography variant="h5" style={{color: styles.accentColor, fontWeight: 600, ...styles.headingFont}} className="mb-1">Pricing</Typography>
        <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{...styles.headingFont, color: styles.primaryColor}}>
          Unlock the full potential of Web3 analytics
        </h1>
        <div className="text-gray-600 mb-4 text-sm">
          For enterprise needs or custom pricing inquiries, please contact us at 
          <Button 
            size="small" 
            variant="outlined" 
            sx={{
              textTransform:'none', 
              fontSize:'0.8rem', 
              ml:1, 
              mr:1, 
              borderColor: styles.accentColor,
              color: styles.accentColor,
              '&:hover': {
                borderColor: styles.accentColor,
                backgroundColor: 'rgba(202, 169, 104, 0.04)'
              }
            }}
          >
            sales@cryptique.io
          </Button>
        </div>
      </div>

      {/* Team Selection */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <Paper elevation={1} sx={{ p: 3, borderLeft: `4px solid ${styles.primaryColor}` }}>
          <Typography variant="h6" sx={{...styles.headingFont, color: styles.primaryColor, mb: 2}}>
            Select a Team
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}
          
          {loading || teamLoading ? (
            <Typography variant="body2">Loading teams...</Typography>
          ) : teams.length === 0 ? (
            <div>
              <Alert severity="info" sx={{ mb: 2 }}>
                You need to create a team before purchasing a plan.
              </Alert>
              <Button 
                variant="contained" 
                onClick={() => navigate('/settings/teamsSection')}
                sx={{
                  backgroundColor: styles.primaryColor,
                  '&:hover': { backgroundColor: '#2c1566' }
                }}
              >
                Create a Team
              </Button>
            </div>
          ) : (
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="team-select-label">Team</InputLabel>
              <Select
                labelId="team-select-label"
                id="team-select"
                value={selectedTeamId}
                onChange={handleTeamChange}
                label="Team"
                sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: styles.primaryColor } }}
              >
                {teams.map((team) => (
                  <MenuItem key={team._id} value={team._id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                The selected plan will be applied to this team. Plans are purchased per team.
              </Typography>
            </FormControl>
          )}
        </Paper>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="max-w-4xl mx-auto flex items-center gap-4 px-4 mb-6">
        <ToggleButtonGroup
          value={billingCycle}
          exclusive
          onChange={(_, v) => v && setBillingCycle(v)}
          sx={{ 
            background: '#f8f8ff', 
            borderRadius: 2,
            '& .MuiToggleButton-root': {
              color: styles.primaryColor,
              '&.Mui-selected': {
                backgroundColor: styles.primaryColor,
                color: 'white',
                '&:hover': {
                  backgroundColor: styles.primaryColor,
                }
              }
            }
          }}
        >
          <ToggleButton value="yearly" sx={{ fontWeight: 600, px: 3 }}>
            Yearly <Chip label="Save 18%" size="small" sx={{ ml: 1, fontWeight: 700, backgroundColor: styles.accentColor, color: 'white' }} />
          </ToggleButton>
          <ToggleButton value="monthly" sx={{ fontWeight: 600, px: 3 }}>
            Monthly
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      {/* Plans */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 px-4 mb-12">
        {plans.map((plan, idx) => (
          <Card 
            key={plan.id} 
            variant="outlined" 
            sx={{ 
              borderColor: plan.mostPopular ? styles.accentColor : 'rgba(0,0,0,0.12)', 
              borderWidth: plan.mostPopular ? 2 : 1, 
              position: 'relative', 
              minHeight: 320,
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.1)'
              }
            }}
          >
            {plan.mostPopular && (
              <Chip 
                label="Most popular" 
                size="small" 
                sx={{ 
                  position: 'absolute', 
                  top: 16, 
                  right: 16, 
                  fontWeight: 700,
                  backgroundColor: styles.accentColor,
                  color: 'white'
                }} 
              />
            )}
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" className="mb-1" sx={{...styles.headingFont, fontWeight: 600}}>
                {plan.name}
              </Typography>
              <Typography variant="h4" sx={{color: styles.primaryColor, fontWeight: 700, ...styles.headingFont}} className="mb-2">
                {plan.price !== null ? (
                  billingCycle === "yearly"
                    ? `$${plan.annualPrice}/yr`
                    : `$${plan.price}/mo`
                ) : (
                  <span>Custom</span>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" className="mb-4 min-h-[48px]">{plan.description}</Typography>
              
              <div className="space-y-1.5 mb-4">
                <div className="flex items-start text-sm">
                  <Check sx={{color: styles.accentColor, fontSize: '1rem', mt: 0.5, mr: 1}} />
                  <span>{plan.features.websites}</span>
                </div>
                <div className="flex items-start text-sm">
                  <Check sx={{color: styles.accentColor, fontSize: '1rem', mt: 0.5, mr: 1}} />
                  <span>{plan.features.extraUsers}</span>
                </div>
                {plan.id !== 'offchain' && (
                  <div className="flex items-start text-sm">
                    <Check sx={{color: styles.accentColor, fontSize: '1rem', mt: 0.5, mr: 1}} />
                    <span>{plan.features.smartContracts}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 3 }}>
              {plan.id === "enterprise" ? (
                <Button 
                  variant="outlined" 
                  fullWidth 
                  onClick={() => window.location = 'mailto:sales@cryptique.io'} 
                  sx={{
                    borderColor: styles.primaryColor,
                    color: styles.primaryColor,
                    '&:hover': {
                      borderColor: styles.primaryColor,
                      backgroundColor: 'rgba(29, 12, 70, 0.04)'
                    }
                  }}
                >
                  Contact Us
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  fullWidth 
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={teams.length === 0 || !selectedTeamId}
                  sx={{
                    backgroundColor: styles.primaryColor,
                    '&:hover': {
                      backgroundColor: '#2c1566'
                    }
                  }}
                >
                  Select Plan
                </Button>
              )}
            </CardActions>
          </Card>
        ))}
      </div>

      {/* CQ Intelligence Add-on */}
      <div className="max-w-4xl mx-auto mb-12 px-4">
        <Card 
          sx={{ 
            position: 'relative',
            background: styles.futuristicGradient,
            backgroundSize: '200% 200%',
            animation: 'gradientFlow 15s ease infinite',
            color: 'white',
            overflow: 'hidden',
            borderRadius: 2,
            border: `1px solid ${styles.accentColor}`
          }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#FFFFFF" d="M47.1,-51.8C62.2,-36.7,76.5,-18.4,77.5,1.1C78.6,20.5,66.4,41.1,51.4,50.7C36.4,60.3,18.2,59,0.7,58.3C-16.8,57.5,-33.6,57.2,-48.2,47.7C-62.8,38.2,-75.2,19.1,-78.1,-3C-81,-25.1,-74.5,-50.1,-59.6,-65.3C-44.8,-80.4,-22.4,-85.5,-2,-83.5C18.4,-81.4,36.8,-79.3,47.1,-51.8Z" transform="translate(100 100)" />
            </svg>
          </div>
          <CardContent className="relative z-10 p-6">
            <div className="flex items-center mb-4">
              <Psychology sx={{ color: styles.accentColor, mr: 2, fontSize: '2rem' }} />
              <div>
                <Typography variant="h5" sx={{...styles.headingFont, fontWeight: 700}} className="mb-1">
                  {cqIntelligence.name}
                </Typography>
                <Typography variant="h6" className="opacity-90">
                  {billingCycle === "yearly" ? `$${cqIntelligence.annualPrice}/yr` : `$${cqIntelligence.price}/mo`}
                </Typography>
              </div>
            </div>
            <Typography variant="body1" className="mb-4 max-w-2xl">
              {cqIntelligence.description}
            </Typography>
            <div className="flex items-center space-x-4">
              <Button 
                variant="contained" 
                onClick={() => navigate('/settings/billing')}
                sx={{ 
                  backgroundColor: styles.accentColor,
                  color: styles.primaryColor,
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#d4b578'
                  }
                }}
              >
                Add to Subscription
              </Button>
              <Typography variant="caption" className="opacity-75">
                *Available as an add-on to any plan
              </Typography>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What's Included / Comparison Table */}
      <div className="max-w-6xl mx-auto px-4">
        <Typography variant="h5" className="mb-6" sx={{...styles.headingFont, fontWeight: 700, color: styles.primaryColor}}>
          Compare Features
        </Typography>
        <div className="overflow-x-auto bg-white rounded-lg shadow border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-4 px-4 font-semibold" style={{...styles.headingFont, color: styles.primaryColor}}>Features</th>
                {plans.map((plan, idx) => (
                  <th key={plan.id} className="text-center py-4 px-2 font-semibold" style={{...styles.headingFont}}>
                    <div className="mb-3">
                      <Button 
                        variant={plan.id === 'enterprise' ? 'outlined' : 'contained'} 
                        color="primary" 
                        size="small" 
                        onClick={() => plan.id === 'enterprise' ? window.location = 'mailto:sales@cryptique.io' : navigate('/settings/billing')}
                        sx={{
                          backgroundColor: plan.id !== 'enterprise' ? styles.primaryColor : 'transparent',
                          borderColor: styles.primaryColor,
                          color: plan.id !== 'enterprise' ? 'white' : styles.primaryColor,
                          '&:hover': {
                            backgroundColor: plan.id !== 'enterprise' ? '#2c1566' : 'rgba(29, 12, 70, 0.04)',
                            borderColor: styles.primaryColor
                          }
                        }}
                      >
                        {plan.id === 'enterprise' ? 'Contact Us' : 'Select Plan'}
                      </Button>
                    </div>
                    <div className="font-bold text-base" style={{color: styles.primaryColor}}>{plan.name}</div>
                    {plan.price !== null && (
                      <div className="text-sm text-gray-600 mt-1">
                        {billingCycle === "yearly"
                          ? `$${plan.annualPrice}/yr`
                          : `$${plan.price}/mo`}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-3 px-4 font-medium text-gray-700">{row.label}</td>
                  {row.values.map((val, idx) => (
                    <td key={idx} className="text-center py-3">
                      {val === true && <Check sx={{color: styles.accentColor}} fontSize="small" />}
                      {val === false && <Close color="disabled" fontSize="small" />}
                      {typeof val === 'string' && <span>{val}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <div className="text-center text-xs text-gray-400 mt-12">
        All prices in USD. Prices subject to change. Contact us for custom enterprise solutions.
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelPlan}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{...styles.headingFont, color: styles.primaryColor, fontWeight: 600}}>
          Confirm Subscription Details
        </DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            Please review your subscription details before proceeding to payment:
          </DialogContentText>
          
          <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(29, 12, 70, 0.04)', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Selected Team:</Typography>
            <Typography variant="body1">
              {teams.find(team => team._id === selectedTeamId)?.name || 'Unknown team'}
            </Typography>
            
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Selected Plan:</Typography>
            <Typography variant="body1">
              {plans.find(plan => plan.id === selectedPlanId)?.name || 'Unknown plan'} ({billingCycle === 'yearly' ? 'Annual' : 'Monthly'})
            </Typography>
            
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Price:</Typography>
            <Typography variant="body1">
              {billingCycle === 'yearly' 
                ? `$${plans.find(plan => plan.id === selectedPlanId)?.annualPrice || 0}/year` 
                : `$${plans.find(plan => plan.id === selectedPlanId)?.price || 0}/month`}
            </Typography>
          </Box>
          
          {showAddressForm ? (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Billing Address
              </Typography>
              <BillingAddressForm 
                billingAddress={billingAddress} 
                setBillingAddress={setBillingAddress} 
              />
            </>
          ) : billingAddress ? (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Billing Address:
              </Typography>
              <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(29, 12, 70, 0.04)', borderRadius: 1 }}>
                {billingAddress.name && <Typography variant="body2">{billingAddress.name}</Typography>}
                {billingAddress.line1 && <Typography variant="body2">{billingAddress.line1}</Typography>}
                {billingAddress.line2 && <Typography variant="body2">{billingAddress.line2}</Typography>}
                {billingAddress.city && <Typography variant="body2">
                  {billingAddress.city}, {billingAddress.state} {billingAddress.postalCode || billingAddress.postal_code}
                </Typography>}
                {billingAddress.country && <Typography variant="body2">{billingAddress.country}</Typography>}
              </Box>
              <Button 
                size="small" 
                onClick={() => setShowAddressForm(true)}
                sx={{ mb: 2 }}
              >
                Edit Address
              </Button>
            </>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'error.main' }}>
                Billing Address Required
              </Typography>
              <BillingAddressForm 
                billingAddress={billingAddress} 
                setBillingAddress={setBillingAddress} 
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCancelPlan} variant="outlined" disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmPlan} 
            variant="contained"
            disabled={!billingAddress || loading}
            sx={{ 
              backgroundColor: styles.primaryColor,
              '&:hover': { backgroundColor: '#2c1566' }
            }}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Required styles for animations */}
      <style jsx global>{`
        @keyframes gradientFlow {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        
        @font-face {
          font-family: 'Montserrat';
          src: url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
        }
        
        @font-face {
          font-family: 'Poppins';
          src: url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        }
      `}</style>
    </div>
  );
};

export default Pricing; 
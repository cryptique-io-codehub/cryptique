import React, { useState, useEffect } from "react";
import { Button, Card, CardContent, CardActions, Chip, Typography, Grid, Paper, Divider, Box, ToggleButton, ToggleButtonGroup, FormControl, InputLabel, Select, MenuItem, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, CircularProgress, FormControlLabel, Checkbox, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { Check, Close, Psychology } from '@mui/icons-material';
import { useNavigate } from "react-router-dom";
import { useTeam } from "../../context/teamContext";
import axiosInstance from "../../axiosInstance";
import { createCheckoutSession } from "../../services/stripeService";

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
  futuristicGradient: "linear-gradient(135deg, #1d0c46 0%, #3a1d8a 50%, #1d0c46 100%)",
  activeGlow: "0 0 15px rgba(202, 169, 104, 0.6)",
  cardHover: {
    transform: 'translateY(-8px)',
    boxShadow: '0 10px 25px rgba(29, 12, 70, 0.2)',
    transition: 'all 0.3s ease-in-out'
  }
};

const BillingAddressForm = ({ billingAddress, setBillingAddress, errors = {} }) => {
  const [formData, setFormData] = useState(billingAddress || {
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
    email: "",
    tax_number: "",
    isRegisteredCompany: false
  });

  // Update formData when billingAddress changes
  useEffect(() => {
    if (billingAddress) {
      setFormData({
        name: billingAddress.name || "",
        line1: billingAddress.line1 || "",
        line2: billingAddress.line2 || "",
        city: billingAddress.city || "",
        state: billingAddress.state || "",
        postal_code: billingAddress.postal_code || "",
        country: billingAddress.country || "US",
        email: billingAddress.email || "",
        tax_number: billingAddress.tax_number || "",
        isRegisteredCompany: billingAddress.isRegisteredCompany || false
      });
    }
  }, [billingAddress]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value
    };
    setFormData(newFormData);
    setBillingAddress(newFormData);
  };

  return (
    <div className="space-y-4">
      <div>
        <TextField
          label="Company Name"
          name="name"
          fullWidth
          value={formData.name || ''}
          onChange={handleInputChange}
          error={!!errors.name}
          helperText={errors.name || ''}
          required
        />
      </div>
      <div>
        <TextField
          label="Email Address"
          name="email"
          type="email"
          fullWidth
          value={formData.email || ''}
          onChange={handleInputChange}
          error={!!errors.email}
          helperText={errors.email || ''}
          required
        />
      </div>
      <div>
        <TextField
          label="Company Tax Number"
          name="tax_number"
          fullWidth
          value={formData.tax_number || ''}
          onChange={handleInputChange}
          error={!!errors.tax_number}
          helperText={errors.tax_number || ''}
        />
      </div>
      <div>
        <TextField
          label="Address Line 1"
          name="line1"
          fullWidth
          value={formData.line1 || ''}
          onChange={handleInputChange}
          error={!!errors.line1}
          helperText={errors.line1 || ''}
          required
        />
      </div>
      <div>
        <TextField
          label="Address Line 2"
          name="line2"
          fullWidth
          value={formData.line2 || ''}
          onChange={handleInputChange}
          error={!!errors.line2}
          helperText={errors.line2 || ''}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="City"
          name="city"
          fullWidth
          value={formData.city || ''}
          onChange={handleInputChange}
          error={!!errors.city}
          helperText={errors.city || ''}
          required
        />
        <TextField
          label="State/Province"
          name="state"
          fullWidth
          value={formData.state || ''}
          onChange={handleInputChange}
          error={!!errors.state}
          helperText={errors.state || ''}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="Postal Code"
          name="postal_code"
          fullWidth
          value={formData.postal_code || ''}
          onChange={handleInputChange}
          error={!!errors.postal_code}
          helperText={errors.postal_code || ''}
          required
        />
        <TextField
          label="Country"
          name="country"
          fullWidth
          select
          value={formData.country || ''}
          onChange={handleInputChange}
          error={!!errors.country}
          helperText={errors.country || ''}
          required
        >
          <MenuItem value="US">United States</MenuItem>
          <MenuItem value="UK">United Kingdom</MenuItem>
          <MenuItem value="CA">Canada</MenuItem>
          <MenuItem value="IN">India</MenuItem>
          <MenuItem value="AU">Australia</MenuItem>
          <MenuItem value="DE">Germany</MenuItem>
          <MenuItem value="FR">France</MenuItem>
          <MenuItem value="JP">Japan</MenuItem>
          <MenuItem value="BR">Brazil</MenuItem>
          <MenuItem value="IT">Italy</MenuItem>
        </TextField>
      </div>
      <div>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.isRegisteredCompany || false}
              onChange={handleInputChange}
              name="isRegisteredCompany"
            />
          }
          label="I confirm this is being purchased on behalf of a registered company"
        />
      </div>
    </div>
  );
};

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

const PricingSection = () => {
  // States for handling plans and UI
  const [activePlan, setActivePlan] = useState('monthly');
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const { selectedTeam } = useTeam();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // States for billing address and confirmation dialog
  const [billingAddress, setBillingAddress] = useState(null);
  const [addressErrors, setAddressErrors] = useState({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addonSelected, setAddonSelected] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        
        // Use the selectedTeam from context if available - this is more reliable
        if (selectedTeam && selectedTeam._id) {
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
          return;
        }
        
        // If we don't have selectedTeam, try getting from localStorage
        const token = localStorage.getItem("token");
        const teamFromStorage = localStorage.getItem("selectedTeam");
        
        if (!token) {
          setError("You must be logged in to view pricing for your teams.");
          setLoading(false);
          return;
        }

        // Fallback to fetching teams if context is not available
        try {
          const response = await axiosInstance.get('/team/myteams');
          if (response.data && Array.isArray(response.data)) {
            setTeams(response.data);
            
            // Set the first team as default if no team is selected
            if (response.data.length > 0) {
              const teamId = response.data[0]._id;
              setSelectedTeamId(teamId);
              
              // Try to load saved billing address for team
              try {
                const billingData = await fetchBillingDetails(teamId, axiosInstance);
                if (billingData) {
                  setBillingAddress(billingData);
                }
              } catch (err) {
                console.log("No saved billing address found");
              }
            }
          }
        } catch (error) {
          console.error("Error fetching teams:", error);
          setError("Failed to load teams. Please try again later.");
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error in team loading process:", error);
        setLoading(false);
      }
    };

    fetchTeams();
  }, [selectedTeam]);

  const handleBillingCycleToggle = (event, newPlan) => {
    if (newPlan !== null) {
      setActivePlan(newPlan);
    }
  };

  const validateBillingAddress = () => {
    const errors = {};
    const requiredFields = ['name', 'email', 'line1', 'city', 'state', 'postal_code', 'country'];
    
    requiredFields.forEach(field => {
      if (!billingAddress || !billingAddress[field]) {
        errors[field] = 'This field is required';
      }
    });
    
    // Validate email format
    if (billingAddress?.email && !/\S+@\S+\.\S+/.test(billingAddress.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSelectPlan = (plan) => {
    if (!selectedTeamId) {
      setError("Please select a team before choosing a plan.");
      return;
    }
    
    // Store selected plan ID
    setSelectedPlanId(plan.type);
    
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

  const handleCancelPlan = () => {
    setConfirmDialogOpen(false);
    setSelectedPlan(null);
  };

  const handleConfirmPlan = async () => {
    try {
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
      
      setLoading(true);
      
      // Get host URL for success/cancel redirects
      const hostUrl = window.location.origin;
      
      const successUrl = `${hostUrl}/${teamName}/settings/billing?success=true`;
      const cancelUrl = `${hostUrl}/${teamName}/settings/billing?canceled=true`;
      
      // Create checkout session with the selected plan ID
      const { url } = await createCheckoutSession(
        selectedTeamId, 
        selectedPlanId, // Use the selected plan ID
        successUrl, 
        cancelUrl, 
        activePlan, // Use activePlan (monthly/annual) instead of billingCycle
        billingAddress
      );
      
      // Redirect to checkout
      window.location.href = url;
      
    } catch (err) {
      console.error("Error creating checkout session:", err);
      setError("Failed to create checkout session. Please try again.");
      setLoading(false);
    }
  };

  // Plan data
  const plans = [
    {
      title: "Off-chain",
      monthlyPrice: 49,
      annualPrice: 539,
      annualSavings: "8%",
      description: "Perfect for small teams getting started with Web3 analytics",
      features: [
        "3 websites",
        "2 team members",
        "1,000 monthly API calls",
        "Basic analytics",
        "30-days data retention",
        "5 event definitions",
        "Email support"
      ],
      type: "OFFCHAIN"
    },
    {
      title: "Basic",
      monthlyPrice: 349,
      annualPrice: 3799,
      annualSavings: "9%",
      description: "For growing teams that need more capability",
      features: [
        "10 websites",
        "5 team members",
        "10,000 monthly API calls",
        "Advanced analytics",
        "6-months data retention",
        "20 event definitions",
        "Priority email support",
        "Custom data exports"
      ],
      type: "BASIC",
      isFeatured: true
    },
    {
      title: "Pro",
      monthlyPrice: 799,
      annualPrice: 8599,
      annualSavings: "10%",
      description: "For professional teams serious about Web3 analytics",
      features: [
        "25 websites",
        "15 team members",
        "50,000 monthly API calls",
        "Advanced analytics",
        "18-months data retention",
        "Unlimited event definitions",
        "24/7 priority support",
        "Custom data exports",
        "API access",
        "Dedicated account manager"
      ],
      type: "PRO"
    },
    {
      title: "Enterprise",
      monthlyPrice: null,
      annualPrice: null,
      description: "Tailored solutions for large organizations",
      features: [
        "Unlimited websites",
        "Unlimited team members",
        "Unlimited API calls",
        "Custom analytics",
        "Custom data retention",
        "White-label options",
        "Custom integrations",
        "24/7 dedicated support",
        "On-premises deployment option",
        "Dedicated success team"
      ],
      isCustom: true,
      type: "ENTERPRISE"
    }
  ];

  // Add-on product
  const intelligenceAddOn = {
    title: "CQ Intelligence",
    monthlyPrice: 299,
    annualPrice: 3199,
    annualSavings: "11%",
    description: "AI-powered insights for your Web3 data",
    features: [
      "Predictive analytics",
      "Market sentiment analysis",
      "Automated reporting",
      "Advanced user segmentation",
      "Trend detection",
      "Anomaly detection",
      "Custom AI models"
    ],
    type: "CQ_INTELLIGENCE_ADDON"
  };

  // New function to handle plan selection
  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    // Store ID for checkout
    setSelectedPlanId(plan.type);
  };
  
  // New function to toggle addon selection
  const toggleAddon = () => {
    setAddonSelected(!addonSelected);
  };
  
  // Calculate total price based on selections
  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    
    let total = activePlan === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
    
    if (addonSelected) {
      total += activePlan === 'annual' ? intelligenceAddOn.annualPrice : intelligenceAddOn.monthlyPrice;
    }
    
    return total;
  };
  
  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Add a function to get plan features for display in order summary
  const getPlanFeatures = (planType) => {
    const plan = plans.find(p => p.type === planType);
    return plan ? plan.features : [];
  };

  // Add a function to get addon features
  const getAddonFeatures = () => {
    return intelligenceAddOn.features;
  };

  return (
    <div className="space-y-8">
      <div className="max-w-6xl mx-auto">
        <Paper 
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            background: styles.futuristicGradient,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(29, 12, 70, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h5" style={{color: 'white', fontWeight: 600, ...styles.headingFont}} className="mb-1">
              Pricing
            </Typography>
            <h1 className="text-3xl font-bold" style={{...styles.headingFont, color: 'white'}}>
              Unlock the full potential of Web3 analytics
            </h1>
          </Box>
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            right: 0, 
            bottom: 0, 
            width: '30%', 
            background: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 100%)',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            zIndex: 0
          }}/>
        </Paper>
      </div>
      
      {/* Main pricing content with Order Summary sidebar */}
      <div className="max-w-6xl mx-auto">
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Left side - Pricing Options - All stacked vertically */}
          <Box sx={{ flexGrow: 1, width: { xs: '100%', md: '65%' } }}>
            {/* Billing Cycle Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, ...styles.headingFont, color: styles.primaryColor }}>
                Select Billing Cycle
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                {/* Annual Option */}
                <Paper 
                  elevation={activePlan === 'annual' ? 8 : 2}
                  sx={{
                    p: 2,
                    width: { xs: '100%', sm: 'calc(50% - 8px)' },
                    cursor: 'pointer',
                    background: activePlan === 'annual' ? styles.futuristicGradient : 'white',
                    color: activePlan === 'annual' ? 'white' : 'inherit',
                    boxShadow: activePlan === 'annual' ? styles.activeGlow : 'inherit',
                    transition: 'all 0.3s ease',
                    border: `1px solid ${activePlan === 'annual' ? styles.accentColor : 'rgba(0,0,0,0.12)'}`,
                    "&:hover": styles.cardHover,
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => handleBillingCycleToggle(null, 'annual')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', textAlign: 'center', ...styles.headingFont }}>
                      Annual Billing
                    </Typography>
                    <Chip 
                      label="Save up to 10%" 
                      size="small" 
                      sx={{ mb: 1, backgroundColor: styles.accentColor, color: 'white' }}
                    />
                    <Typography variant="body2" sx={{ textAlign: 'center', ...styles.bodyFont }}>
                      Pay once per year and save
                    </Typography>
                  </Box>
                </Paper>
                
                {/* Monthly Option */}
                <Paper 
                  elevation={activePlan === 'monthly' ? 8 : 2}
                  sx={{
                    p: 2,
                    width: { xs: '100%', sm: 'calc(50% - 8px)' },
                    cursor: 'pointer',
                    background: activePlan === 'monthly' ? styles.futuristicGradient : 'white',
                    color: activePlan === 'monthly' ? 'white' : 'inherit',
                    boxShadow: activePlan === 'monthly' ? styles.activeGlow : 'inherit',
                    transition: 'all 0.3s ease',
                    border: `1px solid ${activePlan === 'monthly' ? styles.accentColor : 'rgba(0,0,0,0.12)'}`,
                    "&:hover": styles.cardHover,
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => handleBillingCycleToggle(null, 'monthly')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', textAlign: 'center', ...styles.headingFont }}>
                      Monthly Billing
                    </Typography>
                    <Typography variant="body2" sx={{ textAlign: 'center', ...styles.bodyFont }}>
                      Pay month-to-month with flexibility
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </Box>

            {/* Plans Selection - Reducing height and fixing Enterprise plan layout */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, ...styles.headingFont, color: styles.primaryColor }}>
                Select Plan
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {plans.map((plan) => (
                  <Box 
                    key={plan.type} 
                    sx={{ 
                      width: { xs: '100%', sm: 'calc(50% - 8px)' },
                      height: '140px', 
                      display: 'flex' 
                    }}
                  >
                    <Paper
                      elevation={selectedPlan?.type === plan.type ? 8 : 2}
                      sx={{
                        p: 2,
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: plan.type !== 'ENTERPRISE' ? 'pointer' : 'default',
                        background: selectedPlan?.type === plan.type ? styles.futuristicGradient : 'white',
                        color: selectedPlan?.type === plan.type ? 'white' : 'inherit',
                        boxShadow: selectedPlan?.type === plan.type ? styles.activeGlow : 'inherit',
                        transition: 'all 0.3s ease',
                        border: `1px solid ${selectedPlan?.type === plan.type ? styles.accentColor : 'rgba(0,0,0,0.12)'}`,
                        "&:hover": plan.type !== 'ENTERPRISE' ? styles.cardHover : {}
                      }}
                      onClick={() => plan.type !== 'ENTERPRISE' && handlePlanSelect(plan)}
                    >
                      <div>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', ...styles.headingFont }}>
                          {plan.title}
                        </Typography>
                        
                        <Typography variant="body2" sx={{ mb: 1, ...styles.bodyFont }}>
                          {plan.description}
                        </Typography>
                      </div>
                      
                      <div>
                        {plan.type === 'ENTERPRISE' ? (
                          <Button 
                            variant="outlined" 
                            size="small"
                            fullWidth
                            sx={{ 
                              borderColor: selectedPlan?.type === plan.type ? 'white' : styles.primaryColor,
                              color: selectedPlan?.type === plan.type ? 'white' : styles.primaryColor
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open('mailto:sales@cryptique.io');
                            }}
                          >
                            Contact Sales
                          </Button>
                        ) : (
                          <Typography variant="h5" sx={{ fontWeight: 'bold', ...styles.headingFont }}>
                            {activePlan === 'annual' ? formatPrice(plan.annualPrice) : formatPrice(plan.monthlyPrice)}
                            <Typography component="span" variant="body2" sx={{ ml: 1 }}>
                              /{activePlan === 'annual' ? 'year' : 'month'}
                            </Typography>
                          </Typography>
                        )}
                      </div>
                    </Paper>
                  </Box>
                ))}
              </Box>
            </Box>
            
            {/* Add-ons section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, ...styles.headingFont, color: styles.primaryColor }}>
                Add-ons
              </Typography>
              
              <Paper
                elevation={addonSelected ? 8 : 2}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  background: addonSelected ? styles.futuristicGradient : 'white',
                  color: addonSelected ? 'white' : 'inherit',
                  boxShadow: addonSelected ? styles.activeGlow : 'inherit',
                  transition: 'all 0.3s ease',
                  border: `1px solid ${addonSelected ? styles.accentColor : 'rgba(0,0,0,0.12)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  "&:hover": styles.cardHover,
                  height: '100px'
                }}
                onClick={toggleAddon}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Psychology sx={{ fontSize: 40, color: addonSelected ? styles.accentColor : styles.primaryColor, mr: 2 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', ...styles.headingFont }}>
                      {intelligenceAddOn.title}
                    </Typography>
                    <Typography variant="body2" sx={{ ...styles.bodyFont }}>
                      {intelligenceAddOn.description}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', ...styles.headingFont, textAlign: 'right' }}>
                    {activePlan === 'annual' ? formatPrice(intelligenceAddOn.annualPrice) : formatPrice(intelligenceAddOn.monthlyPrice)}
                    <Typography component="span" variant="body2" sx={{ ml: 1 }}>
                      /{activePlan === 'annual' ? 'year' : 'month'}
                    </Typography>
                  </Typography>
                  <Chip 
                    label={addonSelected ? "Selected" : "Click to add"} 
                    size="small" 
                    sx={{ 
                      backgroundColor: addonSelected ? styles.accentColor : 'rgba(0,0,0,0.1)', 
                      color: addonSelected ? 'white' : 'inherit'
                    }}
                  />
                </Box>
              </Paper>
            </Box>
          </Box>
          
          {/* Right Side - Order Summary - Fixed position alongside all selections */}
          <Box sx={{ 
            width: { xs: '100%', md: '35%' },
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3,
                background: 'linear-gradient(135deg, #f8f8ff 0%, #f0f0ff 100%)',
                border: `1px solid ${styles.accentColor}`,
                borderRadius: 2,
                position: 'sticky',
                top: '20px',
                maxHeight: 'calc(100vh - 40px)',
                overflowY: 'auto'
              }}
            >
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', ...styles.headingFont, color: styles.primaryColor }}>
                Order Summary
              </Typography>
              
              {selectedPlan ? (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {selectedPlan.title} Plan ({activePlan === 'annual' ? 'Annual' : 'Monthly'})
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {activePlan === 'annual' ? formatPrice(selectedPlan.annualPrice) : formatPrice(selectedPlan.monthlyPrice)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ my: 2, backgroundColor: 'rgba(29, 12, 70, 0.04)', p: 2, borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: styles.primaryColor }}>
                        {selectedPlan.title} Plan Features:
                      </Typography>
                      <ul style={{ paddingLeft: '20px', margin: 0 }}>
                        {getPlanFeatures(selectedPlan.type).map((feature, index) => (
                          <li key={index}>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                              {feature}
                            </Typography>
                          </li>
                        ))}
                      </ul>
                    </Box>
                    
                    {addonSelected && (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, mt: 2 }}>
                          <Typography variant="body1">
                            {intelligenceAddOn.title}
                          </Typography>
                          <Typography variant="body1">
                            {activePlan === 'annual' ? formatPrice(intelligenceAddOn.annualPrice) : formatPrice(intelligenceAddOn.monthlyPrice)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ my: 2, backgroundColor: 'rgba(202, 169, 104, 0.1)', p: 2, borderRadius: 1, borderLeft: `4px solid ${styles.accentColor}` }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: styles.accentColor }}>
                            {intelligenceAddOn.title} Features:
                          </Typography>
                          <ul style={{ paddingLeft: '20px', margin: 0 }}>
                            {getAddonFeatures().map((feature, index) => (
                              <li key={index}>
                                <Typography variant="body2" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                                  {feature}
                                </Typography>
                              </li>
                            ))}
                          </ul>
                        </Box>
                      </>
                    )}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Total
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: styles.primaryColor }}>
                        {formatPrice(calculateTotal())}
                        <Typography component="span" variant="body2">
                          /{activePlan === 'annual' ? 'year' : 'month'}
                        </Typography>
                      </Typography>
                    </Box>
                    
                    <Typography variant="subtitle2" sx={{ mb: 2, ...styles.bodyFont, fontSize: '0.75rem' }}>
                      Selected for: {teams.find(team => team._id === selectedTeamId)?.name || 'Unknown team'}
                    </Typography>
                    
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={!selectedPlan || selectedPlan.type === 'ENTERPRISE' || !selectedTeamId}
                      onClick={() => handleSelectPlan(selectedPlan.type)}
                      sx={{
                        py: 1.5,
                        background: styles.futuristicGradient,
                        boxShadow: '0 4px 15px rgba(29, 12, 70, 0.3)',
                        '&:hover': {
                          boxShadow: '0 6px 20px rgba(29, 12, 70, 0.4)',
                        },
                        mb: 1
                      }}
                    >
                      Subscribe Now
                    </Button>
                    
                    <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.75rem' }}>
                      Secure payment via Stripe
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                    Select a plan to see your order summary
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </div>
      
      {/* Feature Comparison Table - Enhanced with banner-style header */}
      <div className="max-w-6xl mx-auto mt-12 mb-12">
        <Paper 
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            background: styles.futuristicGradient,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(29, 12, 70, 0.2)',
            textAlign: 'center'
          }}
        >
          <Typography variant="h5" style={{color: 'white', fontWeight: 600, ...styles.headingFont}}>
            Feature Comparison
          </Typography>
        </Paper>
        
        <Box sx={{ overflowX: 'auto' }}>
          <Paper 
            elevation={3} 
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 10px 30px rgba(29, 12, 70, 0.1)',
              overflow: 'hidden'
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ 
                  background: styles.futuristicGradient,
                }}>
                  <TableCell sx={{ 
                    minWidth: 180, 
                    fontWeight: 'bold', 
                    ...styles.headingFont,
                    color: 'white',
                    fontSize: '1.1rem'
                  }}>
                    Features
                  </TableCell>
                  {plans.map((plan) => (
                    <TableCell 
                      key={plan.type} 
                      align="center"
                      sx={{ 
                        minWidth: 150, 
                        fontWeight: 'bold', 
                        ...styles.headingFont,
                        color: 'white',
                        fontSize: '1.1rem',
                        borderLeft: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      {plan.title}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ backgroundColor: 'rgba(29, 12, 70, 0.02)' }}>
                  <TableCell sx={{ fontWeight: 'medium' }}>Websites</TableCell>
                  <TableCell align="center">1 website</TableCell>
                  <TableCell align="center">2 websites</TableCell>
                  <TableCell align="center">3 websites</TableCell>
                  <TableCell align="center">Custom</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Team Members</TableCell>
                  <TableCell align="center">1 (owner only)</TableCell>
                  <TableCell align="center">2 team members</TableCell>
                  <TableCell align="center">3 team members</TableCell>
                  <TableCell align="center">Custom</TableCell>
                </TableRow>
                
                <TableRow sx={{ backgroundColor: 'rgba(29, 12, 70, 0.02)' }}>
                  <TableCell sx={{ fontWeight: 'medium' }}>Smart Contracts</TableCell>
                  <TableCell align="center">
                    <Close color="error" fontSize="small" />
                  </TableCell>
                  <TableCell align="center">1 contract</TableCell>
                  <TableCell align="center">3 contracts</TableCell>
                  <TableCell align="center">Custom</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Explorer API Calls</TableCell>
                  <TableCell align="center">
                    <Close color="error" fontSize="small" />
                  </TableCell>
                  <TableCell align="center">40,000 / month</TableCell>
                  <TableCell align="center">150,000 / month</TableCell>
                  <TableCell align="center">Custom</TableCell>
                </TableRow>
                
                <TableRow sx={{ backgroundColor: 'rgba(29, 12, 70, 0.02)' }}>
                  <TableCell sx={{ fontWeight: 'medium' }}>User Journey Tracking</TableCell>
                  <TableCell align="center">Limited</TableCell>
                  <TableCell align="center">Up to 10,000</TableCell>
                  <TableCell align="center">Up to 50,000</TableCell>
                  <TableCell align="center">Custom</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Wallet-level Breakdown</TableCell>
                  <TableCell align="center">
                    <Close color="error" fontSize="small" />
                  </TableCell>
                  <TableCell align="center">Up to 10,000</TableCell>
                  <TableCell align="center">Up to 100,000</TableCell>
                  <TableCell align="center">Custom</TableCell>
                </TableRow>
                
                <TableRow sx={{ backgroundColor: 'rgba(29, 12, 70, 0.02)' }}>
                  <TableCell sx={{ fontWeight: 'medium' }}>Priority Support</TableCell>
                  <TableCell align="center">
                    <Close color="error" fontSize="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Close color="error" fontSize="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Check sx={{ color: styles.accentColor }} fontSize="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Check sx={{ color: styles.accentColor }} fontSize="small" />
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Supported Blockchains</TableCell>
                  <TableCell align="center">Limited</TableCell>
                  <TableCell align="center">All supported</TableCell>
                  <TableCell align="center">All supported</TableCell>
                  <TableCell align="center">All supported</TableCell>
                </TableRow>
                
                <TableRow sx={{ backgroundColor: 'rgba(29, 12, 70, 0.02)' }}>
                  <TableCell sx={{ fontWeight: 'medium' }}>Data Export</TableCell>
                  <TableCell align="center">
                    <Close color="error" fontSize="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Close color="error" fontSize="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Check sx={{ color: styles.accentColor }} fontSize="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Check sx={{ color: styles.accentColor }} fontSize="small" />
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell sx={{ fontWeight: 'medium' }}>Custom Events</TableCell>
                  <TableCell align="center">
                    <Close color="error" fontSize="small" />
                  </TableCell>
                  <TableCell align="center">5 events</TableCell>
                  <TableCell align="center">Unlimited</TableCell>
                  <TableCell align="center">Unlimited</TableCell>
                </TableRow>
                
                <TableRow sx={{ backgroundColor: 'rgba(29, 12, 70, 0.02)' }}>
                  <TableCell sx={{ fontWeight: 'medium' }}>Campaigns</TableCell>
                  <TableCell align="center">
                    <Close color="error" fontSize="small" />
                  </TableCell>
                  <TableCell align="center">5 campaigns</TableCell>
                  <TableCell align="center">Unlimited</TableCell>
                  <TableCell align="center">Unlimited</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        </Box>
      </div>
      
      {/* Add some extra space at the end */}
      <Box sx={{ height: 60 }} />
      
      {/* Confirmation Dialog - Keep existing code */}
    </div>
  );
};

export default PricingSection; 
import React, { useState, useEffect } from "react";
import { Button, Card, CardContent, CardActions, Chip, Typography, Grid, Paper, Divider, Box, ToggleButton, ToggleButtonGroup, FormControl, InputLabel, Select, MenuItem, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, CircularProgress } from "@mui/material";
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
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-8px)',
      boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)',
    }
  },
  featuredCard: {
    borderColor: '#caa968',
    borderWidth: 2,
    transform: 'scale(1.05)',
    position: 'relative',
    zIndex: 2
  }
};

const BillingAddressForm = ({ billingAddress, setBillingAddress, errors }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBillingAddress({
      ...billingAddress,
      [name]: value
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <TextField
          label="Full Name"
          name="name"
          fullWidth
          value={billingAddress?.name || ''}
          onChange={handleInputChange}
          error={!!errors.name}
          helperText={errors.name || ''}
          required
        />
      </div>
      <div>
        <TextField
          label="Street Address"
          name="line1"
          fullWidth
          value={billingAddress?.line1 || ''}
          onChange={handleInputChange}
          error={!!errors.line1}
          helperText={errors.line1 || ''}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="City"
          name="city"
          fullWidth
          value={billingAddress?.city || ''}
          onChange={handleInputChange}
          error={!!errors.city}
          helperText={errors.city || ''}
          required
        />
        <TextField
          label="State/Province"
          name="state"
          fullWidth
          value={billingAddress?.state || ''}
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
          value={billingAddress?.postal_code || ''}
          onChange={handleInputChange}
          error={!!errors.postal_code}
          helperText={errors.postal_code || ''}
          required
        />
        <TextField
          label="Country"
          name="country"
          fullWidth
          value={billingAddress?.country || ''}
          onChange={handleInputChange}
          error={!!errors.country}
          helperText={errors.country || ''}
          required
        />
      </div>
    </div>
  );
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
          if (selectedTeam.billingAddress) {
            setBillingAddress(selectedTeam.billingAddress);
          }
          
          setLoading(false);
          return;
        }

        // Fallback to fetching teams if context is not available
        const response = await axiosInstance.get('/teams');
        setTeams(response.data);
        
        // Set the first team as default if no team is selected
        if (response.data.length > 0) {
          const teamId = response.data[0]._id;
          setSelectedTeamId(teamId);
          
          // Try to load saved billing address for team
          try {
            const billingRes = await axiosInstance.get(`/team/${teamId}/billing-address`);
            if (billingRes.data) {
              setBillingAddress(billingRes.data);
            }
          } catch (err) {
            console.log("No saved billing address found");
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching teams:", error);
        setError("Failed to load teams. Please try again later.");
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
    const requiredFields = ['name', 'line1', 'city', 'state', 'postal_code', 'country'];
    
    requiredFields.forEach(field => {
      if (!billingAddress || !billingAddress[field]) {
        errors[field] = 'This field is required';
      }
    });
    
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSelectPlan = (planType) => {
    if (!selectedTeamId) {
      setError("Please select a team first.");
      return;
    }
    
    setSelectedPlan({
      planType,
      billingCycle: activePlan
    });
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
          await axiosInstance.post(`/team/${selectedTeamId}/billing-address`, billingAddress);
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
      
      // Create checkout session
      const { url } = await createCheckoutSession(
        selectedTeamId, 
        selectedPlan.planType, 
        successUrl, 
        cancelUrl, 
        selectedPlan.billingCycle,
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

  return (
    <div className="space-y-8">
      <div className="max-w-4xl mx-auto">
        <Typography variant="h5" style={{color: styles.accentColor, fontWeight: 600, ...styles.headingFont}} className="mb-1">Pricing</Typography>
        <h1 className="text-3xl font-bold mb-2" style={{...styles.headingFont, color: styles.primaryColor}}>
          Unlock the full potential of Web3 analytics
        </h1>
        <div className="text-gray-600 mb-4 text-sm">
          For enterprise needs or custom pricing inquiries, please contact us at 
          <Button 
            size="small" 
            variant="outlined" 
            sx={{ ml: 1, borderColor: styles.accentColor, color: styles.accentColor }} 
            onClick={() => window.open('mailto:sales@cryptique.io')}
          >
            sales@cryptique.io
          </Button>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-4">
        <ToggleButtonGroup
          value={activePlan}
          exclusive
          onChange={handleBillingCycleToggle}
          aria-label="billing cycle"
          color="primary"
          sx={{ 
            '.MuiToggleButton-root.Mui-selected': { 
              backgroundColor: styles.primaryColor,
              color: 'white',
              '&:hover': {
                backgroundColor: '#2c1566'
              }
            } 
          }}
        >
          <ToggleButton value="monthly">
            Monthly billing
          </ToggleButton>
          <ToggleButton value="annual">
            Annual billing
            <Chip 
              label="Save up to 10%" 
              size="small" 
              sx={{ ml: 1, backgroundColor: styles.accentColor, color: 'white' }}
            />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      {/* Error message */}
      {error && (
        <Alert severity="error" className="max-w-4xl mx-auto mb-4">{error}</Alert>
      )}

      {/* Plans Grid */}
      <Grid container spacing={4} alignItems="stretch">
        {plans.map((plan, index) => (
          <Grid item xs={12} md={6} lg={3} key={index}>
            <Card 
              sx={{
                ...styles.card,
                ...(plan.isFeatured ? styles.featuredCard : {})
              }}
              elevation={plan.isFeatured ? 8 : 2}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                {plan.isFeatured && (
                  <Chip 
                    label="MOST POPULAR" 
                    size="small" 
                    sx={{ 
                      position: 'absolute', 
                      top: 10, 
                      right: 10, 
                      backgroundColor: styles.accentColor, 
                      color: 'white',
                      fontWeight: 'bold' 
                    }} 
                  />
                )}
                
                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', ...styles.headingFont, color: styles.primaryColor }}>
                  {plan.title}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph sx={styles.bodyFont}>
                  {plan.description}
                </Typography>
                
                <div className="mt-4 mb-6">
                  {plan.isCustom ? (
                    <Typography variant="h4" component="p" sx={{ fontWeight: 'bold', ...styles.headingFont }}>
                      Custom pricing
                    </Typography>
                  ) : (
                    <>
                      <Typography variant="h4" component="p" sx={{ fontWeight: 'bold', ...styles.headingFont }}>
                        ${activePlan === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                        <Typography component="span" variant="subtitle1" color="text.secondary">
                          /{activePlan === 'monthly' ? 'month' : 'year'}
                        </Typography>
                      </Typography>
                      {activePlan === 'annual' && (
                        <Typography variant="body2" color="success.main" sx={styles.bodyFont}>
                          Save {plan.annualSavings} with annual billing
                        </Typography>
                      )}
                    </>
                  )}
                </div>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, ...styles.headingFont }}>
                  INCLUDES:
                </Typography>
                
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check sx={{ color: 'green', mr: 1, fontSize: 20, flexShrink: 0, mt: 0.5 }} />
                      <Typography variant="body2" sx={styles.bodyFont}>
                        {feature}
                      </Typography>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardActions sx={{ p: 2, pt: 0 }}>
                {plan.isCustom ? (
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    size="large" 
                    onClick={() => window.open('mailto:enterprise@cryptique.io')}
                    sx={{ 
                      borderColor: styles.primaryColor, 
                      color: styles.primaryColor,
                      '&:hover': { borderColor: '#2c1566', color: '#2c1566' } 
                    }}
                  >
                    Contact Sales
                  </Button>
                ) : (
                  <Button 
                    fullWidth 
                    variant="contained" 
                    size="large" 
                    onClick={() => handleSelectPlan(plan.type)}
                    disabled={loading}
                    sx={{ 
                      backgroundColor: styles.primaryColor,
                      '&:hover': { backgroundColor: '#2c1566' }
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Select Plan'}
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add-on section */}
      <div className="mt-16 mb-8">
        <Typography variant="h5" align="center" sx={{ fontWeight: 'bold', mb: 4, ...styles.headingFont }}>
          Power Up Your Analytics
        </Typography>
        
        <Paper 
          elevation={4} 
          sx={{ 
            p: 4, 
            maxWidth: '800px', 
            mx: 'auto', 
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${styles.primaryColor} 0%, #2c1566 100%)`,
            color: 'white'
          }}
        >
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ mb: 3 }}>
                <Psychology sx={{ fontSize: 48, color: styles.accentColor, mb: 2 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, ...styles.headingFont }}>
                  {intelligenceAddOn.title}
                </Typography>
                <Typography variant="h5" sx={{ mb: 2, ...styles.headingFont }}>
                  ${activePlan === 'monthly' ? intelligenceAddOn.monthlyPrice : intelligenceAddOn.annualPrice}
                  <Typography component="span" variant="subtitle1" sx={{ opacity: 0.7 }}>
                    /{activePlan === 'monthly' ? 'month' : 'year'}
                  </Typography>
                </Typography>
                {activePlan === 'annual' && (
                  <Chip 
                    label={`Save ${intelligenceAddOn.annualSavings}`} 
                    size="small" 
                    sx={{ backgroundColor: styles.accentColor, color: 'white', mb: 2 }}
                  />
                )}
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.8, ...styles.bodyFont }}>
                  {intelligenceAddOn.description}
                </Typography>
                <Button 
                  variant="contained" 
                  size="large" 
                  onClick={() => handleSelectPlan(intelligenceAddOn.type)}
                  disabled={loading}
                  sx={{ 
                    backgroundColor: styles.accentColor,
                    color: 'white',
                    '&:hover': { backgroundColor: '#b99856' }
                  }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Add to Your Plan'}
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <ul className="space-y-2">
                {intelligenceAddOn.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check sx={{ color: styles.accentColor, mr: 1, fontSize: 20, flexShrink: 0, mt: 0.5 }} />
                    <Typography variant="body2" sx={{ ...styles.bodyFont, opacity: 0.9 }}>
                      {feature}
                    </Typography>
                  </li>
                ))}
              </ul>
            </Grid>
          </Grid>
        </Paper>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelPlan}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', pb: 2 }}>
          Confirm Your Subscription
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText paragraph>
            Please confirm your subscription details:
          </DialogContentText>
          
          {selectedPlan && (
            <Box sx={{ mb: 3, p: 2, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Plan: {plans.find(p => p.type === selectedPlan.planType)?.title || intelligenceAddOn.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Billing cycle: {selectedPlan.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Team: {teams.find(team => team._id === selectedTeamId)?.name}
              </Typography>
              <Typography variant="body2" color="primary" fontWeight="bold">
                {selectedPlan.billingCycle === 'annual' ? 
                  `$${selectedPlan.planType === intelligenceAddOn.type ? 
                    intelligenceAddOn.annualPrice : 
                    plans.find(p => p.type === selectedPlan.planType)?.annualPrice}/year` : 
                  `$${selectedPlan.planType === intelligenceAddOn.type ? 
                    intelligenceAddOn.monthlyPrice : 
                    plans.find(p => p.type === selectedPlan.planType)?.monthlyPrice}/month`}
              </Typography>
            </Box>
          )}
          
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Billing Address
          </Typography>
          
          <BillingAddressForm 
            billingAddress={billingAddress} 
            setBillingAddress={setBillingAddress} 
            errors={addressErrors}
          />
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
            {loading ? <CircularProgress size={24} /> : 'Proceed to Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PricingSection; 
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Grid, Paper, Box, Button, 
  Card, CardContent, CardActions, Chip, CircularProgress,
  Divider, Alert, ToggleButton, ToggleButtonGroup, Tooltip
} from '@mui/material';
import { useTeam } from '../context/teamContext';
import { 
  getSubscription, getSubscriptionPlans, createCheckout, 
  syncTeamWithZoho
} from '../services/billingService';

const BillingPage = () => {
  const { user, selectedTeam } = useTeam();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState({});
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [includeCQIntelligence, setIncludeCQIntelligence] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [syncingTeam, setSyncingTeam] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Only fetch if we have a team
        if (selectedTeam?._id) {
          const [subData, plansData] = await Promise.all([
            getSubscription(selectedTeam._id),
            getSubscriptionPlans()
          ]);
          
          setSubscription(subData.subscription);
          setSubscriptionPlans(plansData.plans);
        }
      } catch (err) {
        setError('Failed to load subscription data. Please try again.');
        console.error('Error loading subscription:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTeam]);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    
    // Reset CQ Intelligence add-on when selecting a new plan
    // But keep it if the current plan has it
    if (subscription?.cqIntelligence) {
      setIncludeCQIntelligence(true);
    } else {
      setIncludeCQIntelligence(false);
    }
  };

  const handleCQToggle = () => {
    setIncludeCQIntelligence(!includeCQIntelligence);
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !selectedTeam?._id) return;

    try {
      setProcessingPayment(true);
      setError(null);

      const checkoutData = {
        teamId: selectedTeam._id,
        userId: user?._id || user?.id,
        planType: selectedPlan,
        isCQIntelligence: includeCQIntelligence,
      };

      const response = await createCheckout(checkoutData);
      
      // Redirect to Coinbase checkout
      if (response.checkout?.url) {
        window.location.href = response.checkout.url;
      } else {
        setError('Failed to create checkout. Please try again.');
      }
    } catch (err) {
      setError('Payment processing failed. Please try again.');
      console.error('Checkout error:', err);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSyncZoho = async () => {
    if (!selectedTeam?._id) return;

    try {
      setSyncingTeam(true);
      setError(null);

      await syncTeamWithZoho(selectedTeam._id);
      
      // Show success message
      setError('Team successfully synced with Zoho CRM');
    } catch (err) {
      setError('Failed to sync team with Zoho CRM. Please try again.');
      console.error('Zoho sync error:', err);
    } finally {
      setSyncingTeam(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    if (!selectedPlan) return 0;
    
    let total = subscriptionPlans[selectedPlan]?.price || 0;
    
    if (includeCQIntelligence && subscriptionPlans.cq_intelligence_addon) {
      total += subscriptionPlans.cq_intelligence_addon.price;
    }
    
    return total;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Container sx={{ mt: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>Loading subscription data...</Typography>
        </Container>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Typography variant="h4" gutterBottom>
          Billing & Subscription
        </Typography>

        {error && (
          <Alert 
            severity={error.includes('successfully') ? 'success' : 'error'} 
            sx={{ mb: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Current Subscription */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Current Subscription
          </Typography>
          
          {subscription ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle1" color="text.secondary">
                    Plan
                  </Typography>
                  <Typography variant="h6">
                    {subscriptionPlans[subscription.plan]?.name || subscription.plan.toUpperCase()}
                    {subscription.cqIntelligence && (
                      <Chip 
                        label="+ CQ Intelligence" 
                        color="secondary" 
                        size="small" 
                        sx={{ ml: 1 }} 
                      />
                    )}
                  </Typography>
                </Box>
                
                <Box mt={2}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Status
                  </Typography>
                  <Chip 
                    label={subscription.status.toUpperCase()} 
                    color={subscription.status === 'active' ? 'success' : 'default'}
                  />
                </Box>

                <Box mt={2}>
                  <Typography variant="subtitle1" color="text.secondary">
                    Limits
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Websites: {subscription.limits.websites}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Smart Contracts: {subscription.limits.smartContracts}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        API Calls: {subscription.limits.apiCalls}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Team Members: {subscription.limits.teamMembers}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle1" color="text.secondary">
                    Subscription Period
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                  </Typography>
                </Box>

                <Box mt={3}>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={handleSyncZoho}
                    disabled={syncingTeam}
                  >
                    {syncingTeam ? 'Syncing...' : 'Sync with Zoho CRM'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Typography variant="body1" color="text.secondary">
              No active subscription found. Choose a plan below to get started.
            </Typography>
          )}
        </Paper>

        {/* Subscription Plans */}
        <Typography variant="h5" gutterBottom>
          Available Plans
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {Object.entries(subscriptionPlans).map(([key, plan]) => {
            // Skip addon in main plan list
            if (plan.isAddon) return null;
            
            return (
              <Grid item xs={12} sm={6} md={3} key={key}>
                <Card 
                  variant={selectedPlan === key ? 'outlined' : 'elevation'} 
                  sx={{ 
                    height: '100%',
                    border: selectedPlan === key ? '2px solid' : 'none',
                    borderColor: 'primary.main',
                    boxShadow: selectedPlan === key ? 3 : 1
                  }}
                >
                  <CardContent>
                    <Typography variant="h5" component="div" gutterBottom>
                      {plan.name}
                    </Typography>
                    
                    <Typography variant="h4" color="primary" gutterBottom>
                      {plan.price === null ? 'Custom' : `$${plan.price}`}
                      <Typography variant="caption" color="text.secondary">
                        /month
                      </Typography>
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {plan.description}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Features:
                    </Typography>
                    
                    {plan.features.map((feature, index) => (
                      <Typography key={index} variant="body2" paragraph sx={{ ml: 1 }}>
                        • {feature}
                      </Typography>
                    ))}
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Limits:
                    </Typography>
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          Websites: {plan.limits.websites === null ? 'Custom' : plan.limits.websites}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          Smart Contracts: {plan.limits.smartContracts === null ? 'Custom' : plan.limits.smartContracts}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          API Calls: {plan.limits.apiCalls === null ? 'Custom' : plan.limits.apiCalls}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          Team Members: {plan.limits.teamMembers === null ? 'Custom' : plan.limits.teamMembers}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'center', p: 2 }}>
                    <Button 
                      size="large" 
                      variant={selectedPlan === key ? 'contained' : 'outlined'}
                      color="primary"
                      fullWidth
                      onClick={() => handlePlanSelect(key)}
                    >
                      {selectedPlan === key ? 'Selected' : 'Select Plan'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* CQ Intelligence Add-on */}
        {subscriptionPlans.cq_intelligence_addon && (
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h6">
                  {subscriptionPlans.cq_intelligence_addon.name}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {subscriptionPlans.cq_intelligence_addon.description}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Typography variant="h5" color="primary">
                  ${subscriptionPlans.cq_intelligence_addon.price}/month
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Button
                  variant={includeCQIntelligence ? 'contained' : 'outlined'}
                  color={includeCQIntelligence ? 'secondary' : 'primary'}
                  onClick={handleCQToggle}
                  disabled={!selectedPlan}
                  fullWidth
                >
                  {includeCQIntelligence ? 'Remove' : 'Add to Plan'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Checkout Summary */}
        {selectedPlan && (
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Order Summary
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={8}>
                <Typography variant="body1">
                  {subscriptionPlans[selectedPlan]?.name || selectedPlan}
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body1">
                  ${subscriptionPlans[selectedPlan]?.price || 0}/month
                </Typography>
              </Grid>
              
              {includeCQIntelligence && (
                <>
                  <Grid item xs={8}>
                    <Typography variant="body1">
                      CQ Intelligence Add-on
                    </Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography variant="body1">
                      ${subscriptionPlans.cq_intelligence_addon?.price || 0}/month
                    </Typography>
                  </Grid>
                </>
              )}
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
              
              <Grid item xs={8}>
                <Typography variant="h6">
                  Total
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="h6">
                  ${calculateTotalPrice()}/month
                </Typography>
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  disabled={processingPayment}
                  onClick={handleCheckout}
                >
                  {processingPayment ? <CircularProgress size={24} color="inherit" /> : 'Proceed to Payment'}
                </Button>
                
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                  You will be redirected to Coinbase Commerce to complete your payment.
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Container>
    </div>
  );
};

export default BillingPage; 
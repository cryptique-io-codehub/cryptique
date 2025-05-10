import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Button, 
  Divider, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Stack
} from '@mui/material';
import { Check, Info, Star, StarBorder, Bolt, Lock, Shield, CheckCircle } from '@mui/icons-material';
import { 
  getSubscriptionPlans, 
  getSubscription, 
  createCheckoutSession, 
  cancelSubscription,
  createPortalSession,
  addCQIntelligence,
  cancelCQIntelligence
} from '../../../services/stripeService';

const StripeSubscription = ({ teamId, currentTeam }) => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [addons, setAddons] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlanType, setSelectedPlanType] = useState(null);
  const [isHovering, setIsHovering] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Always fetch plans regardless of team ID
        const plansData = await getSubscriptionPlans();
        
        // Format plans into an array
        const formattedPlans = Object.entries(plansData.plans).map(([key, plan]) => ({
          id: key,
          ...plan,
        }));
        
        setPlans(formattedPlans);
        setAddons(plansData.addons);
        
        // Fetch current subscription if team ID is available
        if (teamId) {
          const subscriptionData = await getSubscription(teamId);
          setSubscription(subscriptionData);
          
          // Set billing cycle based on current subscription
          if (subscriptionData?.subscription?.billingCycle) {
            setBillingCycle(subscriptionData.subscription.billingCycle);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching billing data:', err);
        setError('Failed to load subscription information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [teamId]);

  const handleBillingCycleChange = (event, newBillingCycle) => {
    if (newBillingCycle !== null) {
      setBillingCycle(newBillingCycle);
    }
  };

  const getStatusChipColor = (status) => {
    switch(status) {
      case 'active':
        return 'success';
      case 'past_due':
      case 'pastdue':
        return 'warning';
      case 'cancelled':
      case 'canceled':
        return 'error';
      case 'trial':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleSubscribe = async (planId, planType) => {
    // Don't block checkout based on temp-id anymore, use any available teamId
    if (!teamId) {
      setError("Team information is missing. Please select a team to subscribe to a plan.");
      return;
    }
    
    setSelectedPlan(planId);
    setSelectedPlanType(planType);
    setUpgradeDialogOpen(true);
  };

  const confirmSubscribe = async () => {
    try {
      setLoading(true);
      setUpgradeDialogOpen(false);
      
      // Create checkout session
      const hostUrl = window.location.origin;
      const session = await createCheckoutSession(
        teamId,
        selectedPlan,
        `${hostUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        `${hostUrl}/settings/billing?canceled=true`,
        selectedPlanType || billingCycle
      );
      
      // Redirect to Stripe Checkout
      window.location.href = session.url;
      
    } catch (err) {
      console.error('Error creating subscription:', err);
      setError('Failed to create subscription checkout. Please try again later.');
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    setCancelDialogOpen(true);
  };

  const confirmCancelSubscription = async () => {
    try {
      setLoading(true);
      setCancelDialogOpen(false);
      
      await cancelSubscription(subscription.subscription.stripeSubscriptionId);
      
      // Refetch subscription data
      const subscriptionData = await getSubscription(teamId);
      setSubscription(subscriptionData);
      
      setError(null);
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError('Failed to cancel subscription. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleManagePaymentMethod = async () => {
    try {
      setLoading(true);
      
      const hostUrl = window.location.origin;
      const session = await createPortalSession(
        teamId,
        `${hostUrl}/settings/billing`
      );
      
      // Redirect to Stripe Customer Portal
      window.location.href = session.url;
    } catch (err) {
      console.error('Error creating portal session:', err);
      setError('Failed to open billing portal. Please try again later.');
      setLoading(false);
    }
  };

  const handleToggleCQIntelligence = async (currentState) => {
    try {
      setLoading(true);
      
      if (currentState) {
        // Turn off CQ Intelligence
        await cancelCQIntelligence(teamId, subscription.subscription.stripeSubscriptionId);
      } else {
        // Turn on CQ Intelligence
        await addCQIntelligence(teamId, subscription.subscription.stripeSubscriptionId, billingCycle);
      }
      
      // Refetch subscription data
      const subscriptionData = await getSubscription(teamId);
      setSubscription(subscriptionData);
      
      setError(null);
    } catch (err) {
      console.error('Error toggling CQ Intelligence:', err);
      setError(`Failed to ${currentState ? 'disable' : 'enable'} CQ Intelligence. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  const hasCQIntelligence = () => {
    if (!subscription) return false;
    
    // Check if any active CQ Intelligence addon exists
    const hasAddon = subscription.subscription.addons?.some(
      addon => addon.name === 'cq_intelligence' && addon.active
    );
    
    // Also check the team model flag
    return hasAddon || currentTeam?.subscription?.cqIntelligence;
  };

  const getFeatureIcon = (feature) => {
    if (feature.includes('analytics')) return <Bolt color="primary" fontSize="small" />;
    if (feature.includes('team')) return <Shield color="secondary" fontSize="small" />;
    if (feature.includes('API') || feature.includes('api')) return <Lock color="warning" fontSize="small" />;
    return <Check color="success" fontSize="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!teamId) {
    return (
      <Box my={6} id="subscription-management">
        <Alert severity="warning" variant="outlined">
          Please select a team to view and manage subscription plans.
        </Alert>
      </Box>
    );
  }

  return (
    <Box id="subscription-management">
      {error && (
        <Alert severity="error" sx={{ mb: 4 }} variant="filled">
          {error}
        </Alert>
      )}
      
      {/* Current Subscription Information - Only show if we have an active subscription */}
      {subscription && (
        <Paper elevation={0} sx={{ p: 4, mb: 6, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'rgba(25, 118, 210, 0.02)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Current Subscription
              </Typography>
              
              <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ mr: 1, fontWeight: 500 }}>
                  Status:
                </Typography>
                <Chip 
                  label={subscription.subscription.status.toUpperCase()} 
                  color={getStatusChipColor(subscription.subscription.status)}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            </Box>
            
            <Box>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleManagePaymentMethod}
                startIcon={<Shield />}
                sx={{ mr: 1 }}
              >
                Manage Payment Methods
              </Button>
              
              {subscription.subscription.status !== 'canceled' && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleCancelSubscription}
                  sx={{ mt: { xs: 1, sm: 0 } }}
                >
                  Cancel Subscription
                </Button>
              )}
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={3}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Plan
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {subscription.subscription.plan.toUpperCase()}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6} lg={3}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Billing Cycle
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {subscription.subscription.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6} lg={3}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Current Period Start
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {new Date(subscription.subscription.currentPeriodStart).toLocaleDateString()}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6} lg={3}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Next Billing Date
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Info color="primary" sx={{ mr: 1 }} />
              <Typography variant="body1" fontWeight="medium">
                CQ Intelligence Add-on
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Switch 
                checked={hasCQIntelligence()} 
                onChange={(e) => handleToggleCQIntelligence(e.target.checked)}
                disabled={loading}
                color="primary"
              />
              <Typography variant="body2" fontWeight="medium" sx={{ ml: 1 }}>
                {hasCQIntelligence() ? 'Enabled' : 'Disabled'} 
                <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                  (+${billingCycle === 'monthly' ? addons?.CQ_INTELLIGENCE?.price : (addons?.CQ_INTELLIGENCE?.annualPrice / 12).toFixed(0)}/mo)
                </Box>
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
      
      {/* Billing cycle toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Paper elevation={0} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 4 }}>
          <ToggleButtonGroup
            color="primary"
            value={billingCycle}
            exclusive
            onChange={handleBillingCycleChange}
            aria-label="billing cycle"
            size="medium"
            sx={{ '& .MuiToggleButton-root': { px: 3, py: 1 } }}
          >
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="annual">
              Annual
              <Chip 
                label="Save ~17%" 
                color="success" 
                size="small" 
                sx={{ ml: 1, height: '20px' }}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </Paper>
      </Box>
      
      {/* Subscription Plans */}
      <Grid container spacing={3} sx={{ mb: 8 }}>
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.subscription?.plan?.toUpperCase() === plan.id;
          const isPopularPlan = plan.id === 'PRO';
          const price = billingCycle === 'monthly' ? plan.price : (plan.annualPrice / 12).toFixed(0);
          
          return (
            <Grid item xs={12} md={6} lg={3} key={plan.id}>
              <Card 
                elevation={isHovering === plan.id ? 8 : (isPopularPlan ? 4 : 1)}
                onMouseEnter={() => setIsHovering(plan.id)}
                onMouseLeave={() => setIsHovering(null)}
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  transform: isPopularPlan ? 'scale(1.03)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                  borderRadius: 2,
                  overflow: 'visible',
                  ...(isCurrentPlan ? {
                    borderColor: 'primary.main',
                    borderWidth: 2,
                    borderStyle: 'solid'
                  } : {})
                }}
              >
                {isPopularPlan && (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: -12, 
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: 'secondary.main',
                      color: 'white',
                      px: 2,
                      py: 0.5,
                      borderRadius: '20px',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      zIndex: 2
                    }}
                  >
                    <Star fontSize="small" />
                    Most Popular
                  </Box>
                )}
                
                <CardContent sx={{ px: 3, py: 4, flexGrow: 1 }}>
                  <Typography 
                    variant="h5" 
                    component="h2" 
                    sx={{ 
                      fontWeight: 700, 
                      textAlign: 'center', 
                      mb: 1,
                      color: isPopularPlan ? 'secondary.main' : 'text.primary'
                    }}
                  >
                    {plan.name}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      textAlign: 'center', 
                      minHeight: '40px',
                      mb: 3
                    }}
                  >
                    {plan.description}
                  </Typography>
                  
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                      <Typography 
                        variant="h3" 
                        component="span" 
                        sx={{ 
                          fontWeight: 700,
                          color: isPopularPlan ? 'secondary.main' : 'primary.main'
                        }}
                      >
                        {plan.price === null ? '' : `$${price}`}
                      </Typography>
                      
                      <Typography variant="body1" color="text.secondary" component="span" sx={{ ml: 1 }}>
                        {plan.price === null ? 'Custom' : '/mo'}
                      </Typography>
                    </Box>
                    
                    {billingCycle === 'annual' && plan.annualPrice && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        ${plan.annualPrice} billed annually
                      </Typography>
                    )}
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <List sx={{ py: 0 }}>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index} disableGutters sx={{ py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {getFeatureIcon(feature)}
                        </ListItemIcon>
                        <ListItemText primary={feature} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                
                <CardActions sx={{ px: 3, pb: 3, pt: 0 }}>
                  <Button 
                    variant={isPopularPlan ? "contained" : "outlined"} 
                    fullWidth
                    size="large"
                    color={isPopularPlan ? "secondary" : "primary"}
                    disabled={loading || isCurrentPlan}
                    onClick={() => handleSubscribe(plan.id, billingCycle)}
                    sx={{ 
                      py: 1.5,
                      borderRadius: 6,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 500
                    }}
                    startIcon={plan.id === 'ENTERPRISE' ? <Lock /> : (isCurrentPlan ? <CheckCircle /> : null)}
                  >
                    {isCurrentPlan
                      ? 'Current Plan'
                      : plan.id === 'ENTERPRISE'
                        ? 'Contact Sales'
                        : `Subscribe${billingCycle === 'annual' ? ' Annually' : ''}`}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
      
      {/* CQ Intelligence Add-on Card */}
      <Typography variant="h6" sx={{ mt: 8, mb: 3, fontWeight: 700 }}>
        Powerful Add-ons
      </Typography>
      
      <Card 
        elevation={isHovering === 'cq_addon' ? 8 : 2}
        onMouseEnter={() => setIsHovering('cq_addon')}
        onMouseLeave={() => setIsHovering(null)}
        sx={{ 
          maxWidth: 500,
          borderRadius: 2,
          bgcolor: 'white',
          transition: 'all 0.3s ease',
          border: '1px solid #e0e0e0',
          mb: 6,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ bgcolor: 'primary.dark', color: 'white', p: 2, position: 'relative', overflow: 'hidden' }}>
          <Box 
            sx={{ 
              position: 'absolute', 
              top: -20, 
              right: -20, 
              width: 140, 
              height: 140, 
              borderRadius: '50%', 
              bgcolor: 'rgba(255,255,255,0.1)' 
            }} 
          />
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: -30, 
              left: -30, 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              bgcolor: 'rgba(255,255,255,0.05)' 
            }} 
          />
          
          <Typography variant="h5" fontWeight="bold" sx={{ position: 'relative', zIndex: 1 }}>
            CQ Intelligence
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, position: 'relative', zIndex: 1 }}>
            Power up your analytics with AI
          </Typography>
        </Box>
        
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
              <Typography variant="h4" component="span" fontWeight="bold" color="primary.main">
                ${billingCycle === 'monthly' ? 
                  addons?.CQ_INTELLIGENCE?.price : 
                  (addons?.CQ_INTELLIGENCE?.annualPrice / 12).toFixed(0)
                }
              </Typography>
              <Typography variant="body1" color="text.secondary" component="span" sx={{ ml: 1 }}>
                /mo
              </Typography>
            </Box>
            
            {billingCycle === 'annual' && addons?.CQ_INTELLIGENCE?.annualPrice && (
              <Typography variant="body2" color="text.secondary">
                ${addons?.CQ_INTELLIGENCE?.annualPrice} billed annually
              </Typography>
            )}
          </Box>
          
          <Typography variant="body1" sx={{ mb: 3 }}>
            {addons?.CQ_INTELLIGENCE?.description || 'AI-powered analytics and insights to supercharge your decision making with advanced predictive models and real-time data analysis.'}
          </Typography>
          
          <List>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Bolt color="primary" />
              </ListItemIcon>
              <ListItemText primary="Advanced AI analytics" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Check color="success" />
              </ListItemIcon>
              <ListItemText primary="Predictive insights dashboard" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Check color="success" />
              </ListItemIcon>
              <ListItemText primary="Custom report generation" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Check color="success" />
              </ListItemIcon>
              <ListItemText primary="Priority data processing" />
            </ListItem>
          </List>
        </CardContent>
        
        <Divider />
        
        <CardActions sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" width="100%">
            {subscription ? (
              <>
                <Typography variant="body2" fontWeight="medium">
                  {hasCQIntelligence() ? 'Enabled' : 'Disabled'}
                </Typography>
                <Switch 
                  checked={hasCQIntelligence()} 
                  onChange={(e) => handleToggleCQIntelligence(e.target.checked)}
                  disabled={loading || !subscription}
                  color="primary"
                />
                <Box sx={{ flexGrow: 1 }} />
                <Chip 
                  label={hasCQIntelligence() ? "Active" : "Inactive"} 
                  color={hasCQIntelligence() ? "success" : "default"}
                  size="small"
                />
              </>
            ) : (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                disabled
                size="large"
              >
                Subscribe to a plan first
              </Button>
            )}
          </Stack>
        </CardActions>
      </Card>
      
      {/* Dialogs */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="sm"
        PaperProps={{
          elevation: 8,
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div" fontWeight="bold">
            Cancel Subscription
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.
          </DialogContentText>
          <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
            Your subscription will remain active until {subscription && new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setCancelDialogOpen(false)} 
            variant="outlined"
            sx={{ borderRadius: 6 }}
          >
            Keep Subscription
          </Button>
          <Button 
            onClick={confirmCancelSubscription} 
            color="error" 
            variant="contained"
            sx={{ borderRadius: 6 }}
          >
            Cancel Subscription
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog
        open={upgradeDialogOpen}
        onClose={() => setUpgradeDialogOpen(false)}
        maxWidth="sm"
        PaperProps={{
          elevation: 8,
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div" fontWeight="bold">
            Confirm Subscription
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {subscription
              ? "You are about to change your subscription plan. Your new plan will take effect immediately and you'll be charged a prorated amount for the current billing period."
              : "You are about to subscribe to a new plan. You will be redirected to our payment processor to complete the subscription."}
          </DialogContentText>
          
          {selectedPlan && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Plan: {plans.find(p => p.id === selectedPlan)?.name}
              </Typography>
              <Typography variant="body2">
                Billing Cycle: {selectedPlanType === 'annual' ? 'Annual' : 'Monthly'}
              </Typography>
              <Typography variant="body2">
                Price: ${selectedPlanType === 'annual' 
                  ? plans.find(p => p.id === selectedPlan)?.annualPrice + '/year'
                  : plans.find(p => p.id === selectedPlan)?.price + '/month'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setUpgradeDialogOpen(false)} 
            sx={{ borderRadius: 6 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmSubscribe} 
            color="primary" 
            variant="contained"
            sx={{ borderRadius: 6 }}
          >
            Proceed to Checkout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StripeSubscription; 
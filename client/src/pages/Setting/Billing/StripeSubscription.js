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
import { Check, Info, Star, StarBorder } from '@mui/icons-material';
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
        
        // Fetch current subscription if team ID is available and looks valid
        // In production, we'd check for a valid MongoDB ID format
        if (teamId && teamId !== "temp-id") {
          const subscriptionData = await getSubscription(teamId);
          setSubscription(subscriptionData);
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

  const handleBillingCycleChange = (event, newBillingCycle) => {
    if (newBillingCycle !== null) {
      setBillingCycle(newBillingCycle);
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
        await addCQIntelligence(teamId, subscription.subscription.stripeSubscriptionId);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCurrentPlanDetails = () => {
    if (!subscription) return null;
    
    const planId = subscription.subscription.plan.toUpperCase();
    const plan = plans.find(p => p.id === planId);
    return plan;
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

  if (!teamId) {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Subscription Management
        </Typography>
        <Alert severity="warning">
          No team selected. Please select a team to manage subscriptions.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Subscription Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {!teamId && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No team selected. Please select a team to subscribe to a plan.
        </Alert>
      )}
      
      {/* Current Subscription Information - Only show if we have an active subscription */}
      {subscription ? (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Current Subscription
          </Typography>
          
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{ mr: 1 }}>
              Status:
            </Typography>
            <Chip 
              label={subscription.subscription.status.toUpperCase()} 
              color={getStatusChipColor(subscription.subscription.status)}
              size="small"
            />
          </Box>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Plan: <strong>{getCurrentPlanDetails()?.name || subscription.subscription.plan}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Billing Period: <strong>{billingCycle === 'monthly' ? 'Monthly' : 'Annual'}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Current Period Start: <strong>{formatDate(subscription.subscription.currentPeriodStart)}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Current Period End: <strong>{formatDate(subscription.subscription.currentPeriodEnd)}</strong>
              </Typography>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom>
            Add-ons:
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="body2">
              CQ Intelligence
            </Typography>
            <Switch 
              checked={hasCQIntelligence()} 
              onChange={(e) => handleToggleCQIntelligence(e.target.checked)}
              disabled={loading}
            />
            <Typography variant="body2" color="text.secondary">
              {hasCQIntelligence() ? 'Enabled' : 'Disabled'} 
              (+${addons?.CQ_INTELLIGENCE?.price || 299}/month)
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              color="primary"
              onClick={handleManagePaymentMethod}
              disabled={loading}
            >
              Manage Payment Methods
            </Button>
            <Button 
              variant="outlined" 
              color="error"
              onClick={handleCancelSubscription}
              disabled={loading || subscription.subscription.status === 'canceled' || subscription.subscription.status === 'cancelled'}
            >
              Cancel Subscription
            </Button>
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="body1" gutterBottom>
            {teamId === "temp-id" ? 
              "This is a preview of available plans. Select a valid team to subscribe." :
              "You don't have an active subscription."}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose a plan below to get started.
          </Typography>
        </Paper>
      )}
      
      {/* Billing cycle toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4, mt: 4 }}>
        <Paper elevation={0} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 2 }}>
          <ToggleButtonGroup
            color="primary"
            value={billingCycle}
            exclusive
            onChange={handleBillingCycleChange}
            aria-label="billing cycle"
            size="small"
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
      <Typography variant="h6" gutterBottom>
        Available Plans
      </Typography>
      
      <Grid container spacing={3}>
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.subscription?.plan?.toUpperCase() === plan.id;
          const isPopularPlan = plan.id === 'PRO';
          
          return (
            <Grid item xs={12} md={6} lg={3} key={plan.id}>
              <Card 
                elevation={isPopularPlan ? 3 : 1}
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  transform: isPopularPlan ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: isPopularPlan ? 'scale(1.04)' : 'scale(1.02)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                  },
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
                      top: 0, 
                      right: 20, 
                      transform: 'translateY(-50%)',
                      bgcolor: 'secondary.main',
                      color: 'white',
                      px: 2,
                      py: 0.5,
                      borderRadius: '16px',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    <Star fontSize="small" />
                    MOST POPULAR
                  </Box>
                )}
                
                <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{plan.name}</span>
                    {isCurrentPlan && (
                      <Chip 
                        label="Current" 
                        color="primary" 
                        size="small"
                      />
                    )}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h4" color="primary" component="div" sx={{ display: 'flex', alignItems: 'baseline' }}>
                      ${billingCycle === 'monthly' ? plan.price : (plan.annualPrice / 12).toFixed(0)}
                      <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                        /mo
                      </Typography>
                    </Typography>
                    
                    {billingCycle === 'annual' && plan.annualPrice && (
                      <Typography variant="body2" color="text.secondary">
                        ${plan.annualPrice}/year (billed annually)
                      </Typography>
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph sx={{ minHeight: '40px' }}>
                    {plan.description}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <List dense>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Check color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    variant={isPopularPlan ? "contained" : "outlined"} 
                    fullWidth
                    size="large"
                    color={isPopularPlan ? "secondary" : "primary"}
                    disabled={
                      loading || 
                      isCurrentPlan ||
                      plan.id === 'ENTERPRISE'
                    }
                    onClick={() => handleSubscribe(plan.id, billingCycle)}
                    sx={{ py: 1.5 }}
                  >
                    {isCurrentPlan
                      ? 'Current Plan'
                      : plan.id === 'ENTERPRISE'
                        ? 'Contact Sales'
                        : 'Subscribe'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
      
      {/* CQ Intelligence Add-on Card */}
      <Typography variant="h6" sx={{ mt: 6, mb: 3 }}>
        Powerful Add-ons
      </Typography>
      
      <Card 
        variant="outlined" 
        sx={{ 
          maxWidth: 400,
          borderRadius: 2,
          bgcolor: 'rgba(25, 118, 210, 0.03)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
          }
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box 
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white', 
                width: 40, 
                height: 40, 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}
            >
              <Info />
            </Box>
            <Typography variant="h6">
              CQ Intelligence
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" color="primary" component="div" sx={{ display: 'flex', alignItems: 'baseline' }}>
              ${billingCycle === 'monthly' ? 
                addons?.CQ_INTELLIGENCE?.price : 
                (addons?.CQ_INTELLIGENCE?.annualPrice / 12).toFixed(0)
              }
              <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                /mo
              </Typography>
            </Typography>
            
            {billingCycle === 'annual' && addons?.CQ_INTELLIGENCE?.annualPrice && (
              <Typography variant="body2" color="text.secondary">
                ${addons?.CQ_INTELLIGENCE?.annualPrice}/year (billed annually)
              </Typography>
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            {addons?.CQ_INTELLIGENCE?.description || 'AI-powered analytics and insights to supercharge your decision making'}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <List dense>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 30 }}>
                <Check color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Advanced AI analytics" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 30 }}>
                <Check color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Predictive insights" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 30 }}>
                <Check color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Automated reporting" />
            </ListItem>
          </List>
        </CardContent>
        
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" width="100%">
            <Switch 
              checked={hasCQIntelligence()} 
              onChange={(e) => handleToggleCQIntelligence(e.target.checked)}
              disabled={loading || !subscription}
            />
            <Typography variant="body2" fontWeight="500">
              {hasCQIntelligence() ? 'Enabled' : 'Disabled'}
            </Typography>
            
            {!subscription && (
              <Tooltip title="Subscribe to a plan first to enable add-ons">
                <Box sx={{ ml: 'auto' }}>
                  <Info color="info" fontSize="small" />
                </Box>
              </Tooltip>
            )}
          </Stack>
        </CardActions>
      </Card>
      
      {/* Cancel Subscription Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>Cancel Subscription</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} color="primary">
            No, Keep Subscription
          </Button>
          <Button onClick={confirmCancelSubscription} color="error">
            Yes, Cancel Subscription
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Upgrade/Change Plan Dialog */}
      <Dialog
        open={upgradeDialogOpen}
        onClose={() => setUpgradeDialogOpen(false)}
      >
        <DialogTitle>Confirm Subscription Change</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {subscription
              ? "You are about to change your subscription plan. Your new plan will take effect immediately and you'll be charged a prorated amount for the current billing period."
              : "You are about to subscribe to a new plan. You will be redirected to our payment processor to complete the subscription."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmSubscribe} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StripeSubscription; 
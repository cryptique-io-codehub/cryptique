import { createContext, useContext, useState, useEffect } from 'react';
import { useTeam } from './teamContext';
import axios from 'axios';

const SubscriptionContext = createContext();

// Premium plans that should give users access to all features
const PREMIUM_PLANS = ['basic', 'pro', 'enterprise'];

export const SubscriptionProvider = ({ children }) => {
  const { selectedTeam } = useTeam();
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isActive: false,
    plan: 'free',
    status: 'inactive',
    loading: true,
    error: null
  });

  // Fetch subscription status when team changes
  useEffect(() => {
    if (!selectedTeam || !selectedTeam._id) {
      setSubscriptionStatus({
        isActive: false,
        plan: 'free',
        status: 'inactive',
        loading: false,
        error: null
      });
      return;
    }

    console.log('Selected team in subscription context:', selectedTeam);
    console.log('Team subscription data:', selectedTeam.subscription);

    const fetchSubscription = async () => {
      try {
        setSubscriptionStatus(prev => ({ ...prev, loading: true, error: null }));
        
        // Get subscription details from the team object if available
        if (selectedTeam.subscription) {
          const { plan, status } = selectedTeam.subscription;
          
          // Normalize plan name to lowercase for consistent comparison
          const planLower = (plan || '').toLowerCase();
          
          // Check if plan is premium and status is active
          const isPremiumPlan = PREMIUM_PLANS.includes(planLower);
          const isActive = status === 'active' && isPremiumPlan;
          
          console.log('Using subscription from team object:', { plan, status, planLower, isPremiumPlan, isActive });
          
          setSubscriptionStatus({
            isActive,
            plan: plan || 'free',
            status: status || 'inactive',
            loading: false,
            error: null
          });
          return;
        }
        
        // Otherwise fetch from API
        const response = await axios.get(`/api/teams/${selectedTeam._id}/subscription`);
        console.log('API subscription response:', response.data);
        
        if (response.data && response.data.subscription) {
          const { plan, status } = response.data.subscription;
          
          // Normalize plan name to lowercase for consistent comparison
          const planLower = (plan || '').toLowerCase();
          
          // Check if plan is premium and status is active
          const isPremiumPlan = PREMIUM_PLANS.includes(planLower);
          const isActive = status === 'active' && isPremiumPlan;
          
          console.log('Using subscription from API:', { plan, status, planLower, isPremiumPlan, isActive });
          
          setSubscriptionStatus({
            isActive,
            plan: plan || 'free',
            status: status || 'inactive',
            loading: false,
            error: null
          });
        } else {
          setSubscriptionStatus({
            isActive: false,
            plan: 'free',
            status: 'inactive',
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Error fetching subscription status:', error);
        setSubscriptionStatus({
          isActive: false,
          plan: 'free',
          status: 'inactive',
          loading: false,
          error: error.message
        });
      }
    };

    fetchSubscription();
  }, [selectedTeam]);

  return (
    <SubscriptionContext.Provider value={subscriptionStatus}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}; 
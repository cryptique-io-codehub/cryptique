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
        
        // Use the same API endpoint as the Billing component for consistency
        const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';
        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
        
        // Make API call to get subscription information
        const response = await axios.get(`${API_URL}/api/stripe/subscription/${selectedTeam._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('API subscription response (Stripe):', response.data);
        
        if (response.data && response.data.subscription) {
          const { plan, status } = response.data.subscription;
          
          // Normalize plan name to lowercase for consistent comparison
          const planLower = (plan || '').toLowerCase();
          
          // Check if plan is premium and status is active
          const isPremiumPlan = PREMIUM_PLANS.includes(planLower);
          const isActive = status === 'active' && isPremiumPlan;
          
          console.log('Using subscription from Stripe API:', { plan, status, planLower, isPremiumPlan, isActive });
          
          setSubscriptionStatus({
            isActive,
            plan: plan || 'free',
            status: status || 'inactive',
            loading: false,
            error: null
          });
        } else {
          // Fallback 1: Check if subscription data is in the team object
          if (selectedTeam.subscription) {
            const { plan, status } = selectedTeam.subscription;
            
            // Normalize plan name to lowercase for consistent comparison
            const planLower = (plan || '').toLowerCase();
            
            // Check if plan is premium and status is active
            const isPremiumPlan = PREMIUM_PLANS.includes(planLower);
            const isActive = status === 'active' && isPremiumPlan;
            
            console.log('Fallback: Using subscription from team object:', { plan, status, planLower, isPremiumPlan, isActive });
            
            setSubscriptionStatus({
              isActive,
              plan: plan || 'free',
              status: status || 'inactive',
              loading: false,
              error: null
            });
            return;
          }
          
          // Fallback 2: Try the original API endpoint
          try {
            const fallbackResponse = await axios.get(`${API_URL}/api/teams/${selectedTeam._id}/subscription`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            console.log('Fallback API subscription response:', fallbackResponse.data);
            
            if (fallbackResponse.data && fallbackResponse.data.subscription) {
              const { plan, status } = fallbackResponse.data.subscription;
              
              // Normalize plan name to lowercase for consistent comparison
              const planLower = (plan || '').toLowerCase();
              
              // Check if plan is premium and status is active
              const isPremiumPlan = PREMIUM_PLANS.includes(planLower);
              const isActive = status === 'active' && isPremiumPlan;
              
              console.log('Using subscription from fallback API:', { plan, status, planLower, isPremiumPlan, isActive });
              
              setSubscriptionStatus({
                isActive,
                plan: plan || 'free',
                status: status || 'inactive',
                loading: false,
                error: null
              });
              return;
            }
          } catch (fallbackError) {
            console.error('Fallback API call failed:', fallbackError);
          }
          
          // If all attempts fail, set to free/inactive
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
        
        // If API call fails, try to use the team object as fallback
        if (selectedTeam.subscription) {
          const { plan, status } = selectedTeam.subscription;
          
          // Normalize plan name to lowercase for consistent comparison
          const planLower = (plan || '').toLowerCase();
          
          // Check if plan is premium and status is active
          const isPremiumPlan = PREMIUM_PLANS.includes(planLower);
          const isActive = status === 'active' && isPremiumPlan;
          
          console.log('Error fallback: Using subscription from team object:', { plan, status, planLower, isPremiumPlan, isActive });
          
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
            error: error.message
          });
        }
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
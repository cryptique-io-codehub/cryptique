import { createContext, useContext, useState, useEffect } from 'react';
import { useTeam } from './teamContext';
import axios from 'axios';

const SubscriptionContext = createContext();

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

    const fetchSubscription = async () => {
      try {
        setSubscriptionStatus(prev => ({ ...prev, loading: true, error: null }));
        
        // Get subscription details from the team object if available
        if (selectedTeam.subscription) {
          const { plan, status } = selectedTeam.subscription;
          const isActive = status === 'active' && plan !== 'free';
          
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
        
        if (response.data && response.data.subscription) {
          const { plan, status } = response.data.subscription;
          const isActive = status === 'active' && plan !== 'free';
          
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
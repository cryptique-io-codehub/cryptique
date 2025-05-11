import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/subscriptionContext';
import SubscriptionRequired from '../components/SubscriptionRequired';
import axiosInstance from '../axiosInstance';

/**
 * Higher-order component that checks if a user has an active subscription
 * @param {React.Component} Component - The component to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.feature - The feature name to check access for
 * @param {string} options.featureName - Human-readable feature name for error messages
 * @param {boolean} options.redirectToSettings - Whether to redirect to settings page on subscription required
 */
const withSubscriptionCheck = (
  Component, 
  { 
    feature, 
    featureName = 'this feature',
    redirectToSettings = false
  } = {}
) => {
  const WithSubscriptionCheck = (props) => {
    const { team } = useParams();
    const navigate = useNavigate();
    const { hasActiveSubscription, isInGracePeriod, checkSubscription } = useSubscription();
    
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [subscriptionData, setSubscriptionData] = useState(null);
    
    useEffect(() => {
      const checkAccess = async () => {
        if (!team) {
          setLoading(false);
          return;
        }
        
        try {
          // First, update the global subscription status
          await checkSubscription(team);
          
          if (feature) {
            // Check if the user has access to this specific feature
            const response = await axiosInstance.post('/team/check-feature-access', {
              teamName: team,
              feature
            });
            
            setHasAccess(response.data.hasAccess);
            
            if (!response.data.hasAccess) {
              setSubscriptionData({
                subscriptionStatus: response.data.subscriptionStatus,
                subscriptionPlan: response.data.subscriptionPlan,
                message: response.data.message
              });
              
              // Optionally redirect to settings
              if (redirectToSettings) {
                navigate(`/${team}/settings/pricing`);
              }
            }
          } else {
            // If no specific feature is provided, just check if subscription is active
            setHasAccess(hasActiveSubscription || isInGracePeriod);
            
            if (!hasActiveSubscription && !isInGracePeriod) {
              // Optionally redirect to settings
              if (redirectToSettings) {
                navigate(`/${team}/settings/pricing`);
              }
            }
          }
        } catch (error) {
          console.error('Error checking subscription access:', error);
          setHasAccess(false);
          
          // Extract subscription data from error response if available
          if (error.response && error.response.data && error.response.data.subscriptionRequired) {
            setSubscriptionData({
              subscriptionStatus: error.response.data.subscriptionStatus,
              subscriptionPlan: error.response.data.subscriptionPlan,
              message: error.response.data.message
            });
          }
          
          // Optionally redirect to settings
          if (redirectToSettings) {
            navigate(`/${team}/settings/pricing`);
          }
        } finally {
          setLoading(false);
        }
      };
      
      checkAccess();
    }, [team, feature, checkSubscription, hasActiveSubscription, isInGracePeriod, navigate, redirectToSettings]);
    
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      );
    }
    
    if (!hasAccess) {
      return (
        <SubscriptionRequired 
          subscriptionStatus={subscriptionData?.subscriptionStatus || 'inactive'}
          subscriptionPlan={subscriptionData?.subscriptionPlan || 'none'}
          teamName={team}
          featureName={featureName}
        />
      );
    }
    
    return <Component {...props} />;
  };
  
  return WithSubscriptionCheck;
};

export default withSubscriptionCheck; 
import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';

// Create the subscription context
const SubscriptionContext = createContext();

// Create provider component
export const SubscriptionProvider = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gracePeriod, setGracePeriod] = useState(null);
  
  // Function to check subscription status
  const checkSubscription = async (teamName) => {
    if (!teamName) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/team/subscription-status/${teamName}`);
      
      setSubscriptionStatus({
        status: response.data.subscription?.status || 'inactive',
        plan: response.data.subscription?.plan || 'none',
        currentPeriodEnd: response.data.subscription?.currentPeriodEnd,
        isActive: response.data.subscription?.status === 'active' || 
                  response.data.subscription?.status === 'trialing'
      });
      
      // Set grace period information if available
      if (response.data.inGracePeriod) {
        setGracePeriod({
          inGracePeriod: true,
          daysLeft: response.data.gracePeriod?.daysLeft || 0,
          endDate: response.data.gracePeriod?.endDate,
          subscriptionEndDate: response.data.gracePeriod?.subscriptionEndDate
        });
      } else {
        setGracePeriod(null);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error checking subscription status:', err);
      setError('Failed to check subscription status');
      
      // Default to inactive if there's an error
      setSubscriptionStatus({
        status: 'error',
        plan: 'none',
        isActive: false
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to check if a subscription is required for a specific feature
  const requiresSubscription = async (teamName, feature) => {
    try {
      const response = await axiosInstance.post(`/team/check-feature-access`, {
        teamName,
        feature
      });
      
      return {
        hasAccess: response.data.hasAccess,
        subscriptionRequired: !response.data.hasAccess,
        message: response.data.message,
        gracePeriod: response.data.gracePeriod
      };
    } catch (err) {
      console.error(`Error checking access to ${feature}:`, err);
      
      // If we get a 403 with subscription required, return that info
      if (err.response && err.response.status === 403 && err.response.data.subscriptionRequired) {
        return {
          hasAccess: false,
          subscriptionRequired: true,
          subscriptionStatus: err.response.data.subscriptionStatus,
          subscriptionPlan: err.response.data.subscriptionPlan,
          message: err.response.data.message
        };
      }
      
      // Default error response
      return {
        hasAccess: false,
        subscriptionRequired: true,
        message: 'Error checking feature access'
      };
    }
  };
  
  // Value to be provided by the context
  const value = {
    subscriptionStatus,
    gracePeriod,
    loading,
    error,
    checkSubscription,
    requiresSubscription,
    hasActiveSubscription: subscriptionStatus?.isActive || false,
    isInGracePeriod: gracePeriod?.inGracePeriod || false
  };
  
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// Custom hook to use the subscription context
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export default SubscriptionContext; 
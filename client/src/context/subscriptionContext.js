import React, { createContext, useState, useContext, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { useTeam } from './teamContext';

// Create subscription context
export const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [gracePeriodInfo, setGracePeriodInfo] = useState(null);
  const [plan, setPlan] = useState('free');
  const [errorMessage, setErrorMessage] = useState(null);
  const { selectedTeam } = useTeam();

  // Feature access control based on subscription plan
  const [featureAccess, setFeatureAccess] = useState({
    offchainAnalytics: false,
    onchainExplorer: false,
    campaigns: false,
    conversionEvents: false,
    cqIntelligence: false, 
    history: false,
    advertise: false,
    manageWebsites: true, // Always allow access to manage websites
    importUsers: false
  });

  // Check team's subscription status
  const checkSubscriptionStatus = async () => {
    if (!selectedTeam) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/team/subscription-status/${selectedTeam}`);
      
      // Update subscription status
      setSubscriptionData(response.data);
      
      // Extract grace period info if present
      if (response.data.inGracePeriod) {
        setInGracePeriod(true);
        setGracePeriodInfo(response.data.gracePeriod);
      } else {
        setInGracePeriod(false);
        setGracePeriodInfo(null);
      }
      
      // Set active flag based on status
      setHasActiveSubscription(
        response.data.status === 'active' || 
        (response.data.inGracePeriod && response.data.type !== 'free')
      );
      
      // Set plan type
      setPlan(response.data.plan || 'free');
      
      // Update feature access based on plan
      updateFeatureAccess(response.data.plan, response.data.status === 'active');
      
    } catch (error) {
      console.error("Error checking subscription status:", error);
      // Fallback to free plan if error occurs
      setPlan('free');
      setHasActiveSubscription(false);
      updateFeatureAccess('free', false);
      
      if (error.response && error.response.data) {
        setErrorMessage(error.response.data.message || "Failed to verify subscription status");
      } else {
        setErrorMessage("Network error when checking subscription status");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Update feature access based on plan and status
  const updateFeatureAccess = (planType, isActive) => {
    const hasAccess = isActive || planType === 'free';
    
    switch (planType) {
      case 'enterprise':
        // Enterprise has access to everything
        setFeatureAccess({
          offchainAnalytics: hasAccess,
          onchainExplorer: hasAccess,
          campaigns: hasAccess,
          conversionEvents: hasAccess,
          cqIntelligence: hasAccess,
          history: hasAccess,
          advertise: hasAccess,
          manageWebsites: true, // Always allow access
          importUsers: hasAccess
        });
        break;
        
      case 'premium':
        // Premium has access to most features
        setFeatureAccess({
          offchainAnalytics: hasAccess,
          onchainExplorer: hasAccess,
          campaigns: hasAccess,
          conversionEvents: hasAccess,
          cqIntelligence: false, // Enterprise only
          history: hasAccess,
          advertise: false, // Enterprise only
          manageWebsites: true, // Always allow access
          importUsers: hasAccess
        });
        break;
        
      case 'pro':
        // Pro has access to basic analytics features
        setFeatureAccess({
          offchainAnalytics: hasAccess,
          onchainExplorer: hasAccess,
          campaigns: false, // Premium+ only
          conversionEvents: false, // Premium+ only
          cqIntelligence: false, // Enterprise only
          history: hasAccess,
          advertise: false, // Enterprise only
          manageWebsites: true, // Always allow access
          importUsers: false // Premium+ only
        });
        break;
        
      case 'standard':
        // Standard has limited access
        setFeatureAccess({
          offchainAnalytics: hasAccess,
          onchainExplorer: false, // Pro+ only
          campaigns: false, // Premium+ only
          conversionEvents: false, // Premium+ only
          cqIntelligence: false, // Enterprise only
          history: hasAccess,
          advertise: false, // Enterprise only
          manageWebsites: true, // Always allow access
          importUsers: false // Premium+ only
        });
        break;
        
      case 'free':
      default:
        // Free has minimal access
        setFeatureAccess({
          offchainAnalytics: false,
          onchainExplorer: false,
          campaigns: false,
          conversionEvents: false,
          cqIntelligence: false,
          history: false,
          advertise: false,
          manageWebsites: true, // Allow access to manage websites even on free
          importUsers: false
        });
        break;
    }
  };

  // Check subscription status when team changes
  useEffect(() => {
    checkSubscriptionStatus();
  }, [selectedTeam]);

  // Trigger a check every 15 minutes to catch any subscription changes
  useEffect(() => {
    const interval = setInterval(() => {
      checkSubscriptionStatus();
    }, 15 * 60 * 1000); // 15 minutes
    
    return () => clearInterval(interval);
  }, [selectedTeam]);

  // Provide hasAccess function to easily check feature access
  const hasAccess = (feature) => {
    return featureAccess[feature] || false;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isLoading,
        hasActiveSubscription,
        subscriptionData,
        inGracePeriod,
        gracePeriodInfo,
        plan,
        errorMessage,
        featureAccess,
        hasAccess,
        checkSubscriptionStatus
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

// Custom hook to use subscription context
export const useSubscription = () => useContext(SubscriptionContext); 
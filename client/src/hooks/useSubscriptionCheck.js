import { useState, useEffect, useCallback } from 'react';
import { getActiveSubscription } from '../axiosInstance';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Custom hook to check and enforce subscription feature limits
 */
const useSubscriptionCheck = () => {
  const { team } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the active subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!team) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getActiveSubscription(team);
        setSubscription(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError('Failed to check subscription status');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [team]);

  /**
   * Check if the current subscription allows access to a specific feature
   * @param {string} feature - Feature to check (websites, contracts, teamMembers, apiCalls, cqIntelligence)
   * @param {number} requestedValue - The requested value (e.g., number of websites)
   * @param {boolean} redirectOnFailure - Whether to redirect to billing page on failure
   * @returns {boolean} Whether access is allowed
   */
  const checkAccess = useCallback((feature, requestedValue = 1, redirectOnFailure = false) => {
    if (loading) return false;
    
    // If no subscription found, no access
    if (!subscription) {
      if (redirectOnFailure) {
        navigate(`/${team}/settings/billing?upgrade=true&feature=${feature}`);
      }
      return false;
    }

    let hasAccess = false;

    switch (feature) {
      case 'websites':
        hasAccess = subscription.features.maxWebsites >= requestedValue;
        break;
      case 'contracts':
        hasAccess = subscription.features.maxContracts >= requestedValue;
        break;
      case 'teamMembers':
        hasAccess = subscription.features.maxTeamMembers >= requestedValue;
        break;
      case 'apiCalls':
        hasAccess = subscription.features.maxApiCalls >= requestedValue;
        break;
      case 'cqIntelligence':
        hasAccess = subscription.features.hasCQIntelligence;
        break;
      default:
        hasAccess = false;
    }

    if (!hasAccess && redirectOnFailure) {
      navigate(`/${team}/settings/billing?upgrade=true&feature=${feature}`);
    }

    return hasAccess;
  }, [loading, subscription, team, navigate]);

  /**
   * Get the current usage and limits for a feature
   * @param {string} feature - Feature to check (websites, contracts, teamMembers, apiCalls)
   * @returns {Object} Object containing current usage and limit
   */
  const getFeatureUsageAndLimit = useCallback((feature) => {
    if (!subscription) {
      return { usage: 0, limit: 0 };
    }

    switch (feature) {
      case 'websites':
        return { 
          usage: 0, // This should be filled with actual data
          limit: subscription.features.maxWebsites 
        };
      case 'contracts':
        return { 
          usage: 0, // This should be filled with actual data
          limit: subscription.features.maxContracts 
        };
      case 'teamMembers':
        return { 
          usage: 0, // This should be filled with actual data
          limit: subscription.features.maxTeamMembers 
        };
      case 'apiCalls':
        return { 
          usage: 0, // This should be filled with actual data
          limit: subscription.features.maxApiCalls 
        };
      default:
        return { usage: 0, limit: 0 };
    }
  }, [subscription]);

  return {
    subscription,
    loading,
    error,
    checkAccess,
    getFeatureUsageAndLimit
  };
};

export default useSubscriptionCheck; 
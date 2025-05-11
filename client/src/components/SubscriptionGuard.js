import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSubscription } from '../context/subscriptionContext';

/**
 * SubscriptionGuard - A component to guard routes based on subscription status
 * 
 * @param {Object} props
 * @param {string} props.feature - The feature to check access for
 * @param {React.ReactNode} props.children - The protected component to render if access is granted
 * @returns {React.ReactNode}
 */
const SubscriptionGuard = ({ feature, children }) => {
  const { 
    isLoading, 
    hasAccess, 
    plan, 
    inGracePeriod,
    gracePeriodInfo,
    subscriptionData
  } = useSubscription();
  const location = useLocation();
  const teamName = location.pathname.split('/')[1];
  
  // If still loading, show loading indicator
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking subscription status...</p>
        </div>
      </div>
    );
  }
  
  // If user has access to this feature, render the children
  if (hasAccess(feature)) {
    return children;
  }
  
  // If in grace period, show grace period message
  if (inGracePeriod) {
    const daysLeft = gracePeriodInfo?.daysLeft || 0;
    
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-yellow-100 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Subscription in Grace Period</h1>
          <p className="text-center text-gray-600 mb-6">
            Your subscription has expired but is currently in the grace period.
            You have <span className="font-bold text-yellow-600">{daysLeft} days</span> left to renew.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-yellow-800 mb-6">
            <p className="text-sm">
              During the grace period, you have limited access to the platform. 
              To regain full access, please update your payment information.
            </p>
          </div>
          
          <div className="flex justify-center">
            <a 
              href={`/${teamName}/settings/billing`} 
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md font-medium transition-colors"
            >
              Update Payment Information
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // Not in grace period and doesn't have feature access, show upgrade screen
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Upgrade Your Plan to Access {getFeatureName(feature)}
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Your current plan ({plan.toUpperCase()}) doesn't include access to this feature.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-blue-800 mb-6">
          <p className="font-medium mb-2">Features available in higher plans:</p>
          <ul className="list-disc pl-5 space-y-1">
            {getRequiredPlanFeatures(feature).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        
        <div className="flex justify-center">
          <a 
            href={`/${teamName}/settings/billing`} 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
          >
            Upgrade Plan
          </a>
        </div>
      </div>
    </div>
  );
};

// Helper function to get a user-friendly feature name
function getFeatureName(feature) {
  const featureNames = {
    offchainAnalytics: 'Off-chain Analytics',
    onchainExplorer: 'On-chain Explorer',
    campaigns: 'Campaigns',
    conversionEvents: 'Conversion Events',
    cqIntelligence: 'CQ Intelligence',
    history: 'User History',
    advertise: 'Advertise',
    manageWebsites: 'Manage Websites',
    importUsers: 'Import Users'
  };
  
  return featureNames[feature] || feature;
}

// Helper function to get feature descriptions for the required plan
function getRequiredPlanFeatures(feature) {
  switch (feature) {
    case 'offchainAnalytics':
      return [
        'Track website visitors and their behavior',
        'Analyze user engagement metrics',
        'View page performance data'
      ];
    case 'onchainExplorer':
      return [
        'Analyze on-chain transactions',
        'Track smart contract interactions',
        'Monitor blockchain activity'
      ];
    case 'campaigns':
      return [
        'Create and manage marketing campaigns',
        'Track campaign performance',
        'A/B testing capabilities'
      ];
    case 'conversionEvents':
      return [
        'Define custom conversion events',
        'Track conversions across your website',
        'Optimize user flows for higher conversion'
      ];
    case 'cqIntelligence':
      return [
        'Advanced analytics and insights',
        'AI-powered recommendations',
        'Predictive analytics for user behavior'
      ];
    case 'history':
      return [
        'View detailed user journey history',
        'Analyze user paths and interactions',
        'Track conversion funnels'
      ];
    case 'advertise':
      return [
        'Run targeted advertising campaigns',
        'Retargeting capabilities',
        'Advanced audience segmentation'
      ];
    case 'importUsers':
      return [
        'Import user data from external sources',
        'Batch processing of user information',
        'Integrate with existing user databases'
      ];
    default:
      return [
        'Advanced analytics capabilities',
        'Enhanced reporting features',
        'Premium support and more resources'
      ];
  }
}

export default SubscriptionGuard; 
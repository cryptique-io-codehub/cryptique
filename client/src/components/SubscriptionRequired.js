import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const SubscriptionRequired = ({ 
  subscriptionStatus = 'inactive', 
  subscriptionPlan = 'none',
  teamName,
  featureName = 'this feature' 
}) => {
  const navigate = useNavigate();
  
  // Determine message based on subscription status
  const getMessage = () => {
    switch (subscriptionStatus) {
      case 'canceled':
        return `Your ${subscriptionPlan} plan has been canceled. To access ${featureName}, please renew your subscription.`;
      case 'past_due':
        return `Your payment for the ${subscriptionPlan} plan is past due. To continue accessing ${featureName}, please update your payment method.`;
      case 'unpaid':
        return `Your subscription payment for the ${subscriptionPlan} plan was unsuccessful. To regain access to ${featureName}, please update your payment method.`;
      case 'incomplete':
        return `Your subscription setup is incomplete. To access ${featureName}, please complete your subscription.`;
      case 'incomplete_expired':
        return `Your subscription setup expired before completion. To access ${featureName}, please set up a new subscription.`;
      default:
        return `You need an active subscription to access ${featureName}. Please subscribe to one of our plans.`;
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-50 p-4">
      <div className="max-w-md w-full bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
          <div className="flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center">Subscription Required</h2>
        </div>
        
        <div className="p-6">
          <div className="mb-6 text-center">
            <p className="text-gray-700 mb-4">{getMessage()}</p>
            
            <div className="p-4 mb-4 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Current plan:</span> {subscriptionPlan === 'none' ? 'No active plan' : subscriptionPlan}
              </p>
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Status:</span> {subscriptionStatus}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => navigate(`/${teamName}/settings/pricing`)}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-md shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1"
            >
              View Pricing Plans
            </button>
            
            <button
              onClick={() => navigate(`/${teamName}/settings/billing`)}
              className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md transition duration-300 ease-in-out"
            >
              Manage Billing
            </button>
            
            <button
              onClick={() => navigate(`/${teamName}/settings`)}
              className="w-full py-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequired; 
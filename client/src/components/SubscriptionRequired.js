import React from 'react';
import { useSubscription } from '../context/subscriptionContext';
import { useNavigate } from 'react-router-dom';
import { useTeam } from '../context/teamContext';
import { CreditCard, Lock, Sparkles } from 'lucide-react';

/**
 * Component that restricts access to premium content based on subscription status
 * Shows a blur overlay with a message and upgrade button when subscription is inactive
 */
const SubscriptionRequired = ({ children, featureName = 'premium features' }) => {
  const { isActive, plan, status, loading } = useSubscription();
  const { selectedTeam } = useTeam();
  const navigate = useNavigate();

  const handleNavigateToBilling = () => {
    if (selectedTeam && selectedTeam._id) {
      navigate(`/${selectedTeam._id}/settings/billing`);
    } else {
      navigate('/dashboard');
    }
  };

  // If subscription is active or loading, show the children
  if (isActive || loading) {
    return <>{children}</>;
  }

  // Otherwise show blurred content with upgrade prompt
  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden">
      {/* Blurred content in background */}
      <div className="absolute inset-0 filter blur-md opacity-30 pointer-events-none">
        {children}
      </div>

      {/* Upgrade message overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-opacity-80 bg-white dark:bg-gray-900 dark:bg-opacity-90 z-10">
        <div className="max-w-lg w-full mx-4 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-100 dark:bg-indigo-900 p-4 rounded-full">
              <Lock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            This feature requires a premium plan
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {plan === 'free' ? (
              <>
                You're currently using the <span className="font-medium">free plan</span>. 
                Upgrade to access {featureName} and unlock all premium features.
              </>
            ) : (
              <>
                Your subscription status is <span className="font-medium">{status}</span>. 
                Activate your subscription to access {featureName}.
              </>
            )}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <div className="flex items-center justify-center">
              <Sparkles className="h-5 w-5 mr-2 text-amber-500" />
              <span className="text-gray-700 dark:text-gray-200">Analytics</span>
            </div>
            <div className="flex items-center justify-center">
              <Sparkles className="h-5 w-5 mr-2 text-amber-500" />
              <span className="text-gray-700 dark:text-gray-200">Smart Contracts</span>
            </div>
            <div className="flex items-center justify-center">
              <Sparkles className="h-5 w-5 mr-2 text-amber-500" />
              <span className="text-gray-700 dark:text-gray-200">Insights</span>
            </div>
          </div>
          
          <button
            onClick={handleNavigateToBilling}
            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors w-full sm:w-auto"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequired; 
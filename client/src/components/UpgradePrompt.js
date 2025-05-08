import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, AlertTriangle } from 'lucide-react';

/**
 * Component to display when a user needs to upgrade their subscription
 * @param {Object} props
 * @param {string} props.feature - The feature that requires an upgrade
 * @param {string} props.teamId - The team ID
 * @param {string} props.currentPlan - The current plan name
 * @param {string} props.recommendedPlan - The recommended plan name
 */
const UpgradePrompt = ({ 
  feature, 
  teamId, 
  currentPlan = 'current', 
  recommendedPlan = 'higher'
}) => {
  // Map feature names to user-friendly descriptions
  const featureDescriptions = {
    websites: 'adding more websites',
    contracts: 'adding more smart contracts',
    teamMembers: 'adding more team members',
    apiCalls: 'making more API calls',
    cqIntelligence: 'accessing CQ Intelligence features'
  };

  // Map feature names to plan recommendations
  const planRecommendations = {
    websites: {
      offchain: 'Basic',
      basic: 'Pro',
      pro: 'Enterprise'
    },
    contracts: {
      offchain: 'Basic',
      basic: 'Pro',
      pro: 'Enterprise'
    },
    teamMembers: {
      offchain: 'Basic',
      basic: 'Pro',
      pro: 'Enterprise'
    },
    apiCalls: {
      offchain: 'Basic',
      basic: 'Pro',
      pro: 'Enterprise'
    },
    cqIntelligence: 'any plan with CQ Intelligence add-on'
  };

  // Get dynamic content based on feature
  const featureDescription = featureDescriptions[feature] || 'accessing this feature';
  const recommendedUpgrade = planRecommendations[feature]?.[currentPlan] || planRecommendations[feature] || recommendedPlan;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="bg-blue-100 p-3 rounded-full">
          <Zap size={24} className="text-blue-600" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Subscription Limit Reached
      </h3>
      
      <p className="text-gray-600 mb-4">
        Your {currentPlan} plan doesn't support {featureDescription}.
        Please upgrade to the {recommendedUpgrade} plan to unlock this feature.
      </p>
      
      <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4 justify-center">
        <Link
          to={`/${teamId}/settings/billing?upgrade=true&feature=${feature}`}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Upgrade Now
        </Link>
        
        <Link
          to="#"
          onClick={(e) => { e.preventDefault(); window.history.back(); }}
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Go Back
        </Link>
      </div>
      
      <div className="mt-6 flex items-center justify-center text-xs text-gray-500">
        <AlertTriangle size={14} className="mr-1" />
        <span>Need help? Contact our support team for assistance.</span>
      </div>
    </div>
  );
};

export default UpgradePrompt; 
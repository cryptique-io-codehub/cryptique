import React from 'react';
import { Check, X, Info, Badge } from 'lucide-react';

const FeatureItem = ({ included, text }) => (
  <div className="flex items-center py-1">
    {included ? (
      <Check size={16} className="text-green-500 mr-2" />
    ) : (
      <X size={16} className="text-gray-400 mr-2" />
    )}
    <span className={included ? "text-gray-800" : "text-gray-500"}>{text}</span>
  </div>
);

const PlanDisplay = ({ plans, activePlan, onSelectPlan, hasCQIntelligence, onToggleCQIntelligence }) => {
  // Check if plans data is available
  if (!plans || Object.keys(plans).length === 0) {
    return (
      <div className="p-4 border rounded shadow bg-white">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Off-chain Plan */}
        <div className={`border rounded-lg shadow-sm overflow-hidden ${activePlan === 'offchain' ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Off-chain</h3>
            <div className="mt-4 flex items-baseline text-gray-900">
              <span className="text-3xl font-bold tracking-tight">${plans.offchain.price}</span>
              <span className="ml-1 text-xl font-semibold">/month</span>
            </div>
            <p className="mt-4 text-sm text-gray-500">{plans.offchain.description}</p>
            
            <button
              onClick={() => onSelectPlan('offchain')}
              className={`mt-6 block w-full py-2 px-3 rounded-md text-sm font-semibold text-center ${
                activePlan === 'offchain'
                  ? 'bg-blue-50 text-blue-700 border border-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {activePlan === 'offchain' ? 'Current Plan' : 'Select'}
            </button>
          </div>
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <FeatureItem included={true} text="Off-chain analytics" />
              </li>
              <li>
                <FeatureItem included={true} text="1 website limit" />
              </li>
              <li>
                <FeatureItem included={false} text="On-chain analytics" />
              </li>
              <li>
                <FeatureItem included={false} text="Smart contract monitoring" />
              </li>
              <li>
                <FeatureItem included={false} text="Additional team members" />
              </li>
            </ul>
          </div>
        </div>

        {/* Basic Plan */}
        <div className={`border rounded-lg shadow-sm overflow-hidden ${activePlan === 'basic' ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Basic</h3>
            <div className="mt-4 flex items-baseline text-gray-900">
              <span className="text-3xl font-bold tracking-tight">${plans.basic.price}</span>
              <span className="ml-1 text-xl font-semibold">/month</span>
            </div>
            <p className="mt-4 text-sm text-gray-500">{plans.basic.description}</p>
            
            <button
              onClick={() => onSelectPlan('basic')}
              className={`mt-6 block w-full py-2 px-3 rounded-md text-sm font-semibold text-center ${
                activePlan === 'basic'
                  ? 'bg-blue-50 text-blue-700 border border-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {activePlan === 'basic' ? 'Current Plan' : 'Select'}
            </button>
          </div>
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <FeatureItem included={true} text="Off-chain analytics" />
              </li>
              <li>
                <FeatureItem included={true} text="On-chain analytics" />
              </li>
              <li>
                <FeatureItem included={true} text="2 website limit" />
              </li>
              <li>
                <FeatureItem included={true} text="1 smart contract" />
              </li>
              <li>
                <FeatureItem included={true} text="40,000 monthly API calls" />
              </li>
              <li>
                <FeatureItem included={true} text="2 team members" />
              </li>
            </ul>
          </div>
        </div>

        {/* Pro Plan */}
        <div className={`border rounded-lg shadow-sm overflow-hidden ${activePlan === 'pro' ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="bg-white p-6">
            <div className="flex justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Pro</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Popular
              </span>
            </div>
            <div className="mt-4 flex items-baseline text-gray-900">
              <span className="text-3xl font-bold tracking-tight">${plans.pro.price}</span>
              <span className="ml-1 text-xl font-semibold">/month</span>
            </div>
            <p className="mt-4 text-sm text-gray-500">{plans.pro.description}</p>
            
            <button
              onClick={() => onSelectPlan('pro')}
              className={`mt-6 block w-full py-2 px-3 rounded-md text-sm font-semibold text-center ${
                activePlan === 'pro'
                  ? 'bg-blue-50 text-blue-700 border border-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {activePlan === 'pro' ? 'Current Plan' : 'Select'}
            </button>
          </div>
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <FeatureItem included={true} text="Off-chain analytics" />
              </li>
              <li>
                <FeatureItem included={true} text="On-chain analytics" />
              </li>
              <li>
                <FeatureItem included={true} text="3 website limit" />
              </li>
              <li>
                <FeatureItem included={true} text="3 smart contracts" />
              </li>
              <li>
                <FeatureItem included={true} text="150,000 monthly API calls" />
              </li>
              <li>
                <FeatureItem included={true} text="3 team members" />
              </li>
            </ul>
          </div>
        </div>

        {/* Enterprise Plan */}
        <div className={`border rounded-lg shadow-sm overflow-hidden ${activePlan === 'enterprise' ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Enterprise</h3>
            <div className="mt-4 flex items-baseline text-gray-900">
              <span className="text-3xl font-bold tracking-tight">Custom</span>
            </div>
            <p className="mt-4 text-sm text-gray-500">Custom plan for teams needing higher limits and premium support</p>
            
            <button
              onClick={() => onSelectPlan('enterprise')}
              className={`mt-6 block w-full py-2 px-3 rounded-md text-sm font-semibold text-center ${
                activePlan === 'enterprise'
                  ? 'bg-blue-50 text-blue-700 border border-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {activePlan === 'enterprise' ? 'Current Plan' : 'Contact Sales'}
            </button>
          </div>
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <FeatureItem included={true} text="Unlimited websites" />
              </li>
              <li>
                <FeatureItem included={true} text="Unlimited smart contracts" />
              </li>
              <li>
                <FeatureItem included={true} text="Unlimited API calls" />
              </li>
              <li>
                <FeatureItem included={true} text="Unlimited team members" />
              </li>
              <li>
                <FeatureItem included={true} text="Priority support" />
              </li>
              <li>
                <FeatureItem included={true} text="Custom analytics" />
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CQ Intelligence Add-on */}
      <div className="border rounded-lg shadow-sm overflow-hidden bg-indigo-50">
        <div className="p-6 flex items-start justify-between">
          <div>
            <div className="flex items-center">
              <Badge size={18} className="text-indigo-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">CQ Intelligence Add-on</h3>
            </div>
            <div className="mt-2 flex items-baseline text-gray-900">
              <span className="text-2xl font-bold tracking-tight">$299</span>
              <span className="ml-1 text-lg font-semibold">/month</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Advanced AI-powered intelligence features to enhance your analytics capabilities
            </p>
          </div>
          <div className="mt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={hasCQIntelligence}
                onChange={onToggleCQIntelligence}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-900">
                {hasCQIntelligence ? 'Added' : 'Add to plan'}
              </span>
            </label>
          </div>
        </div>
        <div className="border-t border-indigo-100 px-6 py-4 bg-indigo-50/70">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center">
              <Info size={16} className="text-indigo-600 mr-2" />
              <span className="text-gray-700">CQ Intelligence can be added to any of the plans above</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlanDisplay; 
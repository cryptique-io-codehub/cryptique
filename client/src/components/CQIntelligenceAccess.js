import React from 'react';
import { useParams } from 'react-router-dom';
import useSubscriptionCheck from '../hooks/useSubscriptionCheck';
import UpgradePrompt from './UpgradePrompt';
import { Lock, Sparkles } from 'lucide-react';

/**
 * Component that wraps CQ Intelligence features and enforces subscription access
 * @param {Object} props
 * @param {React.ReactNode} props.children - The CQ Intelligence feature components
 * @param {string} props.title - Title for the locked feature
 * @param {string} props.description - Description for the locked feature
 */
const CQIntelligenceAccess = ({ children, title = 'CQ Intelligence', description = 'AI-powered analytics' }) => {
  const { team } = useParams();
  const { checkAccess, subscription, loading } = useSubscriptionCheck();
  
  // Check if user has CQ Intelligence access
  const hasCQAccess = checkAccess('cqIntelligence');
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }
  
  // If no access, show upgrade prompt
  if (!hasCQAccess) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center p-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Lock size={24} className="text-blue-600" />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center justify-center">
            <Sparkles size={18} className="text-yellow-400 mr-2" />
            {title}
            <Sparkles size={18} className="text-yellow-400 ml-2" />
          </h3>
          
          <p className="text-gray-600 mb-6">
            {description} is available with the CQ Intelligence add-on.
          </p>
          
          <UpgradePrompt 
            feature="cqIntelligence"
            teamId={team} 
            currentPlan={subscription?.plan || 'free'}
          />
        </div>
      </div>
    );
  }
  
  // If they have access, render the children
  return <>{children}</>;
};

export default CQIntelligenceAccess; 
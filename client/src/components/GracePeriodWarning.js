import React from 'react';

/**
 * Component to display a warning message when a user's subscription is in grace period
 * This should be shown on analytics dashboards and pages where analytics are restricted
 */
const GracePeriodWarning = ({ daysLeft, gracePeriodEndDate }) => {
  // Format the end date in a user-friendly way
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-4 rounded-r">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium">Subscription in Grace Period</h3>
          <div className="mt-2 text-sm">
            <p>
              Your subscription is currently in grace period. Analytics viewing is disabled until you renew your subscription.
            </p>
            <p className="mt-1">
              <strong>Days remaining:</strong> {daysLeft || 'Unknown'}
            </p>
            <p className="mt-1">
              <strong>Grace period ends:</strong> {formatDate(gracePeriodEndDate)}
            </p>
          </div>
          <div className="mt-3">
            <a
              href="/settings/billing"
              className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-150"
            >
              Renew Subscription
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GracePeriodWarning; 
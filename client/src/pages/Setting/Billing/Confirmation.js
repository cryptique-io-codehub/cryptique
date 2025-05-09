import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { useTeam } from '../../../context/teamContext';
import axios from 'axios';
import { API_URL } from '../../../utils/constants';

const SubscriptionConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTeam } = useTeam();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);

  // Get status from query params
  const queryParams = new URLSearchParams(location.search);
  const status = queryParams.get('status');

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!currentTeam?._id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch the latest subscription information
        const response = await axios.get(
          `${API_URL}/api/subscription/team/${currentTeam._id}`,
          { withCredentials: true }
        );

        if (response.data.success && response.data.hasSubscription) {
          setSubscription(response.data.subscription);
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError('Failed to verify subscription status');
      } finally {
        setLoading(false);
      }
    };

    // Give a little delay to allow backend webhook to process
    const timer = setTimeout(() => {
      checkSubscriptionStatus();
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentTeam]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your subscription...</p>
        </div>
      );
    }

    if (status === 'success' && subscription?.status === 'active') {
      return (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your subscription has been activated successfully. Thank you for subscribing to our service.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Plan:</span>
              <span className="font-medium">{subscription.plan?.name || 'Unknown'}</span>
            </div>
            {subscription.addons?.length > 0 && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Add-ons:</span>
                <span className="font-medium">
                  {subscription.addons.map(addon => addon.name).join(', ')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Next billing date:</span>
              <span className="font-medium">
                {new Date(subscription.endDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      );
    } else if (status === 'canceled') {
      return (
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} className="text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Canceled</h2>
          <p className="text-gray-600 mb-6">
            You've canceled the payment process. No charges were made to your account.
          </p>
        </div>
      );
    } else {
      return (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Processing</h2>
          <p className="text-gray-600 mb-6">
            Your payment is still being processed. This can take a few minutes to complete.
            You'll receive a confirmation once the payment is confirmed.
          </p>
          {error && (
            <p className="text-red-500 mb-4">{error}</p>
          )}
        </div>
      );
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {renderContent()}
        
        <div className="flex justify-center mt-6">
          <button
            onClick={() => navigate('/settings/billing')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Billing
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionConfirmation; 
// API modules index file

// Zoho CRM exports
export { default as ZohoConfig } from './zoho/config';
export { default as ZohoClientAPI } from './zoho/client';
export { default as ZohoSubscriptionAPI } from './zoho/subscription';

// Coinbase Commerce exports
export { default as CoinbaseConfig } from './coinbase/config';
export { default as CoinbasePaymentAPI } from './coinbase/payments';
export { default as CoinbaseSubscriptionAPI, SUBSCRIPTION_PLANS } from './coinbase/subscriptions';

// Combined API services
export const SubscriptionService = {
  createSubscription: async (planId, customerData, includesCQIntelligence) => {
    // First create the payment in Coinbase
    const coinbaseResponse = await CoinbasePaymentAPI.createCharge({
      name: `${SUBSCRIPTION_PLANS[planId].name} Subscription${includesCQIntelligence ? ' with CQ Intelligence' : ''}`,
      description: SUBSCRIPTION_PLANS[planId].description,
      amount: includesCQIntelligence 
        ? SUBSCRIPTION_PLANS[planId].amount + SUBSCRIPTION_PLANS.CQ_INTELLIGENCE_ADDON.amount
        : SUBSCRIPTION_PLANS[planId].amount,
      currency: 'USD',
      metadata: {
        customer_id: customerData.customerId,
        customer_email: customerData.email,
        plan_id: planId,
        includes_cq_intelligence: includesCQIntelligence,
        team_id: customerData.teamId,
        subscription_type: 'monthly'
      }
    });
    
    return coinbaseResponse;
  },
  
  getCurrentSubscription: async (teamId) => {
    try {
      const response = await fetch(`/api/subscriptions/current?teamId=${teamId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw error;
    }
  }
}; 
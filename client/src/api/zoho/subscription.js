// Zoho CRM subscription management utilities
import { createZohoClient } from './config';

/**
 * Subscription management utilities for Zoho CRM
 */
export const ZohoSubscriptionAPI = {
  /**
   * Create or update subscription record in Zoho CRM
   * Used to track client subscription plans and status
   */
  updateSubscription: async (clientId, subscriptionData) => {
    try {
      const client = await createZohoClient();
      
      // First check if subscription already exists
      const response = await client.get('/Deals', {
        params: {
          criteria: `Account_Name:equals:${clientId}`
        }
      });
      
      const existingSubscriptions = response.data.data || [];
      
      if (existingSubscriptions.length > 0) {
        // Update existing subscription
        const subscriptionId = existingSubscriptions[0].id;
        const updateResponse = await client.put(`/Deals/${subscriptionId}`, {
          data: [{
            ...subscriptionData,
            Account_Name: clientId
          }]
        });
        return updateResponse.data.data[0];
      } else {
        // Create new subscription
        const createResponse = await client.post('/Deals', {
          data: [{
            ...subscriptionData,
            Account_Name: clientId
          }]
        });
        return createResponse.data.data[0];
      }
    } catch (error) {
      console.error('Failed to update subscription in Zoho CRM:', error);
      throw error;
    }
  },

  /**
   * Get current subscription for a client
   */
  getSubscription: async (clientId) => {
    try {
      const client = await createZohoClient();
      const response = await client.get('/Deals', {
        params: {
          criteria: `Account_Name:equals:${clientId}`
        }
      });
      
      const subscriptions = response.data.data || [];
      return subscriptions[0] || null;
    } catch (error) {
      console.error(`Failed to fetch subscription for client ${clientId}:`, error);
      throw error;
    }
  },
  
  /**
   * Track payment for a subscription
   */
  recordPayment: async (subscriptionId, paymentData) => {
    try {
      const client = await createZohoClient();
      
      // In Zoho, we'll create a custom record for payments
      const response = await client.post('/Custom_Module_Name', {
        data: [{
          ...paymentData,
          Deal_Name: subscriptionId // Link to subscription/deal
        }]
      });
      
      return response.data.data[0];
    } catch (error) {
      console.error('Failed to record payment in Zoho CRM:', error);
      throw error;
    }
  }
};

export default ZohoSubscriptionAPI; 
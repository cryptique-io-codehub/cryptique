// Coinbase Commerce payment utilities
import { createCoinbaseClient } from './config';

/**
 * Payment utilities for Coinbase Commerce
 */
export const CoinbasePaymentAPI = {
  /**
   * Create a new charge for a subscription payment
   * 
   * @param {Object} chargeData - The charge details
   * @param {string} chargeData.name - Name of the charge/subscription
   * @param {string} chargeData.description - Description of the subscription
   * @param {number} chargeData.amount - Amount to charge
   * @param {string} chargeData.currency - Currency code (USD)
   * @param {Object} chargeData.metadata - Additional metadata for the charge
   */
  createCharge: async (chargeData) => {
    try {
      const client = createCoinbaseClient();
      
      const response = await client.post('/charges', {
        name: chargeData.name,
        description: chargeData.description,
        pricing_type: 'fixed_price',
        local_price: {
          amount: chargeData.amount.toString(),
          currency: chargeData.currency || 'USD',
        },
        metadata: chargeData.metadata || {},
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to create Coinbase Commerce charge:', error);
      throw error;
    }
  },
  
  /**
   * Get details of an existing charge
   */
  getCharge: async (chargeId) => {
    try {
      const client = createCoinbaseClient();
      const response = await client.get(`/charges/${chargeId}`);
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch Coinbase Commerce charge ${chargeId}:`, error);
      throw error;
    }
  },
  
  /**
   * List recent charges
   */
  listCharges: async () => {
    try {
      const client = createCoinbaseClient();
      const response = await client.get('/charges');
      return response.data.data;
    } catch (error) {
      console.error('Failed to list Coinbase Commerce charges:', error);
      throw error;
    }
  },
  
  /**
   * Create a new checkout for a subscription
   * This is an alternative to direct charges
   */
  createCheckout: async (checkoutData) => {
    try {
      const client = createCoinbaseClient();
      
      const response = await client.post('/checkouts', {
        name: checkoutData.name,
        description: checkoutData.description,
        pricing_type: 'fixed_price',
        local_price: {
          amount: checkoutData.amount.toString(),
          currency: checkoutData.currency || 'USD',
        },
        requested_info: ['name', 'email'],
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to create Coinbase Commerce checkout:', error);
      throw error;
    }
  }
};

export default CoinbasePaymentAPI; 
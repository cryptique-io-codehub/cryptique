const axios = require('axios');
const crypto = require('crypto');

class CoinbaseService {
  constructor() {
    this.apiKey = process.env.COINBASE_API_KEY;
    this.webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;
    this.baseUrl = 'https://api.commerce.coinbase.com';
    this.headers = {
      'X-CC-Api-Key': this.apiKey,
      'X-CC-Version': '2018-03-22',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create a charge for subscription payment
   * @param {Object} data - Charge data
   * @returns {Promise<Object>} - Created charge
   */
  async createCharge(data) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/charges`,
        data,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating Coinbase charge:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Retrieve a specific charge
   * @param {string} chargeId - The ID of the charge to retrieve
   * @returns {Promise<Object>} - The charge data
   */
  async getCharge(chargeId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/charges/${chargeId}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error retrieving Coinbase charge:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cancel a charge
   * @param {string} chargeId - The ID of the charge to cancel
   * @returns {Promise<Object>} - The canceled charge data
   */
  async cancelCharge(chargeId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/charges/${chargeId}/cancel`,
        {},
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error canceling Coinbase charge:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verify a webhook signature
   * @param {string} rawBody - The raw request body
   * @param {string} signature - The signature from the X-CC-Webhook-Signature header
   * @returns {boolean} - Whether the signature is valid
   */
  verifyWebhookSignature(rawBody, signature) {
    try {
      if (!this.webhookSecret || !signature) {
        return false;
      }

      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(rawBody);
      const computedSignature = hmac.digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(computedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}

module.exports = new CoinbaseService(); 
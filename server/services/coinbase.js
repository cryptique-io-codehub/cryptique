const { Client, Webhook, resources } = require('coinbase-commerce-node');
const crypto = require('crypto');

/**
 * Coinbase Commerce Integration Service
 */
class CoinbaseService {
  constructor() {
    this.apiKey = process.env.COINBASE_API_KEY;
    this.webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;
    
    if (!this.apiKey) {
      console.warn('Coinbase Commerce API key is not configured');
    } else {
      Client.init(this.apiKey);
    }
    
    if (!this.webhookSecret) {
      console.warn('Coinbase Commerce webhook secret is not configured');
    }
    
    this.chargeResource = resources.Charge;
    this.checkoutResource = resources.Checkout;
  }

  /**
   * Create a checkout for a subscription
   */
  async createSubscriptionCheckout(data) {
    try {
      const checkoutData = {
        name: `${data.planName} Subscription`,
        description: data.description || `Subscription to the ${data.planName} plan`,
        pricing_type: 'fixed_price',
        local_price: {
          amount: data.amount.toString(),
          currency: 'USD'
        },
        requested_info: ['name', 'email'],
        metadata: {
          planType: data.planType,
          teamId: data.teamId.toString(),
          userId: data.userId.toString(),
          isCQIntelligence: data.isCQIntelligence || false
        },
        redirect_url: data.successUrl,
        cancel_url: data.cancelUrl
      };

      const checkout = await this.checkoutResource.create(checkoutData);
      return checkout;
    } catch (error) {
      console.error('Error creating Coinbase checkout:', error.message);
      throw error;
    }
  }

  /**
   * Process a webhook from Coinbase Commerce
   */
  verifyWebhookSignature(rawBody, signature) {
    try {
      // Verify the signature
      if (!this.webhookSecret) {
        throw new Error('Webhook secret is not configured');
      }

      return Webhook.verifyEventBody(
        rawBody,
        signature,
        this.webhookSecret
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error.message);
      return null;
    }
  }

  /**
   * Get charge details by id
   */
  async getCharge(chargeId) {
    try {
      return await this.chargeResource.retrieve(chargeId);
    } catch (error) {
      console.error(`Error retrieving charge ${chargeId}:`, error.message);
      throw error;
    }
  }

  /**
   * List recent charges
   */
  async listCharges(limit = 25) {
    try {
      return await this.chargeResource.list({ limit });
    } catch (error) {
      console.error('Error listing charges:', error.message);
      throw error;
    }
  }

  /**
   * Cancel a charge
   */
  async cancelCharge(chargeId) {
    try {
      return await this.chargeResource.cancel(chargeId);
    } catch (error) {
      console.error(`Error cancelling charge ${chargeId}:`, error.message);
      throw error;
    }
  }

  /**
   * Resolve a charge to get payment details
   */
  async resolveCharge(chargeId) {
    try {
      return await this.chargeResource.retrieve(chargeId);
    } catch (error) {
      console.error(`Error resolving charge ${chargeId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new CoinbaseService(); 
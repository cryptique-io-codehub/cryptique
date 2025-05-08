const axios = require('axios');
const crypto = require('crypto');

class CoinbaseService {
  constructor() {
    this.apiKey = process.env.COINBASE_API_KEY;
    this.webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;
    this.baseUrl = 'https://api.commerce.coinbase.com';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-CC-Api-Key': this.apiKey,
        'X-CC-Version': '2018-03-22',
        'Content-Type': 'application/json'
      }
    });
  }

  // Create a checkout for a subscription
  async createCheckout(planDetails, teamId, customerId) {
    try {
      const { name, price, description } = planDetails;
      
      const response = await this.client.post('/charges', {
        name: `Cryptique ${name} Plan`,
        description,
        pricing_type: 'fixed_price',
        local_price: {
          amount: price.toString(),
          currency: 'USD'
        },
        metadata: {
          teamId,
          customerId,
          planType: name.toLowerCase(),
          source: 'cryptique-app'
        },
        redirect_url: `${process.env.CLIENT_URL}/${teamId}/settings/billing?success=true`,
        cancel_url: `${process.env.CLIENT_URL}/${teamId}/settings/billing?cancelled=true`
      });

      return response.data;
    } catch (error) {
      console.error('Error creating Coinbase checkout:', error.response?.data || error.message);
      throw new Error(`Failed to create checkout: ${error.message}`);
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(signature, body) {
    if (!signature || !this.webhookSecret) {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const digest = hmac.update(body).digest('hex');
      return signature === digest;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  // Get charge details by ID
  async getCharge(chargeId) {
    try {
      const response = await this.client.get(`/charges/${chargeId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching charge:', error.response?.data || error.message);
      throw new Error(`Failed to fetch charge: ${error.message}`);
    }
  }

  // Get subscription plan details
  getSubscriptionPlanDetails(planType, hasCQIntelligence = false) {
    let plan = null;
    
    // Base plan details
    switch (planType.toLowerCase()) {
      case 'offchain':
        plan = {
          name: 'Off-chain',
          price: 59,
          description: 'Off-chain analytics with 1 website limit and no additional users',
          features: {
            maxWebsites: 1,
            maxContracts: 0,
            maxApiCalls: 0,
            maxTeamMembers: 1,
            hasCQIntelligence: false
          }
        };
        break;
      case 'basic':
        plan = {
          name: 'Basic',
          price: 299,
          description: 'Full access with 2 websites, 1 smart contract, and 40,000 API calls limit',
          features: {
            maxWebsites: 2,
            maxContracts: 1,
            maxApiCalls: 40000,
            maxTeamMembers: 2,
            hasCQIntelligence: false
          }
        };
        break;
      case 'pro':
        plan = {
          name: 'Pro',
          price: 599,
          description: 'Full access with 3 websites, 3 smart contracts, and 150,000 API calls limit',
          features: {
            maxWebsites: 3,
            maxContracts: 3,
            maxApiCalls: 150000,
            maxTeamMembers: 3,
            hasCQIntelligence: false
          }
        };
        break;
      case 'enterprise':
        plan = {
          name: 'Enterprise',
          price: 999, // This would be customized in a real scenario
          description: 'Custom enterprise plan',
          features: {
            maxWebsites: 10,
            maxContracts: 10,
            maxApiCalls: 500000,
            maxTeamMembers: 10,
            hasCQIntelligence: false
          }
        };
        break;
      default:
        throw new Error(`Invalid plan type: ${planType}`);
    }

    // Add CQ Intelligence if requested
    if (hasCQIntelligence) {
      plan.price += 299;
      plan.name += ' with CQ Intelligence';
      plan.description += ' including CQ Intelligence';
      plan.features.hasCQIntelligence = true;
    }

    return plan;
  }
}

module.exports = new CoinbaseService(); 
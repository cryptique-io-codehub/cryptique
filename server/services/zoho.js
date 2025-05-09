const axios = require('axios');

/**
 * Zoho CRM Integration Service
 */
class ZohoService {
  constructor() {
    this.baseUrl = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
    this.clientId = process.env.ZOHO_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      console.warn('Zoho CRM credentials are not properly configured');
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken() {
    // If we have a valid token, return it
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/oauth/v2/token`,
        null,
        {
          params: {
            refresh_token: this.refreshToken,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'refresh_token'
          }
        }
      );

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Set token expiry (subtract 5 minutes to be safe)
        const expiresInMs = (response.data.expires_in - 300) * 1000;
        this.tokenExpiry = new Date(Date.now() + expiresInMs);
        return this.accessToken;
      } else {
        throw new Error('Failed to get access token from Zoho');
      }
    } catch (error) {
      console.error('Error refreshing Zoho access token:', error.message);
      throw error;
    }
  }

  /**
   * Make an authenticated request to Zoho CRM API
   */
  async makeRequest(method, endpoint, data = null) {
    try {
      const accessToken = await this.getAccessToken();
      
      const config = {
        method,
        url: `${this.baseUrl}/crm/v3/${endpoint}`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      if (data && (method === 'post' || method === 'put')) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Error making Zoho CRM request to ${endpoint}:`, error.message);
      throw error;
    }
  }

  /**
   * Create or update a contact in Zoho CRM
   */
  async upsertContact(contactData) {
    try {
      const data = {
        data: [
          {
            Email: contactData.email,
            Last_Name: contactData.lastName || contactData.name.split(' ').pop() || 'User',
            First_Name: contactData.firstName || contactData.name.split(' ')[0] || '',
            Phone: contactData.phone || '',
            Account_Name: contactData.company || contactData.teamName || ''
          }
        ],
        trigger: ['workflow']
      };

      // Check if contact exists first
      const searchResponse = await this.makeRequest(
        'get',
        `Contacts/search?email=${encodeURIComponent(contactData.email)}`
      );

      // If contact exists, update it
      if (searchResponse.data && searchResponse.data.length > 0) {
        const contactId = searchResponse.data[0].id;
        return await this.makeRequest('put', `Contacts/${contactId}`, data);
      }
      
      // Otherwise create new contact
      return await this.makeRequest('post', 'Contacts', data);
    } catch (error) {
      console.error('Error upserting contact in Zoho:', error.message);
      throw error;
    }
  }

  /**
   * Create or update an account in Zoho CRM
   */
  async upsertAccount(accountData) {
    try {
      const data = {
        data: [
          {
            Account_Name: accountData.name,
            Website: accountData.website || '',
            Description: accountData.description || `Team account for ${accountData.name}`,
            Account_Type: 'Customer',
            Industry: 'Technology'
          }
        ],
        trigger: ['workflow']
      };

      // Check if account exists
      const searchResponse = await this.makeRequest(
        'get', 
        `Accounts/search?criteria=Account_Name:equals:${encodeURIComponent(accountData.name)}`
      );

      // If account exists, update it
      if (searchResponse.data && searchResponse.data.length > 0) {
        const accountId = searchResponse.data[0].id;
        return await this.makeRequest('put', `Accounts/${accountId}`, data);
      }
      
      // Otherwise create new account
      return await this.makeRequest('post', 'Accounts', data);
    } catch (error) {
      console.error('Error upserting account in Zoho:', error.message);
      throw error;
    }
  }

  /**
   * Create a deal in Zoho CRM
   */
  async createDeal(dealData) {
    try {
      const data = {
        data: [
          {
            Deal_Name: dealData.name,
            Account_Name: {
              id: dealData.accountId
            },
            Stage: dealData.stage || 'Qualification',
            Amount: dealData.amount,
            Closing_Date: dealData.closingDate || new Date().toISOString().split('T')[0],
            Description: dealData.description || ''
          }
        ],
        trigger: ['workflow']
      };

      return await this.makeRequest('post', 'Deals', data);
    } catch (error) {
      console.error('Error creating deal in Zoho:', error.message);
      throw error;
    }
  }

  /**
   * Update subscription status in Zoho CRM
   */
  async updateSubscriptionStatus(contactId, subscriptionData) {
    try {
      const data = {
        data: [
          {
            Subscription_Status: subscriptionData.status,
            Subscription_Plan: subscriptionData.plan,
            Subscription_Amount: subscriptionData.amount,
            Subscription_Start_Date: subscriptionData.startDate.toISOString().split('T')[0],
            Subscription_End_Date: subscriptionData.endDate.toISOString().split('T')[0]
          }
        ]
      };

      return await this.makeRequest('put', `Contacts/${contactId}`, data);
    } catch (error) {
      console.error('Error updating subscription in Zoho:', error.message);
      throw error;
    }
  }
}

module.exports = new ZohoService(); 
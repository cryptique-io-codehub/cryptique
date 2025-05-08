const axios = require('axios');

class ZohoService {
  constructor() {
    this.clientId = process.env.ZOHO_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    this.baseUrl = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get fresh access token using refresh token
  async getAccessToken() {
    // If we have a valid token, return it
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        'https://accounts.zoho.com/oauth/v2/token',
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

      this.accessToken = response.data.access_token;
      // Set expiry time (usually 3600 seconds / 1 hour)
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      return this.accessToken;
    } catch (error) {
      console.error('Error refreshing Zoho access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh Zoho access token');
    }
  }

  // Create a client instance with the current access token
  async getClient() {
    const token = await this.getAccessToken();
    
    return axios.create({
      baseURL: `${this.baseUrl}/crm/v3`,
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Create a contact in Zoho CRM
  async createContact(contactData) {
    try {
      const client = await this.getClient();
      
      const payload = {
        data: [
          {
            First_Name: contactData.firstName,
            Last_Name: contactData.lastName,
            Email: contactData.email,
            Company: contactData.companyName || 'Individual',
            Phone: contactData.phone,
            Mailing_Street: contactData.address,
            Mailing_City: contactData.city,
            Mailing_Zip: contactData.zipCode,
            Mailing_Country: contactData.country,
            Description: `Cryptique user - Team: ${contactData.teamName}`,
            Lead_Source: 'Web Application'
          }
        ]
      };

      const response = await client.post('/Contacts', payload);
      
      if (response.data && response.data.data && response.data.data[0] && response.data.data[0].id) {
        return response.data.data[0].id;
      } else {
        throw new Error('Failed to create contact: Invalid response');
      }
    } catch (error) {
      console.error('Error creating Zoho contact:', error.response?.data || error.message);
      throw new Error(`Failed to create contact: ${error.message}`);
    }
  }

  // Create a deal in Zoho CRM
  async createDeal(dealData) {
    try {
      const client = await this.getClient();
      
      const payload = {
        data: [
          {
            Deal_Name: `${dealData.teamName} - ${dealData.planName}`,
            Stage: 'Closed Won',
            Account_Name: dealData.companyName || dealData.teamName,
            Contact_Name: dealData.contactId,
            Amount: dealData.amount,
            Closing_Date: new Date().toISOString().split('T')[0],
            Description: `Subscription plan: ${dealData.planName}${dealData.hasCQIntelligence ? ' with CQ Intelligence' : ''}`,
            Type: 'Subscription'
          }
        ]
      };

      const response = await client.post('/Deals', payload);
      
      if (response.data && response.data.data && response.data.data[0] && response.data.data[0].id) {
        return response.data.data[0].id;
      } else {
        throw new Error('Failed to create deal: Invalid response');
      }
    } catch (error) {
      console.error('Error creating Zoho deal:', error.response?.data || error.message);
      throw new Error(`Failed to create deal: ${error.message}`);
    }
  }

  // Update contact in Zoho CRM
  async updateContact(contactId, contactData) {
    try {
      const client = await this.getClient();
      
      const payload = {
        data: [
          {
            id: contactId,
            ...contactData
          }
        ]
      };

      const response = await client.put('/Contacts', payload);
      return response.data;
    } catch (error) {
      console.error('Error updating Zoho contact:', error.response?.data || error.message);
      throw new Error(`Failed to update contact: ${error.message}`);
    }
  }

  // Get contact details
  async getContact(contactId) {
    try {
      const client = await this.getClient();
      const response = await client.get(`/Contacts/${contactId}`);
      return response.data.data[0];
    } catch (error) {
      console.error('Error getting Zoho contact:', error.response?.data || error.message);
      throw new Error(`Failed to get contact: ${error.message}`);
    }
  }
}

module.exports = new ZohoService(); 
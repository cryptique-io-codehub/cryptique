// Zoho CRM client management utilities
import { createZohoClient } from './config';

/**
 * Client and account management utilities for Zoho CRM
 */
export const ZohoClientAPI = {
  /**
   * Fetch all clients (accounts) from Zoho CRM
   */
  getClients: async () => {
    try {
      const client = await createZohoClient();
      const response = await client.get('/Accounts');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch clients from Zoho CRM:', error);
      throw error;
    }
  },

  /**
   * Get a single client by ID
   */
  getClient: async (clientId) => {
    try {
      const client = await createZohoClient();
      const response = await client.get(`/Accounts/${clientId}`);
      return response.data.data[0] || null;
    } catch (error) {
      console.error(`Failed to fetch client ${clientId} from Zoho CRM:`, error);
      throw error;
    }
  },

  /**
   * Create a new client in Zoho CRM
   */
  createClient: async (clientData) => {
    try {
      const client = await createZohoClient();
      const response = await client.post('/Accounts', {
        data: [clientData]
      });
      return response.data.data[0] || null;
    } catch (error) {
      console.error('Failed to create client in Zoho CRM:', error);
      throw error;
    }
  },

  /**
   * Update an existing client in Zoho CRM
   */
  updateClient: async (clientId, clientData) => {
    try {
      const client = await createZohoClient();
      const response = await client.put(`/Accounts/${clientId}`, {
        data: [clientData]
      });
      return response.data.data[0] || null;
    } catch (error) {
      console.error(`Failed to update client ${clientId} in Zoho CRM:`, error);
      throw error;
    }
  },

  /**
   * Create a new contact associated with a client
   */
  createContact: async (contactData) => {
    try {
      const client = await createZohoClient();
      const response = await client.post('/Contacts', {
        data: [contactData]
      });
      return response.data.data[0] || null;
    } catch (error) {
      console.error('Failed to create contact in Zoho CRM:', error);
      throw error;
    }
  }
};

export default ZohoClientAPI; 
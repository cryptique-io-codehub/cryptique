// Zoho CRM API configuration
import axios from 'axios';

// These values will be populated from environment variables on the server
const ZOHO_CLIENT_ID = process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID || '';
const ZOHO_CLIENT_SECRET = process.env.NEXT_PUBLIC_ZOHO_CLIENT_SECRET || '';
const ZOHO_REFRESH_TOKEN = process.env.NEXT_PUBLIC_ZOHO_REFRESH_TOKEN || '';
const ZOHO_API_DOMAIN = process.env.NEXT_PUBLIC_ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

// Token storage for client-side
let accessToken = null;
let tokenExpiry = null;

/**
 * Get a valid access token for Zoho CRM API
 * Uses server-side proxy to protect credentials
 */
export const getZohoAccessToken = async () => {
  // Check if we have a valid token already
  if (accessToken && tokenExpiry && new Date().getTime() < tokenExpiry) {
    return accessToken;
  }

  try {
    // Request new token from our backend proxy
    const response = await axios.get('/api/zoho/auth/token');
    
    if (response.data && response.data.access_token) {
      accessToken = response.data.access_token;
      // Set expiry time (typically 1 hour for Zoho tokens)
      tokenExpiry = new Date().getTime() + (response.data.expires_in * 1000);
      return accessToken;
    } else {
      throw new Error('Invalid token response');
    }
  } catch (error) {
    console.error('Failed to get Zoho access token:', error);
    throw error;
  }
};

/**
 * Create authenticated Zoho API client
 */
export const createZohoClient = async () => {
  const token = await getZohoAccessToken();
  
  return axios.create({
    baseURL: `${ZOHO_API_DOMAIN}/crm/v2`,
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    }
  });
};

export default {
  getZohoAccessToken,
  createZohoClient,
}; 
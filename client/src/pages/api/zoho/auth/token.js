// API route to securely get Zoho CRM access token
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get environment variables
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing Zoho API credentials');
    }

    // Request new access token using refresh token
    const tokenUrl = 'https://accounts.zoho.com/oauth/v2/token';
    const params = new URLSearchParams();
    params.append('refresh_token', refreshToken);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'refresh_token');

    const response = await axios.post(tokenUrl, params);

    if (response.data && response.data.access_token) {
      // Return the access token to client (but never expose refresh token)
      return res.status(200).json({ 
        access_token: response.data.access_token,
        expires_in: response.data.expires_in || 3600,
        api_domain: apiDomain
      });
    } else {
      throw new Error('Invalid token response from Zoho');
    }
  } catch (error) {
    console.error('Zoho token error:', error);
    return res.status(500).json({ 
      error: 'Failed to get Zoho access token',
      message: error.message 
    });
  }
} 
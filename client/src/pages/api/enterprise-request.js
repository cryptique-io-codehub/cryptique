// API route to handle enterprise plan requests
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, company, requirements } = req.body;

    // Validate required fields
    if (!name || !email || !company || !requirements) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get Zoho access token
    const tokenResponse = await axios.get('/api/zoho/auth/token');
    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      throw new Error('Failed to get Zoho access token');
    }

    const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

    // Create a lead in Zoho CRM
    const leadData = {
      Last_Name: name,
      Email: email,
      Company: company,
      Description: requirements,
      Lead_Source: 'Website',
      Lead_Status: 'New',
      Industry: 'Technology',
      Custom_Field: 'Enterprise Plan Request' // Replace with your actual custom field name
    };

    const response = await axios.post(
      `${apiDomain}/crm/v2/Leads`,
      {
        data: [leadData]
      },
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Enterprise plan request submitted successfully',
      leadId: response.data.data[0]?.id
    });
  } catch (error) {
    console.error('Failed to submit enterprise plan request:', error);
    return res.status(500).json({
      error: 'Failed to submit enterprise plan request',
      message: error.message
    });
  }
} 
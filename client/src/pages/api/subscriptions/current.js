// API route to get current subscription data
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the team ID from the query parameters or from the authenticated user
    const { teamId } = req.query;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Missing team ID' });
    }

    // In a real implementation, you would fetch this data from your database
    // This is a placeholder for the actual database query

    // Placeholder subscription data
    const subscriptionData = {
      teamId,
      planId: 'basic', // off_chain, basic, pro, enterprise
      planName: 'Basic',
      status: 'active', // active, pending, cancelled, expired
      includesCQIntelligence: false,
      features: {
        websiteCount: 2,
        contractCount: 1,
        teamMemberCount: 2,
        apiCallLimit: 40000
      },
      startDate: '2024-05-01',
      endDate: '2025-05-01',
      nextBillingDate: '2024-06-01',
      lastPaymentId: 'payment_123',
      lastPaymentDate: '2024-05-01'
    };

    // If you have Zoho CRM integration and want to fetch from there as well
    if (req.query.includeZoho === 'true') {
      try {
        // Get Zoho access token
        const tokenResponse = await axios.get('/api/zoho/auth/token');
        const accessToken = tokenResponse.data.access_token;

        if (accessToken) {
          const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
          
          // Fetch subscription from Zoho CRM
          // In reality, you would have a mapping between team IDs and Zoho account IDs
          const zohoResponse = await axios.get(`${apiDomain}/crm/v2/Deals`, {
            params: {
              criteria: 'Stage:equals:Closed Won'
              // In a real implementation, you would filter by the specific account or team ID
            },
            headers: {
              'Authorization': `Zoho-oauthtoken ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          // Merge Zoho data with local data if needed
          if (zohoResponse.data?.data?.length > 0) {
            const zohoSubscription = zohoResponse.data.data[0];
            // Merge relevant fields
            // This would be customized based on your Zoho CRM setup
          }
        }
      } catch (error) {
        console.error('Failed to fetch subscription from Zoho CRM:', error);
        // Continue with local data if Zoho fetch fails
      }
    }

    return res.status(200).json(subscriptionData);
  } catch (error) {
    console.error('Failed to fetch subscription data:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch subscription data',
      message: error.message 
    });
  }
} 
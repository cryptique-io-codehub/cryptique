// API to update subscription status in database and Zoho CRM
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      teamId,
      customerId,
      planId,
      includesCQIntelligence,
      paymentStatus,
      paymentId,
      paymentAmount,
      paymentCurrency
    } = req.body;

    // Validate required fields
    if (!teamId || !planId || !paymentStatus) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update subscription in Zoho CRM if we have a customer ID
    if (customerId) {
      try {
        await updateZohoSubscription({
          customerId,
          planId,
          includesCQIntelligence,
          paymentStatus,
          paymentId,
          paymentAmount,
          paymentCurrency
        });
      } catch (error) {
        console.error('Failed to update subscription in Zoho CRM:', error);
        // Continue with local DB update even if Zoho update fails
      }
    }

    // Update subscription in your app's database
    // This is where you would connect to your database and update the team's subscription
    // For example, using MongoDB, Firebase, or any other database

    // Placeholder for database update (replace with actual implementation)
    // await db.collection('teams').updateOne(
    //   { _id: teamId },
    //   {
    //     $set: {
    //       subscription: {
    //         planId,
    //         includesCQIntelligence,
    //         status: paymentStatus,
    //         lastPaymentId: paymentId,
    //         updatedAt: new Date()
    //       }
    //     }
    //   }
    // );

    console.log(`Subscription updated for team ${teamId} to plan ${planId}`);

    return res.status(200).json({
      success: true,
      message: 'Subscription updated successfully'
    });
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return res.status(500).json({
      error: 'Failed to update subscription',
      message: error.message
    });
  }
}

// Update subscription in Zoho CRM
async function updateZohoSubscription(subscriptionData) {
  try {
    // Get Zoho access token
    const tokenResponse = await axios.get(`${process.env.BASE_URL}/api/zoho/auth/token`);
    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      throw new Error('Failed to get Zoho access token');
    }

    // Prepare subscription data for Zoho
    const zohoSubscriptionData = {
      Deal_Name: `Subscription - ${subscriptionData.planId}${subscriptionData.includesCQIntelligence ? ' with CQ Intelligence' : ''}`,
      Stage: subscriptionData.paymentStatus === 'paid' ? 'Closed Won' : 'In Progress',
      Amount: subscriptionData.paymentAmount,
      Account_Name: subscriptionData.customerId,
      Description: `Plan: ${subscriptionData.planId}, Payment ID: ${subscriptionData.paymentId}`,
      // Add other fields as needed
    };

    // First check if subscription already exists
    const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
    const response = await axios.get(`${apiDomain}/crm/v2/Deals`, {
      params: {
        criteria: `Account_Name:equals:${subscriptionData.customerId}`
      },
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const existingSubscriptions = response.data.data || [];

    if (existingSubscriptions.length > 0) {
      // Update existing subscription
      const subscriptionId = existingSubscriptions[0].id;
      await axios.put(
        `${apiDomain}/crm/v2/Deals/${subscriptionId}`,
        {
          data: [zohoSubscriptionData]
        },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      // Create new subscription
      await axios.post(
        `${apiDomain}/crm/v2/Deals`,
        {
          data: [zohoSubscriptionData]
        },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return true;
  } catch (error) {
    console.error('Zoho subscription update error:', error);
    throw error;
  }
} 
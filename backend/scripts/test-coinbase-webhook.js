require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');

// Mock a Coinbase webhook event
const mockEvent = {
  id: 'test-event-id',
  type: 'charge:confirmed',
  data: {
    id: 'test-charge-id',
    pricing: {
      local: {
        amount: '299.00',
        currency: 'USD'
      }
    },
    metadata: {
      teamId: '60d0fe4f5311236168a109ca', // Replace with a valid team ID for testing
      planId: '60d0fe4f5311236168a109cb', // Replace with a valid plan ID for testing
      addonIds: '',
      subscriptionType: 'monthly'
    }
  }
};

// Configuration
const WEBHOOK_SECRET = process.env.COINBASE_WEBHOOK_SECRET;
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Create webhook signature
const createSignature = (payload, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
};

// Send the mock webhook event
const sendMockWebhook = async () => {
  try {
    console.log('Sending mock Coinbase webhook event...');

    // Stringify payload
    const rawPayload = JSON.stringify(mockEvent);
    
    // Create signature
    const signature = createSignature(rawPayload, WEBHOOK_SECRET);
    
    console.log('Webhook payload:', mockEvent);
    console.log('Generated signature:', signature);
    
    // Send the request
    const response = await axios.post(
      `${API_URL}/api/subscription/webhook`,
      rawPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-CC-Webhook-Signature': signature
        }
      }
    );
    
    console.log('Webhook response:', response.status, response.data);
  } catch (error) {
    console.error('Error sending mock webhook:', error.response?.data || error.message);
  }
};

// Run the test
sendMockWebhook(); 
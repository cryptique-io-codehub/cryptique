// Coinbase Commerce webhook handler
import crypto from 'crypto';
import axios from 'axios';

// Utility to verify Coinbase webhook signature
const verifySignature = (rawBody, signature, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  const computedSignature = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
};

// Save raw body middleware for verifying webhook signatures
export const config = {
  api: {
    bodyParser: {
      raw: {
        type: 'application/json',
      },
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the webhook secret from environment variables
    const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('Missing Coinbase webhook secret');
    }

    // Get the signature from headers
    const signature = req.headers['x-cc-webhook-signature'];
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature header' });
    }

    // Get the raw body
    const rawBody = await getRawBody(req);
    
    // Verify the signature
    let signatureValid = false;
    try {
      signatureValid = verifySignature(rawBody.toString(), signature, webhookSecret);
    } catch (error) {
      console.error('Signature verification error:', error);
    }

    if (!signatureValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse the body
    const body = JSON.parse(rawBody.toString());
    const event = body.event;

    // Handle different event types
    switch (event.type) {
      case 'charge:created':
        // A new charge was created
        console.log('New charge created:', event.data.id);
        break;
        
      case 'charge:confirmed':
        // Payment was confirmed
        console.log('Charge confirmed:', event.data);
        
        try {
          // Update subscription status in database
          // Extract metadata from the charge
          const { metadata } = event.data;
          const { customer_id, team_id, plan_id, includes_cq_intelligence } = metadata || {};
          
          if (team_id) {
            // Update subscription status in your database
            // This is where you would integrate with your database and Zoho CRM
            console.log('Updating subscription for team:', team_id, 'plan:', plan_id);
            
            // Example: call your API to update subscription
            await axios.post('/api/subscriptions/update', {
              teamId: team_id,
              customerId: customer_id,
              planId: plan_id,
              includesCQIntelligence: includes_cq_intelligence === 'true',
              paymentStatus: 'paid',
              paymentId: event.data.id,
              paymentAmount: event.data.pricing.local.amount,
              paymentCurrency: event.data.pricing.local.currency
            });
          }
        } catch (error) {
          console.error('Failed to update subscription:', error);
        }
        break;
        
      case 'charge:failed':
        // Payment failed
        console.log('Charge failed:', event.data.id);
        break;
        
      case 'charge:delayed':
        // Payment is delayed
        console.log('Charge delayed:', event.data.id);
        break;
        
      case 'charge:pending':
        // Payment is pending
        console.log('Charge pending:', event.data.id);
        break;
        
      case 'charge:resolved':
        // A previously failed charge is now resolved
        console.log('Charge resolved:', event.data.id);
        break;
        
      default:
        console.log('Unhandled event type:', event.type);
    }

    // Respond to Coinbase with success
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Coinbase webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed', message: error.message });
  }
}

// Helper function to get raw body
async function getRawBody(req) {
  const chunks = [];
  
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  
  return Buffer.concat(chunks);
} 
# Cryptique Server - CRM and Payment Integrations

This document outlines the integrations implemented for Zoho CRM and Coinbase Commerce in the Cryptique application.

## Environment Variables

Create a `.env` file in the server directory with the following variables:

```
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/cryptique

# Coinbase Commerce settings
COINBASE_API_KEY=your_coinbase_api_key
COINBASE_WEBHOOK_SECRET=your_coinbase_webhook_shared_secret

# Zoho CRM settings
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REFRESH_TOKEN=your_zoho_refresh_token
ZOHO_API_DOMAIN=https://www.zohoapis.com

# Application settings
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000
BACKEND_API_URL=http://localhost:3001
```

## Subscription Plans

The application implements the following subscription plans:

1. **Off-chain**: $59/month
   - Off-chain analytics only
   - 1 website limit
   - No additional team members

2. **Basic**: $299/month
   - Full access
   - 2 websites limit
   - 1 smart contract
   - 40,000 monthly API calls
   - 2 team members

3. **Pro**: $599/month
   - Full access
   - 3 websites limit
   - 3 smart contracts
   - 150,000 monthly API calls
   - 3 team members

4. **Enterprise**: Custom pricing
   - Customized plan

5. **CQ Intelligence**: $299/month add-on
   - Can be added to any plan

## API Endpoints

### Subscription & Billing

- `GET /api/billing/plans` - Get all subscription plans
- `POST /api/billing/checkout` - Create checkout session
- `GET /api/billing/subscription/:teamId` - Get active subscription
- `GET /api/billing/subscriptions/:teamId` - Get subscription history
- `PUT /api/billing/billing/:teamId` - Update billing details
- `POST /api/billing/cancel/:subscriptionId` - Cancel subscription
- `POST /api/billing/webhook/coinbase` - Coinbase webhook endpoint

### Zoho CRM

- `POST /api/crm/contact` - Create or update contact
- `GET /api/crm/contact/:teamId` - Get contact details

## Webhook Setup

### Coinbase Commerce Webhook

The webhook endpoint in the application is: `https://app.cryptique.io/api/webhooks/coinbase`

Make sure to set up the following events:
- `charge:created`
- `charge:confirmed`
- `charge:failed`
- `charge:delayed`
- `charge:pending`
- `charge:resolved`

## Zoho CRM Setup

For Zoho CRM, you should set up a self-client application with the following scopes:
```
ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.users.ALL,ZohoCRM.org.ALL
```

## Installation & Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create and configure your `.env` file with the necessary API keys

3. Start the server:
   ```
   npm run dev
   ```

## Testing

Before going to production, test the integrations with:

1. Test charges in Coinbase Commerce sandbox mode
2. Verify webhook processing with test events
3. Check Zoho CRM contact creation and updates

## Production Deployment

Make sure to:

1. Set all environment variables in your production environment
2. Configure the production webhook URL in Coinbase Commerce
3. Implement proper error monitoring and logging

## Limitations

1. Coinbase Commerce doesn't support native recurring billing, so you'll need to implement a scheduled task to handle subscription renewals.
2. Ensure your webhook endpoints are properly secured against unauthorized access.
3. Implement additional error handling and logging for a production environment. 
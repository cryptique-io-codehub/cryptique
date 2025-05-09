# Stripe Integration Guide

This document provides a comprehensive guide for setting up Stripe payment integration with your application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Stripe Account Setup](#stripe-account-setup)
3. [Creating Products and Prices](#creating-products-and-prices)
4. [Environment Configuration](#environment-configuration)
5. [Webhook Setup](#webhook-setup)
6. [Testing](#testing)
7. [Going Live](#going-live)

## Prerequisites

- Node.js installed on your system
- MongoDB connection set up
- Access to a Stripe account (either test or live)

## Stripe Account Setup

1. **Create a Stripe Account**: Go to [Stripe](https://stripe.com) and sign up or log in.
2. **Get Your API Keys**: 
   - In the Stripe Dashboard, go to Developers > API keys
   - You'll need both the publishable key and the secret key
   - Make sure to use test keys for development

## Creating Products and Prices

You need to create products and prices in Stripe that match the subscription plans defined in our application:

1. **Log in to Stripe Dashboard** and go to Products > Add Product
2. **Create the following products**:

   a. **Off-chain Plan**
   - Name: Off-chain Analytics
   - Description: Off-chain analytics, 1 website, no extra users
   - Create a recurring price:
     - Price: $59
     - Billing period: Monthly
     - Note the Price ID (starts with "price_")

   b. **Basic Plan**
   - Name: Basic Plan
   - Description: Full access with limits, 2 websites, 1 smart contract, 2 team members
   - Create a recurring price:
     - Price: $299
     - Billing period: Monthly
     - Note the Price ID

   c. **Pro Plan**
   - Name: Pro Plan
   - Description: Enhanced access, 3 websites, 3 smart contracts, 3 team members
   - Create a recurring price:
     - Price: $599
     - Billing period: Monthly
     - Note the Price ID

   d. **Enterprise Plan**
   - Name: Enterprise Plan
   - Description: Custom plan with tailored limits and support
   - Create a recurring price:
     - This might be custom pricing, but create a placeholder
     - Note the Price ID

   e. **CQ Intelligence Add-on**
   - Name: CQ Intelligence Add-on
   - Description: AI-powered analytics and insights
   - Create a recurring price:
     - Price: $299
     - Billing period: Monthly
     - Note the Price ID

3. **Save all the Price IDs** for use in the environment configuration

## Environment Configuration

Create a `.env` file in the server directory with the following variables:

```
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/cryptique

# Server Configuration
PORT=3001
NODE_ENV=development

# API URLs
BACKEND_API_URL=http://localhost:3001

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Stripe Price IDs
STRIPE_PRICE_ID_OFFCHAIN=price_your_offchain_price_id
STRIPE_PRICE_ID_BASIC=price_your_basic_price_id
STRIPE_PRICE_ID_PRO=price_your_pro_price_id
STRIPE_PRICE_ID_ENTERPRISE=price_your_enterprise_price_id
STRIPE_PRICE_ID_CQ_INTELLIGENCE=price_your_cq_intelligence_price_id
```

Replace the placeholders with your actual values.

## Webhook Setup

Stripe webhooks allow your application to receive events like successful payments. Here's how to set them up:

1. **Install Stripe CLI** (for local testing): Follow the [Stripe CLI installation guide](https://stripe.com/docs/stripe-cli)

2. **Login to Stripe CLI**:
   ```bash
   stripe login
   ```

3. **Forward events to your local server**:
   ```bash
   stripe listen --forward-to http://localhost:3001/api/webhooks/stripe
   ```
   This will output a webhook signing secret. Copy this value.

4. **Add the webhook secret** to your `.env` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_from_cli
   ```

5. **For production**, set up a webhook endpoint in the Stripe Dashboard:
   - Go to Developers > Webhooks > Add endpoint
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to send: 
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

## Testing

1. **Start your server and client**:
   ```bash
   npm run dev
   ```

2. **Test subscription flow**:
   - Go to the Billing section in the Settings page
   - Choose a subscription plan
   - Complete the checkout using Stripe test cards:
     - Success: `4242 4242 4242 4242`
     - Failure: `4000 0000 0000 0002`
   - Test canceling a subscription
   - Test adding/removing the CQ Intelligence add-on

3. **Check the webhook events** in your terminal running the Stripe CLI

## Going Live

Once testing is complete and you're ready to go live:

1. **Update environment variables** with live Stripe keys
2. **Update webhook endpoint** in Stripe Dashboard to point to your production URL
3. **Create live Products and Prices** in the Stripe Dashboard (or migrate from test)
4. **Update the price IDs** in your production environment

## Troubleshooting

- **Webhook errors**: Check the Stripe CLI output and your server logs
- **Payment failures**: Look at the Stripe Dashboard Events section
- **Subscription issues**: Verify the product and price IDs match
- **Integration problems**: Ensure your environment variables are correctly set

For detailed Stripe API documentation, visit the [Stripe API Reference](https://stripe.com/docs/api). 
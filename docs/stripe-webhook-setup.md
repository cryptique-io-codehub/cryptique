# Stripe Webhook Standardization Guide

## Overview

We have standardized our Stripe webhook endpoint to ensure consistent handling of payment and subscription events. All Stripe integrations should use the official webhook endpoint:

```
https://cryptique-backend.vercel.app/api/webhooks/stripe
```

## Steps to Update Stripe Dashboard Configuration

1. **Log in to your Stripe Dashboard** at https://dashboard.stripe.com/

2. **Navigate to Webhooks**:
   - Go to **Developers** in the left sidebar
   - Select **Webhooks**

3. **Check existing webhook endpoints**:
   - Look for any existing webhook endpoints that might be using the incorrect path
   - If you find endpoints using variations like `/api/stripe/webhook` or similar non-standard paths, delete or update them

4. **Add or update the standard webhook endpoint**:
   - Click **+ Add endpoint**
   - Enter the standardized URL: `https://cryptique-backend.vercel.app/api/webhooks/stripe`
   - Under **Events to send**, select:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - Add any other events your application needs
   - Click **Add endpoint**

5. **Verify the webhook secret**:
   - After adding the endpoint, you'll see a webhook signing secret
   - Ensure this secret matches the `STRIPE_WEBHOOK_SECRET` environment variable in your server configuration
   - If needed, update the environment variable to match the webhook secret

6. **Test the webhook**:
   - In the Stripe Dashboard, navigate to the webhook endpoint
   - Click **Send test webhook**
   - Select an event type (e.g., `checkout.session.completed`)
   - Click **Send test webhook**
   - Check your server logs to confirm the event was received and processed correctly

## Verifying Configuration in Production

1. **Check server logs** for any webhook-related errors
2. **Trigger a real webhook event** (e.g., create a test subscription)
3. **Verify database updates** to confirm webhook events are properly processed

## Troubleshooting

If webhooks are not being received or processed:

1. **Check the webhook URL** in the Stripe Dashboard matches exactly: `https://cryptique-backend.vercel.app/api/webhooks/stripe`
2. **Verify the webhook secret** matches your server's environment variable
3. **Check server logs** for any errors in webhook processing
4. **Test with Stripe CLI** during development:
   ```
   stripe listen --forward-to http://localhost:3001/api/webhooks/stripe
   ```
   This will show if events are being sent and how your server responds

Remember that webhook events may be delayed, so allow some time for events to be received after triggering actions in Stripe. 
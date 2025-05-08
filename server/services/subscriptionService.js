const Subscription = require('../models/Subscription');
const Team = require('../models/team');
const coinbaseService = require('./coinbaseService');
const zohoService = require('./zohoService');

class SubscriptionService {
  // Create a new subscription checkout session
  async createCheckoutSession(teamId, planType, hasCQIntelligence) {
    try {
      // Get the team details
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Get plan details
      const planDetails = coinbaseService.getSubscriptionPlanDetails(planType, hasCQIntelligence);

      // Check if the team has a Zoho contact
      let contactId = team.billing?.zohoContactId;
      
      // If not, create one
      if (!contactId && team.owner) {
        // We need to fetch owner's details
        // For simplicity, we're assuming we can construct basic contact info from team
        const contactData = {
          firstName: 'Team',
          lastName: 'Member',
          email: team.members.find(m => m.userId === team.owner)?.email || 'unknown@example.com',
          companyName: team.billing?.companyName || team.name,
          phone: '',
          address: team.billing?.address || '',
          city: team.billing?.city || '',
          zipCode: team.billing?.zipCode || '',
          country: team.billing?.country || '',
          teamName: team.name
        };

        contactId = await zohoService.createContact(contactData);
        
        // Save the contact ID to the team
        team.billing = {
          ...team.billing,
          zohoContactId: contactId
        };
        await team.save();
      }

      // Create a checkout session
      const checkout = await coinbaseService.createCheckout(planDetails, teamId, contactId);

      return {
        checkoutId: checkout.data.id,
        checkoutUrl: checkout.data.hosted_url,
        expiresAt: checkout.data.expires_at
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error(`Failed to create checkout: ${error.message}`);
    }
  }

  // Process a successful payment
  async processSuccessfulPayment(chargeId) {
    try {
      // Get charge details from Coinbase
      const charge = await coinbaseService.getCharge(chargeId);
      
      if (!charge || !charge.data) {
        throw new Error('Invalid charge data');
      }

      const { teamId, planType } = charge.data.metadata;
      const hasCQIntelligence = charge.data.metadata.hasCQIntelligence === 'true';
      
      // Get team data
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Get plan details
      const planDetails = coinbaseService.getSubscriptionPlanDetails(planType, hasCQIntelligence);

      // Calculate subscription end date (30 days from now)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      // Create subscription record
      const subscription = new Subscription({
        teamId,
        plan: planType,
        features: planDetails.features,
        status: 'active',
        startDate: new Date(),
        endDate,
        billingCycle: 'monthly',
        price: {
          amount: planDetails.price,
          currency: 'USD'
        },
        paymentMethod: 'coinbase',
        coinbaseChargeId: chargeId,
        zohoContactId: team.billing?.zohoContactId
      });

      await subscription.save();

      // If team has Zoho contact ID, create a deal
      if (team.billing?.zohoContactId) {
        await zohoService.createDeal({
          teamName: team.name,
          planName: planDetails.name,
          companyName: team.billing?.companyName,
          contactId: team.billing.zohoContactId,
          amount: planDetails.price,
          hasCQIntelligence
        });
      }

      // Update team with CQ Intelligence feature if applicable
      if (hasCQIntelligence) {
        team.features = {
          ...team.features,
          hasCQIntelligence: true
        };
        await team.save();
      }

      return subscription;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw new Error(`Failed to process payment: ${error.message}`);
    }
  }

  // Get team's active subscription
  async getActiveSubscription(teamId) {
    try {
      const subscription = await Subscription.findOne({
        teamId,
        status: 'active',
        endDate: { $gt: new Date() }
      });

      return subscription;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }
  }

  // Check if team has access to specific feature
  async hasFeatureAccess(teamId, feature, value) {
    try {
      const subscription = await this.getActiveSubscription(teamId);
      
      if (!subscription) {
        return false;
      }

      switch (feature) {
        case 'websites':
          return subscription.features.maxWebsites >= value;
        case 'contracts':
          return subscription.features.maxContracts >= value;
        case 'apiCalls':
          return subscription.features.maxApiCalls >= value;
        case 'teamMembers':
          return subscription.features.maxTeamMembers >= value;
        case 'cqIntelligence':
          return subscription.features.hasCQIntelligence;
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error checking feature access for ${feature}:`, error);
      throw new Error(`Failed to check feature access: ${error.message}`);
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      subscription.status = 'cancelled';
      await subscription.save();

      return subscription;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  // Get all team's subscriptions
  async getTeamSubscriptions(teamId) {
    try {
      const subscriptions = await Subscription.find({ teamId }).sort({ createdAt: -1 });
      return subscriptions;
    } catch (error) {
      console.error('Error fetching team subscriptions:', error);
      throw new Error(`Failed to fetch team subscriptions: ${error.message}`);
    }
  }
}

module.exports = new SubscriptionService(); 
const mongoose = require('mongoose');
const SubscriptionPlan = require('../models/subscriptionPlan');

// Use the MongoDB URI directly
const MONGODB_URI = 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server';

// Default connection options
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

async function initSubscriptionPlans() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI, connectionOptions);
    console.log('Connected to database.');

    console.log('Checking for existing subscription plans...');
    const existingPlans = await SubscriptionPlan.countDocuments();
    
    if (existingPlans > 0) {
      console.log(`Found ${existingPlans} existing plans. Removing them...`);
      await SubscriptionPlan.deleteMany({});
      console.log('Existing plans removed.');
    }

    console.log('Creating subscription plans...');
    
    const plans = [
      {
        name: 'Off-chain',
        price: 59,
        period: 'monthly',
        description: 'Off-chain analytics for 1 website',
        features: {
          maxWebsites: 1,
          maxSmartContracts: 0,
          maxApiCalls: 0,
          maxTeamMembers: 1,
          hasOffChainAnalytics: true,
          hasOnChainAnalytics: false,
          hasCQIntelligence: false
        }
      },
      {
        name: 'Basic',
        price: 299,
        period: 'monthly',
        description: 'Full access with limits (2 websites, 1 smart contract, 40k API calls)',
        features: {
          maxWebsites: 2,
          maxSmartContracts: 1,
          maxApiCalls: 40000,
          maxTeamMembers: 2,
          hasOffChainAnalytics: true,
          hasOnChainAnalytics: true,
          hasCQIntelligence: false
        }
      },
      {
        name: 'Pro',
        price: 599,
        period: 'monthly',
        description: 'Advanced access (3 websites, 3 smart contracts, 150k API calls)',
        features: {
          maxWebsites: 3,
          maxSmartContracts: 3,
          maxApiCalls: 150000,
          maxTeamMembers: 3,
          hasOffChainAnalytics: true,
          hasOnChainAnalytics: true,
          hasCQIntelligence: false
        }
      },
      {
        name: 'Enterprise',
        price: 1999,
        period: 'monthly',
        description: 'Custom enterprise plan with unlimited resources',
        features: {
          maxWebsites: -1, // Unlimited
          maxSmartContracts: -1, // Unlimited
          maxApiCalls: -1, // Unlimited
          maxTeamMembers: -1, // Unlimited
          hasOffChainAnalytics: true,
          hasOnChainAnalytics: true,
          hasCQIntelligence: false
        }
      },
      {
        name: 'CQ-Intelligence-Addon',
        price: 299,
        period: 'monthly',
        description: 'CQ Intelligence addon for any plan',
        features: {
          maxWebsites: 0,
          maxSmartContracts: 0,
          maxApiCalls: 0,
          maxTeamMembers: 0,
          hasOffChainAnalytics: false,
          hasOnChainAnalytics: false,
          hasCQIntelligence: true
        }
      }
    ];

    await SubscriptionPlan.insertMany(plans);
    console.log('Subscription plans created successfully.');

    // Get and display created plans
    const createdPlans = await SubscriptionPlan.find();
    console.log(`Created ${createdPlans.length} subscription plans:`);
    createdPlans.forEach(plan => {
      console.log(`- ${plan.name}: $${plan.price}/${plan.period}`);
    });

  } catch (error) {
    console.error('Error initializing subscription plans:', error);
  } finally {
    console.log('Closing database connection...');
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

// Run the script
initSubscriptionPlans(); 
/**
 * Migration script to update all teams with accurate usage data
 */
const mongoose = require('mongoose');
const Team = require('../models/team');
const Website = require('../models/website');
const { SUBSCRIPTION_PLANS } = require('../config/stripe');
require('dotenv').config();

const updateTeamUsage = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Get all teams
    const teams = await Team.find();
    console.log(`Found ${teams.length} teams to update`);
    
    let updatedCount = 0;
    
    for (const team of teams) {
      // Count websites
      const websiteCount = await Website.countDocuments({ team: team._id });
      
      // Get subscription plan limits
      let planLimits = {};
      if (team.subscription && team.subscription.plan) {
        const planKey = team.subscription.plan.toUpperCase();
        if (SUBSCRIPTION_PLANS[planKey]) {
          planLimits = SUBSCRIPTION_PLANS[planKey].limits;
        }
      }
      
      // Use plan limits if available, otherwise use defaults
      const limits = {
        websites: team.subscription?.limits?.websites || planLimits.websites || 1,
        smartContracts: team.subscription?.limits?.smartContracts || planLimits.smartContracts || 0,
        apiCalls: team.subscription?.limits?.apiCalls || planLimits.apiCalls || 0,
        teamMembers: team.subscription?.limits?.teamMembers || planLimits.teamMembers || 1
      };
      
      // Initialize or update usage data
      const usage = {
        websites: websiteCount,
        smartContracts: team.usage?.smartContracts || 0,
        apiCalls: team.usage?.apiCalls || 0,
        teamMembers: team.user?.length || 1,
        lastResetDate: team.usage?.lastResetDate || new Date()
      };
      
      // Update the team
      await Team.findByIdAndUpdate(team._id, {
        'usage': usage,
        'subscription.limits': limits
      });
      
      console.log(`Updated team "${team.name}": websites=${websiteCount}, limits=${JSON.stringify(limits)}`);
      updatedCount++;
    }
    
    console.log(`Successfully updated ${updatedCount} teams`);
    
  } catch (error) {
    console.error('Error updating team usage:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
};

// Run the migration
updateTeamUsage(); 
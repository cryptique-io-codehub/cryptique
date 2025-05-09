const express = require('express');
const router = express.Router();
const zohoService = require('../../services/zoho');
const Team = require('../../models/team');
const User = require('../../models/user');

/**
 * Sync a user with Zoho CRM
 * POST /api/zoho/sync/user
 */
router.post('/sync/user', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create or update the contact in Zoho
    const response = await zohoService.upsertContact({
      email: user.email,
      name: user.name,
      phone: user.phone || ''
    });

    // Store the Zoho contact ID in user record
    if (response && response.data && response.data[0] && response.data[0].details) {
      user.zohoDetails = {
        contactId: response.data[0].details.id
      };
      await user.save();
    }

    return res.status(200).json({ 
      success: true, 
      message: 'User synced with Zoho CRM', 
      zohoResponse: response 
    });
  } catch (error) {
    console.error('Error syncing user with Zoho:', error);
    return res.status(500).json({ error: 'Failed to sync user with Zoho CRM' });
  }
});

/**
 * Sync a team with Zoho CRM
 * POST /api/zoho/sync/team
 */
router.post('/sync/team', async (req, res) => {
  try {
    const { teamId } = req.body;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const team = await Team.findById(teamId).populate('ownerId');
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Create or update account in Zoho
    const accountResponse = await zohoService.upsertAccount({
      name: team.name,
      description: `Cryptique Analytics team account`
    });

    let accountId = null;
    if (accountResponse && accountResponse.data && accountResponse.data[0] && accountResponse.data[0].details) {
      accountId = accountResponse.data[0].details.id;
      
      // Store the Zoho account ID in team record
      team.zohoDetails = {
        accountId
      };
      await team.save();
    }

    // Also sync team owner as contact if not already done
    if (team.ownerId && !team.ownerId.zohoDetails?.contactId) {
      const contactResponse = await zohoService.upsertContact({
        email: team.ownerId.email,
        name: team.ownerId.name,
        teamName: team.name
      });

      if (contactResponse && contactResponse.data && contactResponse.data[0] && contactResponse.data[0].details) {
        team.ownerId.zohoDetails = {
          contactId: contactResponse.data[0].details.id
        };
        await team.ownerId.save();
        
        // Store contact ID in team record as well
        team.zohoDetails.contactId = contactResponse.data[0].details.id;
        await team.save();
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Team synced with Zoho CRM',
      zohoResponse: { accountResponse }
    });
  } catch (error) {
    console.error('Error syncing team with Zoho:', error);
    return res.status(500).json({ error: 'Failed to sync team with Zoho CRM' });
  }
});

/**
 * Create a subscription deal in Zoho CRM
 * POST /api/zoho/deals/subscription
 */
router.post('/deals/subscription', async (req, res) => {
  try {
    const { teamId, planType, amount, startDate, endDate } = req.body;
    
    if (!teamId || !planType) {
      return res.status(400).json({ error: 'Team ID and plan type are required' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Make sure the team has a Zoho account ID
    if (!team.zohoDetails || !team.zohoDetails.accountId) {
      return res.status(400).json({ 
        error: 'Team is not synced with Zoho CRM yet. Please sync the team first.' 
      });
    }

    // Create a new deal in Zoho
    const dealResponse = await zohoService.createDeal({
      name: `${team.name} - ${planType.toUpperCase()} Subscription`,
      accountId: team.zohoDetails.accountId,
      amount: amount,
      stage: 'Closed Won',
      closingDate: new Date(),
      description: `Subscription for ${planType} plan from ${startDate} to ${endDate}`
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Subscription deal created in Zoho CRM',
      zohoResponse: dealResponse
    });
  } catch (error) {
    console.error('Error creating subscription deal in Zoho:', error);
    return res.status(500).json({ error: 'Failed to create subscription deal in Zoho CRM' });
  }
});

/**
 * Update subscription status in Zoho CRM
 * POST /api/zoho/subscription/status
 */
router.post('/subscription/status', async (req, res) => {
  try {
    const { teamId, status, plan, amount, startDate, endDate } = req.body;
    
    if (!teamId || !status || !plan) {
      return res.status(400).json({ error: 'Team ID, status, and plan are required' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Make sure the team has a Zoho contact ID
    if (!team.zohoDetails || !team.zohoDetails.contactId) {
      return res.status(400).json({ 
        error: 'Team contact is not synced with Zoho CRM yet. Please sync the team first.' 
      });
    }

    // Update subscription status in Zoho
    const updateResponse = await zohoService.updateSubscriptionStatus(
      team.zohoDetails.contactId,
      {
        status,
        plan,
        amount,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      }
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Subscription status updated in Zoho CRM',
      zohoResponse: updateResponse
    });
  } catch (error) {
    console.error('Error updating subscription status in Zoho:', error);
    return res.status(500).json({ error: 'Failed to update subscription status in Zoho CRM' });
  }
});

module.exports = router; 
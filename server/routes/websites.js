const express = require('express');
const router = express.Router();
const subscriptionCheck = require('../middleware/subscriptionCheck');
const { checkWebsiteLimit } = require('../middleware/limitChecker');
const Team = require('../models/team');

/**
 * Get all websites for a team
 */
router.get('/:teamId', subscriptionCheck, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // In a real application, you would fetch websites from the database
    // This is a placeholder to demonstrate the concept
    const websites = []; // Would be populated from database
    
    res.json(websites);
  } catch (error) {
    console.error('Error fetching websites:', error);
    res.status(500).json({ error: 'Failed to fetch websites' });
  }
});

/**
 * Create a new website
 * Uses checkWebsiteLimit middleware to enforce subscription limits
 */
router.post('/:teamId', subscriptionCheck, checkWebsiteLimit(), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { url, name, description } = req.body;
    
    if (!url || !name) {
      return res.status(400).json({ error: 'URL and name are required' });
    }
    
    // In a real application, you would create a new website in the database
    // For demonstration purposes, we'll just return a success message
    
    // Note that the checkWebsiteLimit middleware has already:
    // 1. Checked if the team's plan allows more websites
    // 2. Incremented the usage counter if allowed
    
    res.status(201).json({ 
      success: true, 
      message: 'Website added successfully',
      website: {
        id: 'website_' + Date.now(),
        teamId,
        url,
        name,
        description,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error creating website:', error);
    res.status(500).json({ error: 'Failed to create website' });
  }
});

/**
 * Delete a website
 * When a website is deleted, we need to decrement the usage counter
 */
router.delete('/:teamId/:websiteId', subscriptionCheck, async (req, res) => {
  try {
    const { teamId, websiteId } = req.params;
    
    // In a real application, you would delete the website from the database
    // For demonstration purposes, we'll just decrement the counter
    
    // Decrement the website usage counter
    const team = await Team.findById(teamId);
    if (team && team.usage && team.usage.websites > 0) {
      await Team.findByIdAndUpdate(teamId, {
        'usage.websites': team.usage.websites - 1
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Website deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting website:', error);
    res.status(500).json({ error: 'Failed to delete website' });
  }
});

module.exports = router; 
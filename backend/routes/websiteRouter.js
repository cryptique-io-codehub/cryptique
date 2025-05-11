const express = require('express');

const {addWebsite,deleteWebsite,verify, getWebsitesOfTeam}=require("../controllers/websiteController");
const Website = require('../models/website');
const Analytics = require('../models/analytics');
const {verifyToken}=require('../middleware/auth');
// Import the middleware for checking website limits
const { checkWebsiteLimit } = require('../middleware/limitChecker');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Apply limit checking middleware to create route
router.post('/create', checkWebsiteLimit(), addWebsite);
router.post('/delete',deleteWebsite);
// Add a new DELETE route that accepts siteId as a parameter
router.delete('/delete/:siteId', async (req, res) => {
  try {
    const siteId = req.params.siteId;
    console.log(`Deleting website with siteId: ${siteId}`);
    
    if (!siteId) {
      return res.status(400).json({ message: "Website ID is required" });
    }
    
    // Find the website by siteId
    const website = await Website.findOne({ siteId });
    
    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }
    
    // Find the team that owns this website
    const Team = require('../models/team');
    const team = await Team.findOne({ websites: website._id });
    
    if (!team) {
      return res.status(404).json({ message: "Team not found for this website" });
    }
    
    // Delete the website
    await Website.deleteOne({ _id: website._id });
    
    // Remove website reference from team
    await Team.findByIdAndUpdate(
      team._id,
      { $pull: { websites: website._id } },
      { new: true }
    );
    
    return res.status(200).json({
      message: "Website deleted successfully",
      website: {
        _id: website._id,
        siteId: website.siteId,
        Domain: website.Domain
      }
    });
  } catch (error) {
    console.error("Error deleting website by siteId:", error);
    return res.status(500).json({
      message: "Error deleting website",
      error: error.message
    });
  }
});
router.post('/verify',verify);
router.get('/team/:teamName',getWebsitesOfTeam);

// New route to auto-verify websites with analytics data
router.post('/auto-verify-all', async (req, res) => {
  try {
    console.log('Auto-verifying all websites with analytics data');
    
    // Get all analytics records with data
    const analyticsRecords = await Analytics.find({ totalVisitors: { $gt: 0 } });
    
    if (!analyticsRecords || analyticsRecords.length === 0) {
      return res.status(200).json({ 
        message: "No analytics records found with visitor data", 
        verified: 0 
      });
    }
    
    console.log(`Found ${analyticsRecords.length} analytics records with visitor data`);
    
    // Keep track of successfully verified websites
    let verifiedCount = 0;
    
    // Process each analytics record
    for (const analytics of analyticsRecords) {
      // Find the website with matching siteId
      const website = await Website.findOne({ siteId: analytics.siteId });
      
      if (website) {
        // If website not verified or analytics reference missing, update it
        if (!website.isVerified || !website.analytics || !website.analytics.equals(analytics._id)) {
          await Website.findByIdAndUpdate(
            website._id,
            { 
              $set: { 
                isVerified: true,
                analytics: analytics._id 
              } 
            }
          );
          
          verifiedCount++;
          console.log(`Auto-verified website: ${website.Domain} (${website.siteId})`);
        }
      }
    }
    
    return res.status(200).json({ 
      message: `Successfully auto-verified ${verifiedCount} websites with analytics data`,
      verified: verifiedCount
    });
  } catch (error) {
    console.error('Error in auto-verify-all:', error);
    return res.status(500).json({ 
      message: 'Error auto-verifying websites', 
      error: error.message 
    });
  }
});

// Ensure the routes are accessible
router.get('/routes', (req, res) => {
  const routes = router.stack.map(layer => {
    return {
      path: layer.route?.path,
      methods: layer.route?.methods ? Object.keys(layer.route.methods) : []
    };
  }).filter(route => route.path);
  
  res.json({
    message: 'Website router routes',
    routes
  });
});

module.exports=router;
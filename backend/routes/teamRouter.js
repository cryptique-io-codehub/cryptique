const express = require('express');
const {addMember,getTeamDetails,createNewTeam,getAdminTeamDetails,getMembers,deleteTeam,updateTeam,removeMember,updateMemberRole,getSubscriptionStatus}=require ('../controllers/teamController')
const {verifyToken}=require('../middleware/auth')
const Team = require('../models/team');
const cors = require('cors');
const router = express.Router();

// Configure CORS for team endpoints
const corsOptions = {
  origin: ['http://localhost:3000', 'https://app.cryptique.io', 'https://cryptique.io'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400
};

// Apply CORS middleware
router.use(cors(corsOptions));

router.post('/create',verifyToken,addMember);
router.get('/:teamId/members',verifyToken,getMembers);
router.get('/details',verifyToken,async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find all teams where the user is a member
    const teams = await Team.find({
      $or: [
        { owner: userId },
        { members: userId }
      ]
    }).select('name owner members role');

    // Format the response
    const formattedTeams = teams.map(team => ({
      _id: team._id,
      name: team.name,
      isOwner: team.owner.toString() === userId,
      role: team.members.includes(userId) ? 'member' : 'owner',
      members: team.members.length
    }));

    res.json({ team: formattedTeams });
  } catch (error) {
    console.error('Error fetching team details:', error);
    res.status(500).json({ 
      message: 'Error fetching team details',
      error: error.message 
    });
  }
});
router.get('/admin-team-details',verifyToken,getAdminTeamDetails);
router.post('/createNewTeam',verifyToken,createNewTeam);
router.post('/delete',verifyToken,deleteTeam);
router.post('/update',verifyToken,updateTeam);
router.post('/remove-member',verifyToken,removeMember);
router.post('/update-member-role',verifyToken,updateMemberRole);
router.get('/subscription-status/:teamName',verifyToken,getSubscriptionStatus);

// Save billing details for a team
router.post('/:teamId/billing-address', verifyToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        const billingAddress = req.body;
        
        // Update team with billing address
        const updatedTeam = await Team.findByIdAndUpdate(
            teamId,
            { billingAddress },
            { new: true }
        );
        
        if (!updatedTeam) {
            return res.status(404).json({ message: "Team not found" });
        }
        
        return res.status(200).json({ 
            message: "Billing address saved successfully", 
            billingAddress: updatedTeam.billingAddress 
        });
    } catch (error) {
        console.error("Error saving billing address:", error);
        return res.status(500).json({ 
            message: "Error saving billing address", 
            error: error.message 
        });
    }
});

// Get billing address for a team
router.get('/:teamId/billing-address', verifyToken, async (req, res) => {
    try {
        const { teamId } = req.params;
        
        const team = await Team.findById(teamId);
        
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }
        
        return res.status(200).json(team.billingAddress || null);
    } catch (error) {
        console.error("Error getting billing address:", error);
        return res.status(500).json({ 
            message: "Error retrieving billing address", 
            error: error.message 
        });
    }
});

module.exports = router;
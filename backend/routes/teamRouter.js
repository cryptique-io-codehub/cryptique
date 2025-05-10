const express = require('express');
const {addMember,getTeamDetails,createNewTeam,getAdminTeamDetails,getMembers,deleteTeam,updateTeam,removeMember,updateMemberRole}=require ('../controllers/teamController')
const {verifyToken}=require('../middleware/auth')
const Team = require('../models/team');
const router = express.Router();


router.post('/create',verifyToken,addMember);
router.post('/members',verifyToken,getMembers);
router.get('/details',verifyToken,getTeamDetails);
router.get('/admin-team-details',verifyToken,getAdminTeamDetails);
router.post('/createNewTeam',verifyToken,createNewTeam);
router.post('/delete',verifyToken,deleteTeam);
router.post('/update',verifyToken,updateTeam);
router.post('/remove-member',verifyToken,removeMember);
router.post('/update-member-role',verifyToken,updateMemberRole);

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
const express = require('express');
const {addMember,getTeamDetails,createNewTeam,getAdminTeamDetails,getMembers,updateTeam}=require ('../controllers/teamController')
const {verifyToken}=require('../middleware/auth')
const router = express.Router();
const verifyTokenMiddleware = require("../middleware/verifyToken");
const { validateMember } = require("../middleware/validateData");
const { teamCorsMiddleware } = require('../middleware/corsMiddleware');

// Apply the team-specific CORS middleware to all routes
router.use(teamCorsMiddleware);

router.use(verifyToken);
router.post('/add-user', validateMember, addMember);
router.get('/details', verifyToken, getTeamDetails);
router.post('/members', verifyToken, getMembers);
router.get('/adminDetails', verifyToken, getAdminTeamDetails);
router.post('/create', verifyToken, createNewTeam);
router.put('/update', verifyToken, updateTeam);

module.exports = router;
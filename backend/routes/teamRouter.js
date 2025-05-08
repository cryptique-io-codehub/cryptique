const express = require('express');
const {addMember,getTeamDetails,createNewTeam,getAdminTeamDetails,getMembers,deleteTeam}=require ('../controllers/teamController')
const {verifyToken}=require('../middleware/auth')
const router = express.Router();


router.post('/create',verifyToken,addMember);
router.post('/members',verifyToken,getMembers);
router.get('/details',verifyToken,getTeamDetails);
router.get('/admin-team-details',verifyToken,getAdminTeamDetails);
router.post('/createNewTeam',verifyToken,createNewTeam);
router.post('/delete',verifyToken,deleteTeam);
module.exports = router;
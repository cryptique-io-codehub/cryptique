const express = require('express');
const {addMember,getTeamDetails,createNewTeam,getAdminTeamDetails,getMembers,deleteTeam,updateTeam,removeMember}=require ('../controllers/teamController')
const {verifyToken}=require('../middleware/auth')
const router = express.Router();


router.post('/create',verifyToken,addMember);
router.post('/members',verifyToken,getMembers);
router.get('/details',verifyToken,getTeamDetails);
router.get('/admin-team-details',verifyToken,getAdminTeamDetails);
router.post('/createNewTeam',verifyToken,createNewTeam);
router.post('/delete',verifyToken,deleteTeam);
router.post('/update',verifyToken,updateTeam);
router.post('/remove-member',verifyToken,removeMember);
module.exports = router;
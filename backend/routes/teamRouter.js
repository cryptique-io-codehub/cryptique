const express = require('express');
const {addMember,getTeamDetails,createNewTeam,getAdminTeamDetails}=require ('../controllers/teamController')
const {verifyToken}=require('../middleware/auth')
const router = express.Router();


router.post('/create',verifyToken,addMember);
router.get('/details',verifyToken,getTeamDetails);
router.get('/AdminTeamDetails',verifyToken,getAdminTeamDetails);
router.post('/createNewTeam',verifyToken,createNewTeam);
module.exports = router;
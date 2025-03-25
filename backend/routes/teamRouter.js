const express = require('express');

const {addMember,getTeamDetails,createNewTeam}=require ('../controllers/teamController')
const {verifyToken}=require('../middleware/auth')
const router = express.Router();

router.post('/create',verifyToken,addMember);
router.get('/details',verifyToken,getTeamDetails);
router.post('/createNewTeam',verifyToken,createNewTeam);
module.exports = router;
const express = require('express');
const {addMember,getTeamDetails}=require ('../controllers/teamController')
const {verifyToken}=require('../middleware/auth')
const router = express.Router();

router.post('/create',verifyToken,addMember);
router.get('/details',verifyToken,getTeamDetails);

module.exports = router;
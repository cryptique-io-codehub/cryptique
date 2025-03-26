const express = require('express');
const { createUser, getUser , googleLogin,login,verifyOtp,getThisUser} = require('../controllers/userAuthController');
const router = express.Router();
const {verifyToken} = require('../middleware/auth')


router.post('/user',verifyToken,getThisUser);
router.post('/verifyOTP',verifyOtp);
router.post('/create',createUser);
router.get('/get/:email',getUser);
router.post('/google-login', googleLogin);
router.post('/login',login)


module.exports = router;
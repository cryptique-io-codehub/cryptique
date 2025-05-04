const express = require('express');
const { createUser, getUser, googleLogin, login, verifyOtp } = require('../controllers/userAuthController');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { authLimiter, loginFailureLimiter } = require('../middleware/rateLimiter');

// Apply auth rate limiter to authentication endpoints
router.post('/verifyOTP', authLimiter, verifyOtp);
router.post('/create', authLimiter, createUser);
router.get('/get/:email', getUser);
router.post('/google-login', authLimiter, googleLogin);
router.post('/login', loginFailureLimiter, login);

module.exports = router;
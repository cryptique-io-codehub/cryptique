const express = require('express');
const { createUser, getUser, googleLogin, login, verifyOtp, refreshToken, logout, resendOtp, forgotPassword, resetPassword } = require('../controllers/userAuthController');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { authLimiter, loginFailureLimiter } = require('../middleware/rateLimiter');

// Apply auth rate limiter to authentication endpoints
router.post('/verifyOTP', authLimiter, verifyOtp);
router.post('/create', authLimiter, createUser);
router.get('/get/:email', getUser);
router.post('/google-login', authLimiter, googleLogin);
router.post('/login', loginFailureLimiter, login);
router.post('/resend-otp', authLimiter, resendOtp);

// Password reset routes
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Token management routes
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

module.exports = router;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/refreshToken');
require('dotenv').config();

// Constants
const ACCESS_TOKEN_EXPIRY = '2h'; // 2 hours
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

/**
 * Generate a JWT access token
 * @param {Object} payload Data to include in the token
 * @returns {String} JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
};

/**
 * Generate a secure refresh token
 * @returns {String} Random token
 */
const generateRefreshTokenString = () => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Create and save a refresh token in the database
 * @param {String} userId User's ID
 * @param {String} ipAddress Client IP address
 * @param {String} userAgent Client user agent
 * @returns {Object} Refresh token object
 */
const createRefreshToken = async (userId, ipAddress, userAgent) => {
  // Generate a random token string
  const tokenString = generateRefreshTokenString();
  
  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + REFRESH_TOKEN_EXPIRY);
  
  // Create refresh token document
  const refreshToken = new RefreshToken({
    userId,
    token: tokenString,
    ipAddress,
    userAgent,
    expiresAt
  });
  
  // Save to database
  await refreshToken.save();
  
  return refreshToken;
};

/**
 * Verify if a refresh token is valid
 * @param {String} token Refresh token to verify
 * @returns {Promise<Object|null>} The token document if valid, null otherwise
 */
const verifyRefreshToken = async (token) => {
  const refreshToken = await RefreshToken.findOne({
    token,
    isValid: true,
    expiresAt: { $gt: new Date() }
  });
  
  return refreshToken;
};

/**
 * Invalidate a refresh token
 * @param {String} token Token to invalidate
 */
const invalidateRefreshToken = async (token) => {
  await RefreshToken.findOneAndUpdate(
    { token },
    { isValid: false }
  );
};

/**
 * Invalidate all refresh tokens for a user
 * @param {String} userId User's ID
 */
const invalidateAllUserTokens = async (userId) => {
  await RefreshToken.updateMany(
    { userId },
    { isValid: false }
  );
};

/**
 * Verify an access token
 * @param {String} token Access token to verify
 * @returns {Object|null} Decoded token if valid, null otherwise
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  invalidateRefreshToken,
  invalidateAllUserTokens,
  verifyAccessToken,
  ACCESS_TOKEN_EXPIRY_SECONDS: parseInt(ACCESS_TOKEN_EXPIRY) * 3600, // Convert hours to seconds for frontend
  REFRESH_TOKEN_EXPIRY_MS: REFRESH_TOKEN_EXPIRY
}; 
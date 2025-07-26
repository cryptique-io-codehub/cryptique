/**
 * User Service
 * Business logic for user operations
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/user');
const Team = require('../models/team');
const sendOtp = require('../utils/sendOtp');
const tokenService = require('../utils/tokenService');
const { validatePassword, checkCommonPatterns } = require('../utils/passwordValidator');

// OTP configuration
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Generate a secure OTP using crypto
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 999999);
};

/**
 * Create user with validation and OTP
 */
const createUser = async (userData) => {
  const { name, email, password, avatar } = userData;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User already exists');
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.message);
  }
  
  // Check for common patterns or user data in password
  const patternCheck = checkCommonPatterns(password, { name, email });
  if (!patternCheck.isValid) {
    throw new Error(patternCheck.message);
  }
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = generateOtp();
  const otpExpiry = Date.now() + OTP_EXPIRY;
  
  // Send OTP to the user
  await sendOtp(
    email, 
    'Otp verification for Cryptique', 
    `Thank you for signing up with Cryptique! Your OTP is ${otp}`
  );
  
  // Create user
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    avatar: avatar || '',
    otp,
    otpExpiry
  });
  
  await newUser.save();
  return newUser;
};

/**
 * Verify OTP and create team
 */
const verifyOtpAndCreateTeam = async (email, otp) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error('Invalid email');
  }
  
  // Check if OTP is valid and not expired
  if (user.otp !== parseInt(otp) || !user.otpExpiry || user.otpExpiry < Date.now()) {
    throw new Error('Invalid or expired OTP');
  }
  
  // Mark user as verified
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();
  
  // Create a team if it doesn't exist
  const teamName = email.split('@')[0];
  let team = await Team.findOne({ name: teamName });
  
  if (!team) {
    team = new Team({
      name: teamName,
      createdBy: user._id,
      user: [{ userId: user._id, role: 'admin' }]
    });
    
    await team.save();
    user.team = [team._id];
    await user.save();
  }
  
  return { user, team };
};

/**
 * Handle Google login/signup
 */
const handleGoogleAuth = async (googleData) => {
  const { name, email, avatar } = googleData;
  
  // Check if user already exists
  let user = await User.findOne({ email });
  
  if (!user) {
    // Create a new user for Google users
    user = new User({
      name,
      email,
      avatar: avatar || '',
      password: '', // No password for Google users
      isVerified: true
    });
    
    await user.save();
  } else {
    // Update verification status
    user.isVerified = true;
    await user.save();
  }
  
  // Create a team if needed
  const teamName = email.split('@')[0];
  let team = await Team.findOne({ name: teamName });
  
  if (!team) {
    team = new Team({
      name: teamName,
      createdBy: user._id,
      user: [{ userId: user._id, role: 'admin' }]
    });
    
    await team.save();
    user.team = [team._id];
    await user.save();
  }
  
  return { user, team };
};

/**
 * Authenticate user with email and password
 */
const authenticateUser = async (email, password) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    const error = new Error('User not found');
    error.isLoginFailure = true;
    throw error;
  }
  
  if (!user.isVerified) {
    throw new Error('User not verified');
  }
  
  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.isLoginFailure = true;
    throw error;
  }
  
  return user;
};

/**
 * Generate tokens for user
 */
const generateUserTokens = async (user, req) => {
  const accessToken = tokenService.generateAccessToken({ userId: user._id });
  
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const refreshToken = await tokenService.createRefreshToken(user._id, ipAddress, userAgent);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: tokenService.ACCESS_TOKEN_EXPIRY_SECONDS
  };
};

/**
 * Resend OTP to user
 */
const resendOtp = async (email) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Generate a new OTP
  const otp = generateOtp();
  const otpExpiry = Date.now() + OTP_EXPIRY;
  
  // Update user with new OTP
  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();
  
  // Send the new OTP
  await sendOtp(email, 'New OTP verification for Cryptique', `Your new OTP is ${otp}`);
  
  return { message: 'New OTP sent successfully' };
};

/**
 * Generate password reset token
 */
const generatePasswordResetToken = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }
  
  // Generate a secure token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  
  // Hash the token before storing it
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Store the token with the user
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = resetTokenExpiry;
  await user.save({ validateBeforeSave: false });
  
  // Send the reset token to user's email
  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const message = `Forgot your password? Submit a request with your new password to: ${resetURL}\nIf you didn't forget your password, please ignore this email.`;
  
  await sendOtp(
    user.email,
    'Cryptique Password Reset (Valid for 1 hour)',
    message
  );
  
  return { message: 'Password reset token sent to email' };
};

/**
 * Reset password with token
 */
const resetPasswordWithToken = async (token, newPassword, req) => {
  // Hash the token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Find user with this token and check if token is still valid
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
  
  if (!user) {
    throw new Error('Token is invalid or has expired');
  }
  
  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.message);
  }
  
  // Check for common patterns or user data in password
  const patternCheck = checkCommonPatterns(newPassword, { 
    name: user.name, 
    email: user.email 
  });
  if (!patternCheck.isValid) {
    throw new Error(patternCheck.message);
  }
  
  // Update the password
  user.password = await bcrypt.hash(newPassword, 10);
  
  // Remove password reset fields
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  
  await user.save();
  
  // Generate tokens for automatic login
  const tokens = await generateUserTokens(user, req);
  
  return { user, tokens };
};

/**
 * Refresh user token
 */
const refreshUserToken = async (refreshToken) => {
  const tokenDoc = await tokenService.verifyRefreshToken(refreshToken);
  if (!tokenDoc) {
    throw new Error('Invalid or expired refresh token');
  }
  
  const user = await User.findById(tokenDoc.userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const accessToken = tokenService.generateAccessToken({ userId: user._id });
  
  return {
    accessToken,
    expiresIn: tokenService.ACCESS_TOKEN_EXPIRY_SECONDS
  };
};

/**
 * Logout user
 */
const logoutUser = async (refreshToken) => {
  if (refreshToken) {
    await tokenService.invalidateRefreshToken(refreshToken);
  }
  
  return { message: 'Logged out successfully' };
};

module.exports = {
  createUser,
  verifyOtpAndCreateTeam,
  handleGoogleAuth,
  authenticateUser,
  generateUserTokens,
  resendOtp,
  generatePasswordResetToken,
  resetPasswordWithToken,
  refreshUserToken,
  logoutUser
};
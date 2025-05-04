const bcrypt = require('bcrypt');
const User = require('../models/user');
const Team = require('../models/team');
const jwt = require('jsonwebtoken');
const sendOtp = require('../utils/sendOtp');
const tokenService = require('../utils/tokenService');
const crypto = require('crypto');
const { validatePassword, checkCommonPatterns } = require('../utils/passwordValidator');
require('dotenv').config();

// OTP configuration
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds

// Generate a secure OTP using crypto
const generateOtp = () => {
  // Use cryptographically secure random number generation
  return crypto.randomInt(100000, 999999);
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }
    
    // Check if OTP is valid and not expired
    if (user.otp !== parseInt(otp) || !user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    
    // Create a team
    const teamName = email.split('@')[0];
    const teams = await Team.findOne({ name: teamName });
    
    if (!teams) {
      const newTeam = new Team({
        name: teamName,
        createdBy: user._id,
        user: [{ userId: user._id, role: 'admin' }]
      });

      await newTeam.save();
      user.team = [newTeam._id];
      await user.save();
    }
    
    // Generate access token
    const accessToken = tokenService.generateAccessToken({ userId: user._id });
    
    // Generate refresh token
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const refreshToken = await tokenService.createRefreshToken(user._id, ipAddress, userAgent);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenService.REFRESH_TOKEN_EXPIRY_MS,
      sameSite: 'strict'
    });
    
    res.status(200).json({ 
      message: 'OTP verification successful', 
      user,
      accessToken,
      expiresIn: tokenService.ACCESS_TOKEN_EXPIRY_SECONDS
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const formDatas = req.body.formData;
    const { name, email, password, avatar } = formDatas;
    
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ message: passwordValidation.message });
    }
    
    // Check for common patterns or user data in password
    const patternCheck = checkCommonPatterns(password, { name, email });
    if (!patternCheck.isValid) {
      return res.status(400).json({ message: patternCheck.message });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    
    // Calculate OTP expiry time
    const otpExpiry = Date.now() + OTP_EXPIRY;
    
    // Send OTP to the user
    await sendOtp(email, 'Otp verification for Cryptique', `Thank you for signing up with Cryptique! Your OTP is ${otp}`);
    
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      avatar: avatar || '',
      otp,
      otpExpiry
    });

    // Save the user to the database
    await newUser.save();

    // Generate access token
    const accessToken = tokenService.generateAccessToken({ userId: newUser._id });
    
    // Generate refresh token
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const refreshToken = await tokenService.createRefreshToken(newUser._id, ipAddress, userAgent);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenService.REFRESH_TOKEN_EXPIRY_MS,
      sameSite: 'strict'
    });

    res.status(201).json({ 
      message: 'User created successfully', 
      user: newUser, 
      accessToken,
      expiresIn: tokenService.ACCESS_TOKEN_EXPIRY_SECONDS
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

// Controller to get a user by ID
exports.getUser = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

// Controller to handle Google login/signup
exports.googleLogin = async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create a new user if not exists
      user = new User({
        name,
        email,
        avatar: avatar || '',
        password: '', // No password for Google users
      });

      await user.save();
    }
    
    user.isVerified = true;
    await user.save();
    
    // Create a team if needed
    const teamName = email.split('@')[0];
    const teams = await Team.findOne({ name: teamName });
    
    if (!teams) {
      const newTeam = new Team({
        name: teamName,
        createdBy: user._id,
        user: [{ userId: user._id, role: 'admin' }]
      });

      await newTeam.save();
      user.team = [newTeam._id];
      await user.save();
    }
    
    // Generate access token
    const accessToken = tokenService.generateAccessToken({ userId: user._id });
    
    // Generate refresh token
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const refreshToken = await tokenService.createRefreshToken(user._id, ipAddress, userAgent);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenService.REFRESH_TOKEN_EXPIRY_MS,
      sameSite: 'strict'
    });
    
    res.status(200).json({ 
      message: 'User logged in successfully', 
      user, 
      accessToken,
      expiresIn: tokenService.ACCESS_TOKEN_EXPIRY_SECONDS
    });
  } catch (error) {
    res.status(500).json({ message: 'Error during Google login', error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Fetch user from the database
    const user = await User.findOne({ email });
    if (!user) {
      // Set a header that will be used by the rate limiter to track failed attempts
      res.set('X-Login-Failed', 'true');
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.isVerified) {
      // This is not a failed login attempt for rate limiting purposes
      return res.status(402).json({ message: 'User not verified' });
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Set a header that will be used by the rate limiter to track failed attempts
      res.set('X-Login-Failed', 'true');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate access token
    const accessToken = tokenService.generateAccessToken({ userId: user._id });
    
    // Generate refresh token
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const refreshToken = await tokenService.createRefreshToken(user._id, ipAddress, userAgent);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenService.REFRESH_TOKEN_EXPIRY_MS,
      sameSite: 'strict'
    });

    // Return success with token
    res.status(200).json({ 
      message: 'Login successful', 
      user, 
      accessToken,
      expiresIn: tokenService.ACCESS_TOKEN_EXPIRY_SECONDS
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookies or authorization header
    const refreshToken = req.cookies?.refreshToken || 
                         (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
                           ? req.headers.authorization.split(' ')[1] 
                           : null);
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not provided' });
    }
    
    // Verify refresh token
    const tokenDoc = await tokenService.verifyRefreshToken(refreshToken);
    if (!tokenDoc) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
    
    // Get user
    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate new access token
    const accessToken = tokenService.generateAccessToken({ userId: user._id });
    
    res.status(200).json({
      accessToken,
      expiresIn: tokenService.ACCESS_TOKEN_EXPIRY_SECONDS
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout endpoint
exports.logout = async (req, res) => {
  try {
    // Get refresh token from cookies or authorization header
    const refreshToken = req.cookies?.refreshToken || 
                         (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
                           ? req.headers.authorization.split(' ')[1] 
                           : null);
    
    if (refreshToken) {
      // Invalidate the refresh token
      await tokenService.invalidateRefreshToken(refreshToken);
    }
    
    // Clear the refresh token cookie
    res.clearCookie('refreshToken');
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a method to resend OTP
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
    
    res.status(200).json({ message: 'New OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resending OTP', error: error.message });
  }
};

// Generate a password reset token
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate a secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiry (1 hour)
    const resetTokenExpiry = Date.now() + 60 * 60 * 1000;
    
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
    
    res.status(200).json({
      message: 'Password reset token sent to email'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error sending password reset email',
      error: error.message
    });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
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
      return res.status(400).json({ message: 'Token is invalid or has expired' });
    }
    
    // Validate new password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ message: passwordValidation.message });
    }
    
    // Check for common patterns or user data in password
    const patternCheck = checkCommonPatterns(password, { 
      name: user.name, 
      email: user.email 
    });
    if (!patternCheck.isValid) {
      return res.status(400).json({ message: patternCheck.message });
    }
    
    // Update the password
    user.password = await bcrypt.hash(password, 10);
    
    // Remove password reset fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    // Save the user
    await user.save();
    
    // Log the user in by generating tokens
    const accessToken = tokenService.generateAccessToken({ userId: user._id });
    
    // Generate refresh token
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const refreshToken = await tokenService.createRefreshToken(user._id, ipAddress, userAgent);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenService.REFRESH_TOKEN_EXPIRY_MS,
      sameSite: 'strict'
    });
    
    res.status(200).json({
      message: 'Password has been reset successfully',
      accessToken,
      expiresIn: tokenService.ACCESS_TOKEN_EXPIRY_SECONDS
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error resetting password',
      error: error.message
    });
  }
};

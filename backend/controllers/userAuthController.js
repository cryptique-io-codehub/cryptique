const bcrypt = require('bcrypt');
const User = require('../models/user');
const Team = require('../models/team');
const jwt = require('jsonwebtoken');
const sendOtp = require('../utils/sendOtp');
const tokenService = require('../utils/tokenService');
require('dotenv').config();

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    
    user.isVerified = true;
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
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    
    // Send OTP to the user
    await sendOtp(email, 'Otp verification for Cryptique', `Thank you for signing up with Cryptique! Your OTP is ${otp}`);
    
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      avatar: avatar || '',
      otp
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

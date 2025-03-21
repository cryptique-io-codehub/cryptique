
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Team=require('../models/team');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Controller to create a new user
exports.createUser = async (req, res) => {
  try {
    const { formData } = req.body;
    
    const { name, email, password, avatar } = formData;
 // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create a new user
    
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      avatar: avatar || '', // Set avatar if provided
    });

    // Save the user to the database
    await newUser.save();
     // Generate JWT
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '1h', // Token expires in 1 hour
    });

    //create a team
    const teamName=email.split('@')[0];

    const newTeam = new Team({
      name:teamName,
      createdBy:newUser._id,
      user:[{userId:newUser._id,role:'admin'}]
    })

    //save the team to the database
    await newTeam.save();

    newUser.team=[newTeam._id];

    await newUser.save();

    res.status(201).json({ message: 'User created successfully', user: newUser, token });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

// Controller to get a user by ID
exports.getUser = async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne ({ email });
        
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
 // Generate JWT
 const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
  expiresIn: '1h', // Token expires in 1 hour
});

res.status(200).json({ message: 'User logged in successfully', user, token });
  } catch (error) {
    res.status(500).json({ message: 'Error during Google login', error: error.message });
  }
};

exports.login=async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch user from the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h', // Token expires in 1 hour
    });

    // Return success with token
    res.status(200).json({ message: 'Login successful', user, token });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

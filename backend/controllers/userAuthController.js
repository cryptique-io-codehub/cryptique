const bcrypt = require('bcrypt');
const User = require('../models/user');
const Team=require('../models/team');
const jwt = require('jsonwebtoken');
const sendOtp = require('../utils/sendOtp');
require('dotenv').config();
const generateOtp= ()=>{
  return Math.floor(100000 + Math.random() * 900000);
}
exports.verifyOtp=async (req,res)=>{
  try {
    console.log('a');
    console.log(req.body);
    const { email, otp } = req.body;
    console.log(otp);
    const user = await User.findOne({ email, otp });
    console.log(user);
    if (!user) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    user.isVerified = true;
    await user.save();
   //create a team
   const teamName=email.split('@')[0];

   const newTeam = new Team({
     name:teamName,
     createdBy:user._id,
     user:[{userId:user._id,role:'admin'}]
   })

   //save the team to the database
   await newTeam.save();

   user.team=[newTeam._id];

   await user.save();
   console.log('aaaa');
   const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: '2h', // Token expires in 1 hour
  });
  console.log(token);
      res.status(200).json({ message: 'Otp sent successfully', user,token });
  } catch (error) {
    res.status(500).json({ message: 'Error sending otp', error: error.message });
  }
}

exports.createUser = async (req, res) => {
  try {
    const formDatas = req.body.formData;
    const { name, email, password, avatar } = formDatas;
 // Hash the password
 const userExists = await User.findOne({ email });
 console.log(userExists);
    if(userExists){
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp=generateOtp();
    // Send OTP to the user
    await sendOtp(email, 'Otp verification for Cryptique', `Thank you for signing up with Cryptique! Your OTP is ${otp}`);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      avatar: avatar || '', // Set avatar if provided
      otp
    });

    // Save the user to the database

    await newUser.save();

     // Generate JWT
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '2h', // Token expires in 1 hour
    });

 

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
user.isVerified = true;
    await user.save();
   //create a team
   const teamName=email.split('@')[0];

   const newTeam = new Team({
     name:teamName,
     createdBy:user._id,
     user:[{userId:user._id,role:'admin'}]
   })

   //save the team to the database
   await newTeam.save();

   user.team=[newTeam._id];

   await user.save();
   console.log('User logged in successfully',user);
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
    if (!user.isVerified) {
      return res.status(402).json({ message: 'User not verified' });
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '2h', // Token expires in 1 hour
    });

    // Return success with token
    res.status(200).json({ message: 'Login successful', user, token });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

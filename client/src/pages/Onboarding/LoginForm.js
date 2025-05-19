import React, { useState, useEffect } from 'react';
import SignupForm from './SignupForm.js';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../components/firebase.js';
import { useNavigate, useLocation } from 'react-router-dom'; 
import phone from './login-phone.png'
import axiosInstance from '../../axiosInstance.js';
import preloadData from '../../utils/preloadService.js';
import { motion } from 'framer-motion';

function Interface() {
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [a, seta] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Effect to handle routing based on current path
  useEffect(() => {
    if (location.pathname === '/signup') {
      setShowLogin(false);
      seta(1);
    } else {
      // Default to login page
      setShowLogin(true);
      seta(0);
      navigate('/login');
    }
  }, [location.pathname, navigate]);

  const toggleLoading = (isLoading) => {
    setLoading(isLoading !== undefined ? isLoading : !loading);
  };

  const toggleForm = () => {
    if (showLogin) {
      // Switch to signup route
      navigate('/signup');
    } else {
      // Switch to login route
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[#1d0c46] relative">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="relative min-h-screen w-full max-w-full mx-auto cursor-crosshair overflow-visible">
          {/* Central "BROKEN" Text */}
          <motion.div 
            className="absolute left-[50%] top-[45%] transform -translate-x-1/2 -translate-y-1/2 z-30"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            whileHover={{ scale: 1.05, filter: 'brightness(1.5)' }}
            whileTap={{ scale: 0.95, rotate: [-2, 2, -2, 0] }}
          >
            <div className="relative text-[60px] sm:text-[80px] md:text-[120px] font-black text-red-600 tracking-tight select-none filter drop-shadow-xl leading-none animate-glitch-text">
              <span className="absolute -top-1 -left-1 text-cyan-600/40 animate-glitch-offset clip-text">BROKEN</span>
              <span className="absolute -bottom-1 -right-1 text-yellow-600/40 animate-glitch-offset-2 clip-text">BROKEN</span>
              <span className="bg-clip-text bg-gradient-to-br from-red-700 via-red-600 to-red-500">BROKEN</span>
              <div className="absolute inset-0 bg-red-500/10 blur-md rounded-lg -z-10"></div>
            </div>
          </motion.div>

          {/* Scattered Words - Distributed across the entire page */}
          <motion.div 
            className="absolute text-xs sm:text-base md:text-2xl font-black text-red-600 transform rotate-[-8deg] z-20 cursor-pointer"
            style={{ top: '5%', left: '5%' }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, x: { duration: 0.2 } }}
            whileHover={{ scale: 1.2, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.7)' }}
            whileTap={{ scale: 0.9, rotate: 4 }}
          >
            UNTRACEABLE
          </motion.div>

          <motion.div 
            className="absolute text-xs sm:text-base md:text-2xl font-black text-red-600 transform rotate-6 z-20 cursor-pointer"
            style={{ bottom: '8%', right: '4%' }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, x: { duration: 0.2 } }}
            whileHover={{ scale: 1.2, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.7)' }}
            whileTap={{ scale: 0.9, rotate: -3 }}
          >
            NO SEGMENTATION
          </motion.div>

          <motion.div 
            className="absolute text-xs sm:text-base md:text-2xl font-black text-red-600 transform rotate-[-5deg] z-20 cursor-pointer"
            style={{ top: '12%', right: '6%' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, y: { duration: 0.2 } }}
            whileHover={{ scale: 1.2, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.7)' }}
            whileTap={{ scale: 0.9, rotate: 2 }}
          >
            WASTED RESOURCES
          </motion.div>

          <motion.div 
            className="absolute text-xs sm:text-base md:text-2xl font-black text-red-600 transform rotate-[3deg] z-20 cursor-pointer"
            style={{ bottom: '25%', left: '3%' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, y: { duration: 0.2 } }}
            whileHover={{ scale: 1.2, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.7)' }}
            whileTap={{ scale: 0.9, rotate: -1 }}
          >
            DISCONNECTED DATA
          </motion.div>

          <motion.div 
            className="absolute text-base md:text-2xl font-black text-red-600 transform rotate-[-4deg] z-20 cursor-pointer"
            style={{ top: '25%', left: '65%' }}
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, y: { duration: 0.2 } }}
            whileHover={{ scale: 1.2, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.7)' }}
            whileTap={{ scale: 0.9, rotate: 2 }}
          >
            BLIND SPENDING
          </motion.div>

          <motion.div 
            className="absolute text-base md:text-2xl font-black text-red-600 transform rotate-[2deg] z-20 cursor-pointer"
            style={{ top: '68%', left: '18%' }}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, y: { duration: 0.2 } }}
            whileHover={{ scale: 1.2, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.7)' }}
            whileTap={{ scale: 0.9, rotate: -2 }}
          >
            ATTRIBUTION VOID
          </motion.div>

          <motion.div 
            className="absolute text-base md:text-2xl font-black text-red-600 transform rotate-[-7deg] z-20 cursor-pointer"
            style={{ top: '30%', right: '20%' }}
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, y: { duration: 0.2 } }}
            whileHover={{ scale: 1.2, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.7)' }}
            whileTap={{ scale: 0.9, rotate: 3 }}
          >
            IDENTITY GAPS
          </motion.div>

          <motion.div 
            className="absolute text-base md:text-2xl font-black text-red-600 transform rotate-[5deg] z-20 cursor-pointer"
            style={{ bottom: '20%', right: '45%' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, y: { duration: 0.2 } }}
            whileHover={{ scale: 1.2, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.7)' }}
            whileTap={{ scale: 0.9, rotate: -2 }}
          >
            FRAGMENTED ANALYTICS
          </motion.div>

          {/* Additional scattered words for better coverage */}
          <motion.div 
            className="absolute text-base md:text-2xl font-black text-red-600 transform rotate-[8deg] z-20 cursor-pointer"
            style={{ top: '75%', right: '15%' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, y: { duration: 0.2 } }}
            whileHover={{ scale: 1.2, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.7)' }}
            whileTap={{ scale: 0.9, rotate: -2 }}
          >
            DATA LEAKS
          </motion.div>

          <motion.div 
            className="absolute text-base md:text-2xl font-black text-red-600 transform rotate-[-6deg] z-20 cursor-pointer"
            style={{ top: '85%', left: '25%' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, y: { duration: 0.2 } }}
            whileHover={{ scale: 1.2, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.7)' }}
            whileTap={{ scale: 0.9, rotate: 2 }}
          >
            SECURITY BREACH
          </motion.div>

          <motion.div 
            className="absolute text-base md:text-2xl font-black text-red-600 transform rotate-[4deg] z-20 cursor-pointer"
            style={{ top: '15%', left: '35%' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, y: { duration: 0.2 } }}
            whileHover={{ scale: 1.2, color: '#ff0000', textShadow: '0 0 10px rgba(255,0,0,0.7)' }}
            whileTap={{ scale: 0.9, rotate: -2 }}
          >
            SYSTEM FAILURE
          </motion.div>

          {/* Medium-importance terms - Distributed across the page */}
          <motion.div 
            className="absolute text-xs sm:text-sm md:text-lg font-bold text-red-500 transform rotate-12 z-10 cursor-pointer"
            style={{ top: '35%', left: '10%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.15, color: '#ff2d2d', textShadow: '0 0 5px rgba(255,0,0,0.3)' }}
          >
            incomplete data
          </motion.div>

          <motion.div 
            className="hidden sm:block absolute text-sm md:text-lg font-bold text-red-500 transform -rotate-4 z-10 cursor-pointer"
            style={{ bottom: '32%', left: '34%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            whileHover={{ scale: 1.15, color: '#ff2d2d', textShadow: '0 0 5px rgba(255,0,0,0.3)' }}
          >
            missing wallet data
          </motion.div>

          <motion.div 
            className="absolute text-xs sm:text-sm md:text-lg font-bold text-red-500 transform rotate-3 z-10 cursor-pointer"
            style={{ top: '42%', right: '10%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ scale: 1.15, color: '#ff2d2d', textShadow: '0 0 5px rgba(255,0,0,0.3)' }}
          >
            broken touchpoints
          </motion.div>

          <motion.div 
            className="hidden sm:block absolute text-sm md:text-lg font-bold text-red-500 transform -rotate-6 z-10 cursor-pointer"
            style={{ bottom: '35%', right: '53%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            whileHover={{ scale: 1.15, color: '#ff2d2d', textShadow: '0 0 5px rgba(255,0,0,0.3)' }}
          >
            siloed metrics
          </motion.div>

          {/* Additional medium-importance terms */}
          <motion.div 
            className="absolute text-xs sm:text-sm md:text-lg font-bold text-red-500 transform rotate-[-3deg] z-10 cursor-pointer"
            style={{ top: '55%', left: '45%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ scale: 1.15, color: '#ff2d2d', textShadow: '0 0 5px rgba(255,0,0,0.3)' }}
          >
            corrupted files
          </motion.div>

          <motion.div 
            className="absolute text-xs sm:text-sm md:text-lg font-bold text-red-500 transform rotate-[5deg] z-10 cursor-pointer"
            style={{ bottom: '45%', left: '15%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            whileHover={{ scale: 1.15, color: '#ff2d2d', textShadow: '0 0 5px rgba(255,0,0,0.3)' }}
          >
            lost connections
          </motion.div>

          {/* Error Messages - Distributed across the page */}
          <motion.div 
            className="absolute top-[5%] left-[40%] transform -translate-x-1/2 bg-black/90 text-white p-1 rounded font-mono text-[8px] sm:text-[10px] shadow-md z-25 rotate-[-2deg] cursor-pointer border-l-2 border-red-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.95 }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.2, boxShadow: '0 0 8px rgba(255,0,0,0.6)' }}
            whileTap={{ scale: 0.9, rotate: 2 }}
          >
            <span className="text-red-500 mr-0.5">❌</span>
            <span className="text-red-500 font-bold">ERROR:</span>
            <span className="ml-0.5 animate-pulse">tracking failed</span>
          </motion.div>

          <motion.div 
            className="absolute bottom-[8%] left-[25%] transform bg-black/90 text-white p-1 rounded font-mono text-[8px] sm:text-[10px] shadow-md z-25 rotate-[1deg] cursor-pointer border-l-2 border-yellow-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.95 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            whileHover={{ scale: 1.2, boxShadow: '0 0 8px rgba(255,255,0,0.6)' }}
            whileTap={{ scale: 0.9, rotate: -1 }}
          >
            <span className="text-yellow-500 mr-0.5">⚠️</span>
            <span className="text-yellow-400 font-bold">WARNING:</span>
            <span className="ml-0.5">data corrupted</span>
          </motion.div>

          {/* Additional error messages */}
          <motion.div 
            className="absolute top-[25%] right-[15%] transform bg-black/90 text-white p-1 rounded font-mono text-[8px] sm:text-[10px] shadow-md z-25 rotate-[2deg] cursor-pointer border-l-2 border-red-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.95 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            whileHover={{ scale: 1.2, boxShadow: '0 0 8px rgba(255,0,0,0.6)' }}
            whileTap={{ scale: 0.9, rotate: -2 }}
          >
            <span className="text-red-500 mr-0.5">❌</span>
            <span className="text-red-500 font-bold">ERROR:</span>
            <span className="ml-0.5 animate-pulse">system crash</span>
          </motion.div>

          {/* Technical Fragments - Distributed across the page */}
          <motion.div 
            className="hidden sm:block absolute text-xs font-mono text-red-500/60 z-5"
            style={{ top: '25%', left: '48%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            0xF7E9
          </motion.div>

          <motion.div 
            className="hidden sm:block absolute text-xs font-mono text-red-500/60 z-5"
            style={{ bottom: '25%', right: '38%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
          >
            0xA1B2
          </motion.div>

          {/* Additional technical fragments */}
          <motion.div 
            className="hidden sm:block absolute text-xs font-mono text-red-500/60 z-5"
            style={{ top: '65%', left: '28%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
          >
            0xC4D5
          </motion.div>

          <motion.div 
            className="hidden sm:block absolute text-xs font-mono text-red-500/60 z-5"
            style={{ bottom: '15%', left: '55%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
          >
            0xE6F7
          </motion.div>

          {/* Glitch Lines - Distributed across the page */}
          <motion.div 
            className="hidden sm:block absolute w-32 h-0.5 bg-red-500/40 z-10 left-1/2 transform -translate-x-1/2 rotate-45 cursor-crosshair"
            style={{ bottom: '30%' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5 }}
            whileHover={{ height: "1.5px", backgroundColor: "rgba(255, 0, 0, 0.7)" }}
          >
            <div className="w-full h-full animate-glitch-horizontal"></div>
          </motion.div>

          <motion.div 
            className="hidden sm:block absolute w-24 h-0.5 bg-red-500/40 z-10 right-[30%] rotate-[-30deg] cursor-crosshair"
            style={{ top: '40%' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ height: "1.5px", backgroundColor: "rgba(255, 0, 0, 0.7)" }}
          >
            <div className="w-full h-full animate-glitch-horizontal"></div>
          </motion.div>

          {/* Additional glitch lines */}
          <motion.div 
            className="hidden sm:block absolute w-28 h-0.5 bg-red-500/40 z-10 left-[20%] rotate-[60deg] cursor-crosshair"
            style={{ top: '75%' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ height: "1.5px", backgroundColor: "rgba(255, 0, 0, 0.7)" }}
          >
            <div className="w-full h-full animate-glitch-horizontal"></div>
          </motion.div>

          {/* System Error Message */}
          <motion.div 
            className="absolute text-xs font-mono text-red-400/80 z-20 cursor-pointer"
            style={{ bottom: '3%', left: '50%', transform: 'translateX(-50%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            whileHover={{ scale: 1.1, color: "#ff2d2d" }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              error: Web3 marketing system failure
            </motion.span>
          </motion.div>

          {/* Mobile Gradient Overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#1d0c46] to-transparent sm:hidden"></div>
        </div>
      </div>

      {/* Floating Login Box */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div 
          className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-300">Sign in to continue</p>
          </div>

          {showLogin ? (
            <LoginForm onSignupClick={toggleForm} toggleLoading={toggleLoading}/>
          ) : (
            <SignupForm onBackToLogin={toggleForm} />
          )}
        </motion.div>
      </div>

      {loading && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
            <p className="text-white font-semibold">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginForm({ onSignupClick, toggleLoading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    setIsFormValid(email.trim() !== '' && password.trim() !== '');
  }, [email, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      toggleLoading(true);
      const response = await axiosInstance.post('/auth/login', {
        email, 
        password 
      });
      const aa=email.split('@')[0];
      if (response.data.user) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('selectedTeam', aa);
        localStorage.setItem('User', JSON.stringify(response.data.user));
        
        // Preload data before navigating to dashboard, pass loading callback
        await preloadData(true, null, toggleLoading);
        
        navigate(`/dashboard`);
      } else {
        toggleLoading(false);
        alert(response.data.message || 'Invalid credentials');
      }
    } catch (error) {
      toggleLoading(false);
      
      if (error.response && 
          [401, 404, 402].includes(error.response.status)) {
        alert(error.response.data.message);
      } else {
        console.error('Error during login:', error);
        alert('An error occurred. Please try again.');
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      toggleLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const response = await axiosInstance.post('/auth/google-login', {
        name: user.displayName,
        email: user.email,
        avatar: user.photoURL,
      });
      const aa=user.email.split('@')[0];
      if (response.data.user) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('selectedTeam', aa);
        localStorage.setItem('User', JSON.stringify(response.data.user));
        
        // Preload data before navigating to dashboard, pass loading callback
        await preloadData(true, null, toggleLoading);
        
        navigate(`/dashboard`);
      }
    } catch (error) {
      toggleLoading(false);
      console.error('Error during Google login:', error);
      alert('Google login failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={googleLogin} 
        className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl flex items-center justify-center gap-3 transition-colors text-white"
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <path d="M19.8 10.2c0-.7-.1-1.4-.2-2h-9.6v3.8h5.5c-.2 1.2-1 2.3-2.1 3v2.5h3.4c2-1.8 3-4.5 3-7.3z" fill="#4285F4"/>
          <path d="M10 20c2.9 0 5.3-1 7-2.6l-3.4-2.6c-.9.6-2.1 1-3.6 1-2.8 0-5.1-1.9-6-4.4H.5v2.7c1.8 3.5 5.4 5.9 9.5 5.9z" fill="#34A853"/>
          <path d="M4 10.2c-.2-.6-.4-1.3-.4-2s.1-1.4.4-2V3.5H.5c-.8 1.6-1.3 3.4-1.3 5.2 0 1.8.5 3.6 1.3 5.2l3.5-2.7z" fill="#FBBC05"/>
          <path d="M10 3.9c1.6 0 3 .5 4.1 1.6l3-3C15.3.9 12.9 0 10 0 5.9 0 2.3 2.4.5 5.9l3.5 2.7c.8-2.5 3.2-4.7 6-4.7z" fill="#EA4335"/>
        </svg>
        <span>Continue with Google</span>
      </button>

      <div className="flex items-center">
        <div className="flex-grow h-px bg-white/20"></div>
        <div className="px-4 text-sm text-gray-300">OR</div>
        <div className="flex-grow h-px bg-white/20"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block mb-2 text-sm text-gray-300">
            Email address
          </label>
          <input 
            type="email" 
            id="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label htmlFor="password" className="text-sm text-gray-300">
              Password
            </label>
          </div>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 pr-12"
              placeholder="Enter your password"
              required
            />
            <button 
              type="button" 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400 hover:text-white"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="text-right">
          <button type="button" className="text-sm text-gray-300 hover:text-white">
            Forgot your password?
          </button>
        </div>

        <button 
          type="submit" 
          className={`w-full py-3 rounded-xl font-medium transition-colors ${
            isFormValid 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
          disabled={!isFormValid}
        >
          Sign in
        </button>
      </form>

      <div className="text-center text-sm text-gray-300">
        <p>
          Don't have an account?{' '}
          <button 
            onClick={onSignupClick} 
            className="text-red-500 hover:text-red-400 font-medium"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

export default Interface;
import React, { useState, useEffect } from 'react';
import SignupForm from './SignupForm.js';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../components/firebase.js';
import { useNavigate, useLocation } from 'react-router-dom'; 
import phone from './login-phone.png'
import axiosInstance from '../../axiosInstance.js';
import preloadData from '../../utils/preloadService.js';
import { motion } from 'framer-motion';

// Hexagon component for blockchain design
const Hexagon = ({ size = 60, color = '#CAA968', className = '', children, ...props }) => {
  const width = size;
  const height = size * 1.1547; // Hexagon height ratio
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ width, height }}
      {...props}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polygon
          points={`${width/2},0 ${width},${height*0.25} ${width},${height*0.75} ${width/2},${height} 0,${height*0.75} 0,${height*0.25}`}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
          {children}
        </div>
      )}
    </div>
  );
};

// Hexagon Grid Component for seamless pattern
const HexagonGrid = ({ side = 'left', color = '#CAA968' }) => {
  const hexSize = 30;
  const hexWidth = hexSize;
  const hexHeight = hexSize * 1.1547;
  const rows = Math.ceil((typeof window !== 'undefined' ? window.innerHeight : 800) / hexHeight) + 2;
  const cols = Math.ceil(350 / hexWidth) + 2; // 350px width for extended side panels
  
  const hexagons = [];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * hexWidth * 0.75;
      const y = row * hexHeight + (col % 2) * (hexHeight / 2);
      
      hexagons.push(
        <motion.div
          key={`${side}-${row}-${col}`}
          className="absolute"
          style={{
            left: x,
            top: y,
            width: hexWidth,
            height: hexHeight
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ 
            duration: 0.5, 
            delay: (row + col) * 0.02,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <svg width={hexWidth} height={hexHeight} viewBox={`0 0 ${hexWidth} ${hexHeight}`}>
            <polygon
              points={`${hexWidth/2},0 ${hexWidth},${hexHeight*0.25} ${hexWidth},${hexHeight*0.75} ${hexWidth/2},${hexHeight} 0,${hexHeight*0.75} 0,${hexHeight*0.25}`}
              fill="none"
              stroke={color}
              strokeWidth="1"
            />
          </svg>
        </motion.div>
      );
    }
  }
  
  return (
    <div 
      className={`absolute top-0 h-full w-[350px] overflow-hidden ${side === 'left' ? 'left-0' : 'right-0'} hidden md:block`}
      style={{ zIndex: 5 }}
    >
      {hexagons}
    </div>
  );
};

// Blockchain block component
const BlockchainBlock = ({ className = '', ...props }) => {
  return (
    <motion.div 
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      {...props}
    >
      <div className="border-2 border-[#CAA968] bg-transparent p-3 rounded-lg shadow-lg">
      </div>
    </motion.div>
  );
};

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
      {/* Animated Background with Blockchain Design */}
      <div className="absolute inset-0 z-0">
        <div className="relative min-h-screen w-full max-w-full mx-auto cursor-crosshair overflow-visible">
          
          {/* Left Side Hexagon Grid */}
          <HexagonGrid side="left" color="#CAA968" />
          
          {/* Right Side Hexagon Grid */}
          <HexagonGrid side="right" color="#CAA968" />
          












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
          style={{ zIndex: 20 }}
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
        
        // Preload data before navigating to dashboard
        await preloadData();
        
        toggleLoading(false);
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
    
    // Add custom parameters for better security perception
    provider.setCustomParameters({
      prompt: 'select_account',
      login_hint: '',
      // Use app.cryptique.io domain for auth callback
      state: encodeURIComponent(JSON.stringify({origin: window.location.origin}))
    });
    
    try {
      toggleLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Handle successful login
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
        
        // Preload data before navigating to dashboard
        await preloadData();
        
        toggleLoading(false);
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
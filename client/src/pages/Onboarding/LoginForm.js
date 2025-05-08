import React, { useState, useEffect } from 'react';
import SignupForm from './SignupForm.js';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../components/firebase.js';
import { useNavigate, useLocation } from 'react-router-dom'; 
import phone from './login-phone.png'
import axiosInstance from '../../axiosInstance.js';
import preloadData from '../../utils/preloadService.js';

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
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden">
      {loading && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <div className="bg-white p-3 px-6 rounded-md">
            <p className="text-md text-gray-800 font-semibold">Loading...</p>
          </div>
        </div>
      )}
      
      {/* Left panel - Full height on desktop, partial on mobile */}
      <div className="w-full h-60 sm:h-72 md:h-80 lg:w-1/2 lg:h-screen bg-indigo-900 fixed lg:relative z-10">
        <LeftPanel/>
      </div>
      
      {/* Right panel - Properly positioned on all devices */}
      <div className="w-full lg:w-1/2 mt-60 sm:mt-72 md:mt-80 lg:mt-0 overflow-y-auto h-full pb-16">
        <RightPanel 
          showLogin={showLogin} 
          toggleForm={toggleForm}  
          toggleLoading={toggleLoading} 
          a={a} 
        />
      </div>
    </div>
  );
}

function LeftPanel() {
  return (
    <div className="w-full h-full flex items-end justify-center relative overflow-hidden">
      <img
        src={phone}
        alt="Marketing Graphic"
        className="w-auto h-auto max-w-full object-contain pb-0 mb-0"
        style={{ 
          maxHeight: '115%',
          transform: 'translateY(5%)' 
        }}
      />
    </div>
  );
}

function RightPanel({ showLogin, toggleForm, a, toggleLoading }) {
  return (
    <div className="bg-white w-full p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col min-h-full">
      <div className="self-end mb-4 sm:mb-6 lg:mb-8">
        <p className="text-sm text-gray-700">
          {a ? <div>Already have an Account?&nbsp;&nbsp;<button onClick={toggleForm} className="text-indigo-600 font-medium">Sign in</button></div> : <div></div>}
        </p>
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center max-w-md mx-auto w-full px-2 sm:px-4">
        {showLogin ? (
          <LoginForm onSignupClick={toggleForm} toggleLoading={toggleLoading}/>
        ) : (
          <SignupForm onBackToLogin={toggleForm} />
        )}
      </div>
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
    try {
      toggleLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const response = await axiosInstance.post('/auth/google-login', {
        name: user.displayName,
        email: user.email,
        avatar: user.photoURL,
      });
      console.log(user.email);
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
    <div className="w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-medium text-gray-800">Sign in</h1>
      </div>

      <div className="w-full space-y-4 sm:space-y-6">
        <button 
          onClick={googleLogin} 
          className="w-full py-2.5 sm:py-3 px-4 border border-gray-300 rounded-full flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-gray-700 text-sm sm:text-base"
        >
          <svg width="18" height="18" viewBox="0 0 20 20">
            <path d="M19.8 10.2c0-.7-.1-1.4-.2-2h-9.6v3.8h5.5c-.2 1.2-1 2.3-2.1 3v2.5h3.4c2-1.8 3-4.5 3-7.3z" fill="#4285F4"/>
            <path d="M10 20c2.9 0 5.3-1 7-2.6l-3.4-2.6c-.9.6-2.1 1-3.6 1-2.8 0-5.1-1.9-6-4.4H.5v2.7c1.8 3.5 5.4 5.9 9.5 5.9z" fill="#34A853"/>
            <path d="M4 10.2c-.2-.6-.4-1.3-.4-2s.1-1.4.4-2V3.5H.5c-.8 1.6-1.3 3.4-1.3 5.2 0 1.8.5 3.6 1.3 5.2l3.5-2.7z" fill="#FBBC05"/>
            <path d="M10 3.9c1.6 0 3 .5 4.1 1.6l3-3C15.3.9 12.9 0 10 0 5.9 0 2.3 2.4.5 5.9l3.5 2.7c.8-2.5 3.2-4.7 6-4.7z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center">
          <div className="flex-grow h-px bg-gray-200"></div>
          <div className="px-4 text-sm text-gray-400">OR</div>
          <div className="flex-grow h-px bg-gray-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label htmlFor="email" className="block mb-1 text-sm text-gray-600">
              User name or email address
            </label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label htmlFor="password" className="text-sm text-gray-600">
                Your password
              </label>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-12"
                required
              />
              <button 
                type="button" 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400 flex items-center"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? (
                  <span className="flex items-center">Hide</span>
                ) : (
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Show
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button type="button" className="text-sm text-gray-500 hover:text-indigo-600">
              Forgot your password?
            </button>
          </div>

          <button 
            type="submit" 
            className={`w-full py-2.5 sm:py-3 rounded-md font-medium transition-colors text-sm sm:text-base ${
              isFormValid ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
            disabled={!isFormValid}
          >
            Sign in
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 mt-4">
          <p>
            Don't have an account? <button onClick={onSignupClick} className="text-indigo-600 font-medium">Sign up</button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Interface;
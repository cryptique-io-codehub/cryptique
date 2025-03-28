import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import React, { useState, useEffect } from 'react';
import { auth } from '../../components/firebase.js';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../axiosInstance.js';

function SignupForm({ onBackToLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsFormValid(
      fullName.trim() !== '' && 
      email.trim() !== '' && 
      password.trim() !== '' && 
      password === confirmPassword
    );
  }, [fullName, email, password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const response = await axiosInstance.post('/auth/create', {
        formData: {
          name: fullName,
          email,
          password,
        },
      });
  
      if (response.data.user) {
        localStorage.setItem('token', response.data.token);
        // Redirect to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error during signup:', error.response?.data || error.message);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const response = await axiosInstance.post('/auth/google-login', {
          name: user.displayName,
          email: user.email,
          avatar: user.photoURL,
      });
      
      if (response.data.user) {
        localStorage.setItem('token', response.data.token);
        // Redirect to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error during Google login:', error);
    }
  };

  return (
    <div className="form-container w-full max-w-md mx-auto p-4 sm:p-6 mt-0">
      <div className="header mb-4 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold">Sign up</h1>
      </div>

      <div className="social-login mb-0">
        <button onClick={googleLogin} className="google-btn w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 transition">
          <div className="google-icon">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M19.8 10.2c0-.7-.1-1.4-.2-2h-9.6v3.8h5.5c-.2 1.2-1 2.3-2.1 3v2.5h3.4c2-1.8 3-4.5 3-7.3z" fill="#4285F4"/>
              <path d="M10 20c2.9 0 5.3-1 7-2.6l-3.4-2.6c-.9.6-2.1 1-3.6 1-2.8 0-5.1-1.9-6-4.4H.5v2.7c1.8 3.5 5.4 5.9 9.5 5.9z" fill="#34A853"/>
              <path d="M4 10.2c-.2-.6-.4-1.3-.4-2s.1-1.4.4-2V3.5H.5c-.8 1.6-1.3 3.4-1.3 5.2 0 1.8.5 3.6 1.3 5.2l3.5-2.7z" fill="#FBBC05"/>
              <path d="M10 3.9c1.6 0 3 .5 4.1 1.6l3-3C15.3.9 12.9 0 10 0 5.9 0 2.3 2.4.5 5.9l3.5 2.7c.8-2.5 3.2-4.7 6-4.7z" fill="#EA4335"/>
            </svg>
          </div>
          <span className="text-sm sm:text-base font-medium ">Continue with Google</span>
        </button>
      </div>

      <div className="or-divider flex items-center justify-center mt-3">
        <div className="line flex-1 h-px bg-gray-200"></div>
        <div className="or-text px-3 text-sm text-gray-500">OR</div>
        <div className="line flex-1 h-px bg-gray-200"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input 
            type="text" 
            id="fullName" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="form-group">
          <label htmlFor="signupEmail" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
          <input 
            type="email" 
            id="signupEmail" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="form-group">
          <label htmlFor="signupPassword" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <div className="password-input-container relative">
            <input 
              type={showPassword ? "text" : "password"} 
              id="signupPassword" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 pr-16"
            />
            <button 
              type="button" 
              className="password-toggle absolute right-2 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm text-blue-600 hover:text-blue-800"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <div className="password-input-container relative">
            <input 
              type={showPassword ? "text" : "password"} 
              id="confirmPassword" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <button 
          type="submit" 
          className={`submit-btn w-full py-2 px-4 rounded-md text-white font-medium transition ${isFormValid ? 'bg-blue-600 hover:bg-blue-700 active' : 'bg-blue-300 cursor-not-allowed'}`}
          disabled={!isFormValid}
        >
          Create Account
        </button>
      </form>

      <div className="terms-privacy text-center mt-6">
        <p className="text-xs sm:text-sm text-gray-500">
          By signing up, you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

export default SignupForm;
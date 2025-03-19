import React, { useState } from 'react';
import './App.css';
import SignupForm from './SignupForm';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './components/firebase.js';
import { useNavigate } from 'react-router-dom'; 
import axiosInstance from './axiosInstance.js';
import axios from 'axios';


function Interface() {
  const [showLogin, setShowLogin] = useState(true);

  const toggleForm = () => {
    setShowLogin(!showLogin);
  };

  return (
    <div className="app">
      <LeftPanel />
      <RightPanel showLogin={showLogin} toggleForm={toggleForm} />
    </div>
  );
}

function LeftPanel() {
  return (
    <div className="left-panel">
    </div>
  );
}

function RightPanel({ showLogin, toggleForm }) {
  return (
    <div className="right-panel">
      {showLogin ? (
        <LoginForm onSignupClick={toggleForm} />
      ) : (
        <SignupForm onBackToLogin={toggleForm} />
      )}
    </div>
  );
}

function LoginForm({ onSignupClick }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  React.useEffect(() => {
    setIsFormValid(email.trim() !== '' && password.trim() !== '');
  }, [email, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      // Send login request to the server
      const response = await axiosInstance.post('/auth/login', {
        email, password 
      });
  
     
  
      if (response.data.user) {
        localStorage.setItem('token', response.data.token);
        // Redirect to dashboard on successful login
        navigate('/dashboard');
      } else {
        // Show error message from the server
        alert(data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Error during login:', error);
      alert('An error occurred. Please try again.');
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
    <div className="form-container">
      <div className="header">
        <h1>Sign in</h1>
      </div>

      <div className="signup-option">
        <p>Don't have an account?</p>
        <a href="#" onClick={onSignupClick}>Sign up</a>
      </div>

      <div className="social-login">
        <button onClick={googleLogin} className="google-btn">
          <div className="google-icon">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M19.8 10.2c0-.7-.1-1.4-.2-2h-9.6v3.8h5.5c-.2 1.2-1 2.3-2.1 3v2.5h3.4c2-1.8 3-4.5 3-7.3z" fill="#4285F4"/>
              <path d="M10 20c2.9 0 5.3-1 7-2.6l-3.4-2.6c-.9.6-2.1 1-3.6 1-2.8 0-5.1-1.9-6-4.4H.5v2.7c1.8 3.5 5.4 5.9 9.5 5.9z" fill="#34A853"/>
              <path d="M4 10.2c-.2-.6-.4-1.3-.4-2s.1-1.4.4-2V3.5H.5c-.8 1.6-1.3 3.4-1.3 5.2 0 1.8.5 3.6 1.3 5.2l3.5-2.7z" fill="#FBBC05"/>
              <path d="M10 3.9c1.6 0 3 .5 4.1 1.6l3-3C15.3.9 12.9 0 10 0 5.9 0 2.3 2.4.5 5.9l3.5 2.7c.8-2.5 3.2-4.7 6-4.7z" fill="#EA4335"/>
            </svg>
          </div>
          Continue with Google
        </button>
      </div>

      <div className="or-divider">
        <div className="line"></div>
        <div className="or-text">OR</div>
        <div className="line"></div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email address</label>
          <input 
            type="text" 
            id="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Your password</label>
          <div className="password-input-container">
            <input 
              type={showPassword ? "text" : "password"} 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button 
              type="button" 
              className="password-toggle"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="forgot-password">
          <a href="#">Forgot your password?</a>
        </div>

        <button 
          type="submit" 
          className={`submit-btn ${isFormValid ? 'active' : ''}`}
        >
          Sign in
        </button>
      </form>

      <div className="bottom-signup">
        <p>Don't have an account?<a href="#" onClick={onSignupClick}>Sign up</a></p>
      </div>
    </div>
  );
}

export default Interface;
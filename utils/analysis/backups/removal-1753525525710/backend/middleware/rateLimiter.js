const rateLimit = require('express-rate-limit');

// General rate limiter for all API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' }
});

// Stricter rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 login/signup attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again after an hour.' }
});

// Even stricter rate limiter for failed login attempts
const loginFailureLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 failed login attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // We'll handle this with our custom logic
  // Custom logic to only count failed login attempts
  skip: (req, res) => {
    // Check response after processing the request
    res.on('finish', () => {
      // If the login was successful, this header won't be set
      const isFailedLogin = res.get('X-Login-Failed') === 'true';
      
      // Skip rate limiting if the login was successful
      return !isFailedLogin;
    });
    
    // Don't skip by default (we'll determine after the response)
    return false;
  },
  message: { error: 'Too many failed login attempts, please try again after an hour.' }
});

module.exports = {
  apiLimiter,
  authLimiter,
  loginFailureLimiter
}; 
/**
 * Custom CORS middleware for handling specific CORS requirements
 * for different parts of the API, particularly addressing the app.cryptique.io
 * frontend needing to access the API.
 */

module.exports = {
  // Special CORS middleware for team API endpoints
  teamCorsMiddleware: (req, res, next) => {
    // Specifically allow app.cryptique.io
    const allowedOrigins = ['https://app.cryptique.io', 'http://localhost:3000'];
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests explicitly
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    next();
  }
}; 
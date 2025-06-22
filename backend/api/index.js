// Vercel serverless function handler
const app = require('../index');

// Export handler for Vercel
module.exports = (req, res) => {
  // Set additional CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, x-cryptique-site-id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  // Handle the request with Express app
  return app(req, res);
}; 
// Serverless function handler for Vercel
const app = require('../index');

// Export the handler function for Vercel
module.exports = (req, res) => {
  // Handle the request using the Express app
  return app(req, res);
}; 
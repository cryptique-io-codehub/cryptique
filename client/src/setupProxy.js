// This file needs to be in the src directory for Create React App to properly use it
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_SERVER_URL || 'http://localhost:3001',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api', // No rewrite needed
      },
      onProxyRes: function(proxyRes, req, res) {
        // Add CORS headers to all proxy responses
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ 
          message: 'Error connecting to the API server. Please try again later.',
          error: err.message
        }));
      }
    })
  );
}; 
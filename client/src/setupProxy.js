// This file needs to be in the src directory for Create React App to properly use it
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://cryptique-backend.vercel.app',
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        '^/api': '/api'
      },
      onProxyRes: function(proxyRes, req, res) {
        // Add CORS headers to all proxy responses
        const origin = req.headers.origin;
        if (origin && (
          origin.includes('app.cryptique.io') || 
          origin.includes('cryptique.io') || 
          origin.includes('localhost')
        )) {
          proxyRes.headers['Access-Control-Allow-Origin'] = origin;
          proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
          proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept';
          proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
          proxyRes.headers['Access-Control-Max-Age'] = '86400';
        }
      },
      onProxyReq: function(proxyReq, req, res) {
        // Copy authorization header from the original request
        const token = req.headers.authorization;
        if (token) {
          proxyReq.setHeader('Authorization', token);
        }
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': req.headers.origin || '*',
          'Access-Control-Allow-Credentials': 'true'
        });
        res.end(JSON.stringify({ 
          message: 'Error connecting to the API server. Please try again later.',
          error: err.message
        }));
      }
    })
  );
}; 
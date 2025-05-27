const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error('Error:', err);

  // Default error response
  const errorResponse = {
    message: 'An error occurred',
    error: err.message || 'Internal server error'
  };

  // Set appropriate status code
  let statusCode = err.statusCode || 500;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.message = 'Validation error';
    errorResponse.error = Object.values(err.errors).map(e => e.message);
  } else if (err.name === 'MongoError' && err.code === 11000) {
    statusCode = 409;
    errorResponse.message = 'Duplicate key error';
    errorResponse.error = 'A record with this key already exists';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse.message = 'Authentication error';
    errorResponse.error = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse.message = 'Authentication error';
    errorResponse.error = 'Token expired';
  }

  // Ensure CORS headers are set in error responses
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler; 
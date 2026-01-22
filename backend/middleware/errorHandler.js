/**
 * Global error handler middleware
 * Formats error responses consistently
 */
const errorHandler = (err, req, res, next) => {
  // Log error details
  console.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Handle specific error types
  
  // Unauthorized errors
  if (err.name === 'UnauthorizedError' || err.code === 401) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message || 'Authentication required'
    });
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details || undefined
    });
  }
  
  // Rate limit errors
  if (err.code === 429) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: err.retryAfter || undefined
    });
  }
  
  // Not found errors
  if (err.code === 404 || err.name === 'NotFoundError') {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message || 'The requested resource was not found'
    });
  }
  
  // Forbidden errors
  if (err.code === 403) {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message || 'You do not have permission to access this resource'
    });
  }
  
  // Bad request errors
  if (err.code === 400 || err.name === 'BadRequestError') {
    return res.status(400).json({
      error: 'Bad Request',
      message: err.message || 'Invalid request parameters'
    });
  }
  
  // Twitter API specific errors
  if (err.data && err.data.errors) {
    const twitterError = err.data.errors[0];
    return res.status(err.code || 500).json({
      error: 'Twitter API Error',
      message: twitterError.message || 'An error occurred with Twitter API',
      code: twitterError.code || undefined
    });
  }
  
  // Default server error
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;

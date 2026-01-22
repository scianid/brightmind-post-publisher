/**
 * Middleware to validate X (Twitter) access token
 * Extracts token from Authorization header and validates format
 */
const validateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization header is required'
    });
  }
  
  // Check if header follows "Bearer <token>" format
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization header must use Bearer scheme'
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  if (!token || token.trim().length === 0) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is missing'
    });
  }
  
  // Attach token to request for use in route handlers
  req.accessToken = token;
  next();
};

module.exports = validateToken;

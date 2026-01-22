const { TwitterApi } = require('twitter-api-v2');

/**
 * Create a Twitter API client with the given access token
 * @param {string} accessToken - OAuth 2.0 access token
 * @returns {TwitterApi} Configured Twitter API client
 */
const createClient = (accessToken) => {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  
  return new TwitterApi(accessToken);
};

/**
 * Create a Twitter API client for app-level operations
 * Requires X_CLIENT_ID and X_CLIENT_SECRET environment variables
 * @returns {TwitterApi} Configured Twitter API client
 */
const createAppClient = () => {
  if (!process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET) {
    throw new Error('X_CLIENT_ID and X_CLIENT_SECRET environment variables are required');
  }
  
  return new TwitterApi({
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET
  });
};

/**
 * Validate Twitter API credentials are configured
 * @throws {Error} If credentials are not configured
 */
const validateConfig = () => {
  const required = ['X_CLIENT_ID', 'X_CLIENT_SECRET', 'X_REDIRECT_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

/**
 * Parse Twitter API error for user-friendly message
 * @param {Error} error - Twitter API error
 * @returns {Object} Formatted error object
 */
const parseTwitterError = (error) => {
  // Handle rate limit errors
  if (error.code === 429 || error.rateLimit) {
    return {
      code: 429,
      error: 'Rate Limit Exceeded',
      message: 'You have made too many requests. Please try again later.',
      retryAfter: error.rateLimit?.reset || null
    };
  }
  
  // Handle authentication errors
  if (error.code === 401) {
    return {
      code: 401,
      error: 'Unauthorized',
      message: 'Your access token is invalid or expired. Please log in again.'
    };
  }
  
  // Handle permission errors
  if (error.code === 403) {
    return {
      code: 403,
      error: 'Forbidden',
      message: 'You do not have permission to perform this action. Check your app permissions.'
    };
  }
  
  // Handle duplicate tweet errors
  if (error.data?.errors?.[0]?.code === 187) {
    return {
      code: 400,
      error: 'Duplicate Tweet',
      message: 'This tweet appears to be a duplicate. Please try posting something different.'
    };
  }
  
  // Handle Twitter API specific errors
  if (error.data?.errors?.[0]) {
    const twitterError = error.data.errors[0];
    return {
      code: error.code || 400,
      error: 'Twitter API Error',
      message: twitterError.message || 'An error occurred with Twitter API',
      details: twitterError
    };
  }
  
  // Default error
  return {
    code: error.code || 500,
    error: 'API Error',
    message: error.message || 'An unexpected error occurred'
  };
};

module.exports = {
  createClient,
  createAppClient,
  validateConfig,
  parseTwitterError
};

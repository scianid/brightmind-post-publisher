const express = require('express');
const router = express.Router();
const { TwitterApi } = require('twitter-api-v2');
const crypto = require('crypto');

/**
 * POST /api/x/auth/init
 * Initialize OAuth 2.0 flow with PKCE
 * Returns authorization URL, state, and code verifier
 */
router.post('/auth/init', async (req, res) => {
  try {
    // Validate required environment variables
    if (!process.env.X_CLIENT_ID || !process.env.X_REDIRECT_URI) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'X API credentials not configured' 
      });
    }

    // Generate PKCE challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    
    // Build authorization URL
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', process.env.X_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', process.env.X_REDIRECT_URI);
    authUrl.searchParams.append('scope', 'tweet.read tweet.write users.read offline.access');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    
    console.log('OAuth init - state:', state);
    
    res.json({ 
      authUrl: authUrl.toString(), 
      state,
      codeVerifier  // Frontend will send this back in callback
    });
  } catch (error) {
    console.error('OAuth init failed:', error);
    res.status(500).json({ 
      error: 'Failed to initialize OAuth',
      message: error.message 
    });
  }
});

/**
 * POST /api/x/auth/callback
 * Exchange authorization code for access token
 * Requires: code, codeVerifier
 * Returns: accessToken, refreshToken, user info
 */
router.post('/auth/callback', async (req, res) => {
  const { code, codeVerifier } = req.body;
  
  try {
    // Validate request
    if (!code || !codeVerifier) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'code and codeVerifier are required' 
      });
    }

    // Validate environment configuration
    if (!process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'X API credentials not configured' 
      });
    }
    
    // Create Twitter client
    const client = new TwitterApi({
      clientId: process.env.X_CLIENT_ID,
      clientSecret: process.env.X_CLIENT_SECRET
    });
    
    console.log('Exchanging code for token...');
    
    // Exchange authorization code for access token
    const { 
      client: loggedClient, 
      accessToken, 
      refreshToken,
      expiresIn 
    } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: process.env.X_REDIRECT_URI
    });
    
    console.log('Token exchange successful');
    
    // Get authenticated user information
    const { data: user } = await loggedClient.v2.me({
      'user.fields': ['profile_image_url', 'username', 'name', 'verified']
    });
    
    console.log('User authenticated:', user.username);
    
    res.json({
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatar: user.profile_image_url,
        verified: user.verified || false
      }
    });
    
  } catch (error) {
    console.error('Token exchange failed:', error);
    
    // Handle specific Twitter API errors
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid authorization code or credentials' 
      });
    }
    
    res.status(500).json({ 
      error: 'Authentication failed',
      message: error.message 
    });
  }
});

/**
 * POST /api/x/auth/refresh
 * Refresh an expired access token
 * Requires: Authorization header with refresh token
 */
router.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  try {
    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Missing refresh token',
        message: 'refreshToken is required' 
      });
    }

    const client = new TwitterApi({
      clientId: process.env.X_CLIENT_ID,
      clientSecret: process.env.X_CLIENT_SECRET
    });
    
    // Refresh the token
    const { 
      client: refreshedClient,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn
    } = await client.refreshOAuth2Token(refreshToken);
    
    console.log('Token refreshed successfully');
    
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn
    });
    
  } catch (error) {
    console.error('Token refresh failed:', error);
    res.status(401).json({ 
      error: 'Token refresh failed',
      message: 'Please log in again' 
    });
  }
});

/**
 * POST /api/x/revoke
 * Revoke access token (logout)
 * Requires: Authorization header
 */
router.post('/revoke', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    if (!accessToken) {
      return res.status(400).json({ 
        error: 'Missing access token',
        message: 'Authorization header is required' 
      });
    }

    const client = new TwitterApi(accessToken);
    
    // Revoke the token
    await client.v2.revokeOAuth2Token(
      accessToken,
      process.env.X_CLIENT_ID,
      process.env.X_CLIENT_SECRET
    );
    
    console.log('Token revoked successfully');
    
    res.json({ 
      success: true,
      message: 'Successfully logged out' 
    });
    
  } catch (error) {
    console.error('Token revocation failed:', error);
    // Still return success even if revocation fails
    // (token might already be expired or invalid)
    res.json({ 
      success: true,
      message: 'Logged out' 
    });
  }
});

module.exports = router;

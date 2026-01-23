const express = require('express');
const router = express.Router();
const { TwitterApi } = require('twitter-api-v2');
const crypto = require('crypto');

/**
 * GET /api/x/auth/config
 * Get OAuth configuration for client-side authentication
 * Returns client ID and redirect URI (no secrets exposed)
 */
router.get('/auth/config', async (req, res) => {
  try {
    // Validate required environment variables
    if (!process.env.X_CLIENT_ID) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'X API credentials not configured' 
      });
    }

    // Return only public configuration (no secrets)
    res.json({ 
      clientId: process.env.X_CLIENT_ID,
      // Client will use window.location.origin as redirect URI
    });
  } catch (error) {
    console.error('OAuth config failed:', error);
    res.status(500).json({ 
      error: 'Failed to get OAuth config',
      message: error.message 
    });
  }
});

/**
 * POST /api/x/auth/token
 * Exchange authorization code for access token (proxies to Twitter API to avoid CORS)
 * Requires: code, codeVerifier, redirectUri
 * Returns: accessToken, refreshToken, expiresIn
 */
router.post('/auth/token', async (req, res) => {
  const { code, codeVerifier, redirectUri } = req.body;
  
  try {
    // Validate request
    if (!code || !codeVerifier || !redirectUri) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'code, codeVerifier, and redirectUri are required' 
      });
    }

    // Validate environment configuration
    if (!process.env.X_CLIENT_ID) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'X API credentials not configured' 
      });
    }
    
    console.log('Proxying token exchange to Twitter API...');
    
    // Exchange code for token by proxying to Twitter API
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.X_CLIENT_ID,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Twitter token exchange failed:', errorData);
      throw new Error(errorData.error_description || 'Token exchange failed');
    }
    
    const { access_token, refresh_token, expires_in } = await tokenResponse.json();
    
    console.log('Token exchange successful');
    
    res.json({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in
    });
    
  } catch (error) {
    console.error('Token exchange failed:', error);
    
    res.status(500).json({ 
      error: 'Authentication failed',
      message: error.message 
    });
  }
});

/**
 * GET /api/x/user
 * Get authenticated user information from access token
 * Requires: Authorization header with access token
 * Returns: user info
 */
router.get('/user', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    if (!accessToken) {
      return res.status(400).json({ 
        error: 'Missing access token',
        message: 'Authorization header is required' 
      });
    }

    const client = new TwitterApi(accessToken);
    
    // Get authenticated user information
    const { data: user } = await client.v2.me({
      'user.fields': ['profile_image_url', 'username', 'name', 'verified']
    });
    
    console.log('User info retrieved:', user.username);
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatar: user.profile_image_url,
        verified: user.verified || false
      }
    });
    
  } catch (error) {
    console.error('User info retrieval failed:', error);
    
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid or expired access token' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to get user info',
      message: error.message 
    });
  }
});

/**
 * POST /api/x/auth/refresh
 * Refresh an expired access token using X API directly from client
 * This endpoint helps client refresh tokens by proxying to X API
 * Requires: refreshToken in body
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

    if (!process.env.X_CLIENT_ID) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'X API credentials not configured' 
      });
    }
    
    // Forward refresh request to X API
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: process.env.X_CLIENT_ID,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error_description || 'Token refresh failed');
    }
    
    const { access_token, refresh_token, expires_in } = await tokenResponse.json();
    
    console.log('Token refreshed successfully');
    
    res.json({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in
    });
    
  } catch (error) {
    console.error('Token refresh failed:', error);
    res.status(401).json({ 
      error: 'Token refresh failed',
      message: 'Please log in again' 
    });
  }
});

module.exports = router;

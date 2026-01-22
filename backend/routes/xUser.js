const express = require('express');
const router = express.Router();
const { TwitterApi } = require('twitter-api-v2');

/**
 * GET /api/x/user
 * Get authenticated user information
 * Requires: Authorization header with access token
 */
router.get('/user', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    // Validate request
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authorization header is required' 
      });
    }
    
    // Create Twitter client with access token
    const client = new TwitterApi(accessToken);
    
    console.log('Fetching user information...');
    
    // Get user information with additional fields
    const { data: user } = await client.v2.me({
      'user.fields': [
        'profile_image_url',
        'username',
        'name',
        'verified',
        'description',
        'created_at',
        'public_metrics',
        'location',
        'url'
      ]
    });
    
    console.log('User information retrieved:', user.username);
    
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: user.profile_image_url,
      verified: user.verified || false,
      description: user.description || '',
      location: user.location || '',
      url: user.url || '',
      createdAt: user.created_at,
      metrics: {
        followersCount: user.public_metrics?.followers_count || 0,
        followingCount: user.public_metrics?.following_count || 0,
        tweetCount: user.public_metrics?.tweet_count || 0,
        listedCount: user.public_metrics?.listed_count || 0
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch user information:', error);
    
    // Handle specific Twitter API errors
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired access token. Please log in again.' 
      });
    }
    
    if (error.code === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch user information',
      message: error.message 
    });
  }
});

/**
 * GET /api/x/user/tweets
 * Get recent tweets from authenticated user
 * Requires: Authorization header with access token
 * Query params: limit (default 10, max 100)
 */
router.get('/user/tweets', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  
  try {
    // Validate request
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authorization header is required' 
      });
    }
    
    // Create Twitter client with access token
    const client = new TwitterApi(accessToken);
    
    console.log('Fetching user tweets...');
    
    // Get authenticated user's ID first
    const { data: user } = await client.v2.me();
    
    // Get user's recent tweets
    const { data: tweets, meta } = await client.v2.userTimeline(user.id, {
      max_results: limit,
      'tweet.fields': ['created_at', 'public_metrics', 'attachments'],
      'media.fields': ['url', 'preview_image_url', 'type'],
      expansions: ['attachments.media_keys']
    });
    
    console.log(`Retrieved ${tweets?.length || 0} tweets`);
    
    res.json({
      tweets: tweets || [],
      meta: {
        resultCount: meta?.result_count || 0,
        nextToken: meta?.next_token
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch user tweets:', error);
    
    // Handle specific Twitter API errors
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired access token. Please log in again.' 
      });
    }
    
    if (error.code === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch user tweets',
      message: error.message 
    });
  }
});

/**
 * GET /api/x/user/rate-limits
 * Get current rate limit status for the authenticated user
 * Requires: Authorization header with access token
 */
router.get('/user/rate-limits', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    // Validate request
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authorization header is required' 
      });
    }
    
    // Create Twitter client with access token
    const client = new TwitterApi(accessToken);
    
    console.log('Fetching rate limit information...');
    
    // Get rate limit status
    const rateLimitStatus = await client.v2.rateLimitStatuses();
    
    res.json({
      resources: rateLimitStatus
    });
    
  } catch (error) {
    console.error('Failed to fetch rate limits:', error);
    
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired access token. Please log in again.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch rate limits',
      message: error.message 
    });
  }
});

module.exports = router;

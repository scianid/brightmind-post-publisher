const express = require('express');
const router = express.Router();
const { TwitterApi } = require('twitter-api-v2');
const axios = require('axios');

/**
 * POST /api/x/post
 * Publish a text-only tweet
 * Requires: Authorization header with access token
 * Body: { text: string }
 */
router.post('/post', async (req, res) => {
  const { text } = req.body;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    // Validate request
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authorization header is required' 
      });
    }
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Text is required and cannot be empty' 
      });
    }

    // Check text length (X limit is 280 characters for standard accounts)
    if (text.length > 280) {
      return res.status(400).json({ 
        error: 'Text too long',
        message: `Text exceeds 280 characters (${text.length})` 
      });
    }
    
    // Create Twitter client with access token
    const client = new TwitterApi(accessToken);
    
    console.log('Posting tweet:', text.substring(0, 50) + '...');
    
    // Post tweet
    const { data } = await client.v2.tweet({ text });
    
    console.log('Tweet posted successfully:', data.id);
    
    res.json({ 
      success: true, 
      tweetId: data.id,
      tweetUrl: `https://x.com/i/web/status/${data.id}`,
      text: data.text
    });
    
  } catch (error) {
    console.error('Post failed:', error);
    
    // Handle specific Twitter API errors
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired access token. Please log in again.' 
      });
    }
    
    if (error.code === 403) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You do not have permission to post tweets. Check app permissions.' 
      });
    }
    
    if (error.code === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'You have posted too many tweets. Please try again later.' 
      });
    }
    
    if (error.data?.detail) {
      return res.status(400).json({ 
        error: 'Twitter API error',
        message: error.data.detail 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to post tweet',
      message: error.message 
    });
  }
});

/**
 * POST /api/x/post/with-media
 * Publish a tweet with an image
 * Requires: Authorization header with access token
 * Body: { text: string, imageUrl?: string, imageBase64?: string }
 */
router.post('/post/with-media', async (req, res) => {
  const { text, imageUrl, imageBase64 } = req.body;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    // Validate request
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authorization header is required' 
      });
    }
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Text is required and cannot be empty' 
      });
    }

    if (!imageUrl && !imageBase64) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Either imageUrl or imageBase64 is required' 
      });
    }
    
    // Create Twitter client with access token
    const client = new TwitterApi(accessToken);
    
    let mediaId;
    
    // Handle image from URL
    if (imageUrl) {
      console.log('Downloading image from URL:', imageUrl);
      
      try {
        const imageResponse = await axios.get(imageUrl, { 
          responseType: 'arraybuffer',
          timeout: 30000, // 30 second timeout
          maxContentLength: 5 * 1024 * 1024 // 5MB max
        });
        
        const buffer = Buffer.from(imageResponse.data);
        const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';
        
        console.log('Image downloaded, size:', buffer.length, 'bytes, type:', mimeType);
        
        // Validate image type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(mimeType)) {
          return res.status(400).json({ 
            error: 'Invalid image type',
            message: `Image must be JPEG, PNG, GIF, or WebP. Got: ${mimeType}` 
          });
        }
        
        // Upload to X
        console.log('Uploading image to X...');
        try {
          // Retry logic for transient errors (503, 500)
          let retries = 3;
          let lastError;
          
          for (let attempt = 1; attempt <= retries; attempt++) {
            try {
              mediaId = await client.v1.uploadMedia(buffer, { mimeType });
              console.log('Image uploaded, media ID:', mediaId);
              break; // Success, exit retry loop
            } catch (uploadError) {
              lastError = uploadError;
              
              // Don't retry on permission errors
              if (uploadError.code === 403) {
                throw uploadError;
              }
              
              // Retry on 503, 500, 502, 504
              if (uploadError.code === 503 || uploadError.code === 500 || uploadError.code === 502 || uploadError.code === 504) {
                console.log(`Upload attempt ${attempt}/${retries} failed with ${uploadError.code}, retrying...`);
                
                if (attempt < retries) {
                  // Exponential backoff: 1s, 2s, 4s
                  const delay = Math.pow(2, attempt - 1) * 1000;
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue;
                }
              }
              
              // Non-retryable error or final attempt
              throw uploadError;
            }
          }
          
          if (!mediaId) {
            throw lastError;
          }
        } catch (uploadError) {
          console.error('X media upload failed:', uploadError);
          
          if (uploadError.code === 403) {
            return res.status(403).json({ 
              error: 'Permission denied',
              message: 'Your access token does not have permission to upload media. Please log out and log back in to refresh your token with media upload permissions.' 
            });
          }
          
          if (uploadError.code === 503) {
            return res.status(503).json({ 
              error: 'Service unavailable',
              message: 'Twitter media upload service is temporarily unavailable. Please try again in a few moments.' 
            });
          }
          
          throw uploadError;
        }
        
      } catch (downloadError) {
        console.error('Image processing failed:', downloadError);
        
        if (downloadError.code === 403) {
          return res.status(403).json({ 
            error: 'Permission denied',
            message: downloadError.message || 'Token lacks media upload permissions. Please log out and log back in.' 
          });
        }
        
        return res.status(400).json({ 
          error: 'Failed to process image',
          message: downloadError.message 
        });
      }
    }
    
    // Handle base64 image
    else if (imageBase64) {
      console.log('Processing base64 image...');
      
      try {
        // Parse base64 data URL
        const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ 
            error: 'Invalid base64 format',
            message: 'Image must be in format: data:image/[type];base64,[data]' 
          });
        }
        
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        console.log('Base64 decoded, size:', buffer.length, 'bytes, type:', mimeType);
        
        // Validate image type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(mimeType)) {
          return res.status(400).json({ 
            error: 'Invalid image type',
            message: `Image must be JPEG, PNG, GIF, or WebP. Got: ${mimeType}` 
          });
        }
        
        // Check size limit (5MB)
        if (buffer.length > 5 * 1024 * 1024) {
          return res.status(413).json({ 
            error: 'Image too large',
            message: `Image size exceeds 5MB limit (${Math.round(buffer.length / 1024 / 1024)}MB)` 
          });
        }
        
        // Upload to X
        console.log('Uploading image to X...');
        
        // Retry logic for transient errors (503, 500)
        let retries = 3;
        let lastError;
        
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            mediaId = await client.v1.uploadMedia(buffer, { mimeType });
            console.log('Image uploaded, media ID:', mediaId);
            break; // Success, exit retry loop
          } catch (uploadError) {
            lastError = uploadError;
            
            // Retry on 503, 500, 502, 504
            if (uploadError.code === 503 || uploadError.code === 500 || uploadError.code === 502 || uploadError.code === 504) {
              console.log(`Upload attempt ${attempt}/${retries} failed with ${uploadError.code}, retrying...`);
              
              if (attempt < retries) {
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
            }
            
            throw uploadError;
          }
        }
        
        if (!mediaId) {
          throw lastError;
        }
        
      } catch (parseError) {
        console.error('Base64 parsing failed:', parseError);
        return res.status(400).json({ 
          error: 'Failed to process base64 image',
          message: parseError.message 
        });
      }
    }
    
    // Post tweet with media
    console.log('Posting tweet with media...');
    const { data } = await client.v2.tweet({
      text,
      media: { media_ids: [mediaId] }
    });
    
    console.log('Tweet with media posted successfully:', data.id);
    
    res.json({ 
      success: true, 
      tweetId: data.id,
      tweetUrl: `https://x.com/i/web/status/${data.id}`,
      text: data.text
    });
    
  } catch (error) {
    console.error('Post with media failed:', error);
    
    // Handle specific Twitter API errors
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired access token. Please log in again.' 
      });
    }
    
    if (error.code === 403) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You do not have permission to post tweets with media. Check app permissions.' 
      });
    }
    
    if (error.code === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'You have posted too many tweets. Please try again later.' 
      });
    }
    
    if (error.code === 413) {
      return res.status(413).json({ 
        error: 'Media too large',
        message: 'Image exceeds size limit. Please use a smaller image.' 
      });
    }
    
    if (error.data?.detail) {
      return res.status(400).json({ 
        error: 'Twitter API error',
        message: error.data.detail 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to post tweet with media',
      message: error.message 
    });
  }
});

module.exports = router;

# X (Twitter) Login & Direct Posting Design Document

## 1. Overview

This document outlines the design for adding native X (Twitter) login and direct posting functionality to the BrightMind Post Publisher. Currently, the application uses X Web Intents (`x.com/intent/post`) which only supports text and requires manual user action. This enhancement will enable:

1. **User Authentication** with X OAuth 2.0
2. **Direct Post Publishing** including text and images via X API v2
3. **Session Management** for authenticated users
4. **Post History** tracking of published content

---

## 2. Architecture Overview

### 2.1 Current State
- Client-side only React application
- BrightMind API for persona/voice features
- X Web Intents for posting (text only, no images)

### 2.2 Proposed State
- **Client:** React frontend (existing)
- **Backend Proxy:** Node.js/Express server for OAuth and X API calls
- **Authentication Flow:** OAuth 2.0 with PKCE
- **Data Storage:** Session storage for access tokens (temporary)
- **X API Integration:** Twitter API v2 for posting with media

---

## 3. Technical Requirements

### 3.1 X Developer Account Setup
- [ ] Create X Developer App at [developer.twitter.com](https://developer.twitter.com)
- [ ] Enable OAuth 2.0 with PKCE
- [ ] Configure Callback URL: `http://localhost:5173/auth/callback` (dev) and production URL
- [ ] Request elevated access for media upload if needed
- [ ] Obtain: `Client ID` and `Client Secret`
- [ ] Set required scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`

### 3.2 Backend Server (New)

**Technology Stack:**
- Node.js + Express
- `twitter-api-v2` npm package for X API interaction
- `cors` for cross-origin requests
- Environment variables for secrets

**Endpoints:**
```
POST   /api/x/auth/init          - Initialize OAuth flow
POST   /api/x/auth/callback      - Handle OAuth callback
POST   /api/x/post               - Publish post to X
POST   /api/x/post/with-media    - Publish post with image
GET    /api/x/user               - Get authenticated user info
POST   /api/x/revoke             - Revoke X access token
```

### 3.3 Frontend Changes (Existing React App)

**New Components:**
- `XLoginButton.jsx` - Trigger X authentication
- `XAccountBadge.jsx` - Display logged-in X user
- `XPostModal.jsx` - Confirmation modal before posting

**Modified Components:**
- `App.jsx` - Add X auth state management
- `Composer.jsx` - Add "Direct Post to X" option

---

## 4. Authentication Flow (OAuth 2.0 with PKCE)

### 4.1 Sequence Diagram

```
User          Frontend              Backend              X API
 |               |                     |                    |
 |--Click Login->|                     |                    |
 |               |--GET /auth/init---->|                    |
 |               |                     |--Generate PKCE---->|
 |               |<--Auth URL + State--|                    |
 |               |                     |                    |
 |--Redirect-----|---------------------|----Authorize------>|
 |               |                     |                    |
 |<--Callback----|<--------------------|----code + state----|
 |               |                     |                    |
 |               |--POST /auth/callback|                    |
 |               |   (code, verifier)  |--Exchange Token--->|
 |               |                     |<--Access Token-----|
 |               |<--Session Token-----|                    |
 |               |  (user info)        |                    |
```

### 4.2 Implementation Steps

#### Step 1: Initialize OAuth Flow (Frontend)
```javascript
// XLoginButton.jsx
const handleLogin = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/x/auth/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const { authUrl, state, codeVerifier } = await response.json();
    
    // Store verifier and state for callback
    sessionStorage.setItem('x_code_verifier', codeVerifier);
    sessionStorage.setItem('x_state', state);
    
    // Redirect to X authorization
    window.location.href = authUrl;
  } catch (error) {
    console.error('X login failed:', error);
  }
};
```

#### Step 2: Initialize OAuth Flow (Backend)
```javascript
// backend/routes/xAuth.js
const { TwitterApi } = require('twitter-api-v2');
const crypto = require('crypto');

router.post('/auth/init', async (req, res) => {
  try {
    // Generate PKCE challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
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
    
    res.json({ 
      authUrl: authUrl.toString(), 
      state,
      codeVerifier  // Frontend will send this back in callback
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize OAuth' });
  }
});
```

#### Step 3: Handle Callback (Frontend)
```javascript
// App.jsx - useEffect for callback handling
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  
  if (code && state) {
    handleXCallback(code, state);
  }
}, []);

const handleXCallback = async (code, state) => {
  const storedState = sessionStorage.getItem('x_state');
  const codeVerifier = sessionStorage.getItem('x_code_verifier');
  
  // Validate state to prevent CSRF
  if (state !== storedState) {
    console.error('State mismatch - potential CSRF attack');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:3001/api/x/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, codeVerifier })
    });
    
    const { accessToken, refreshToken, user } = await response.json();
    
    // Store tokens securely
    sessionStorage.setItem('x_access_token', accessToken);
    sessionStorage.setItem('x_refresh_token', refreshToken);
    setXUser(user);
    
    // Clean up and redirect
    sessionStorage.removeItem('x_state');
    sessionStorage.removeItem('x_code_verifier');
    window.history.replaceState({}, '', window.location.pathname);
    
  } catch (error) {
    console.error('Callback handling failed:', error);
  }
};
```

#### Step 4: Exchange Code for Token (Backend)
```javascript
// backend/routes/xAuth.js
router.post('/auth/callback', async (req, res) => {
  const { code, codeVerifier } = req.body;
  
  try {
    const client = new TwitterApi({
      clientId: process.env.X_CLIENT_ID,
      clientSecret: process.env.X_CLIENT_SECRET
    });
    
    // Exchange authorization code for access token
    const { client: loggedClient, accessToken, refreshToken } = 
      await client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: process.env.X_REDIRECT_URI
      });
    
    // Get user information
    const { data: user } = await loggedClient.v2.me({
      'user.fields': ['profile_image_url', 'username', 'name']
    });
    
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        avatar: user.profile_image_url
      }
    });
    
  } catch (error) {
    console.error('Token exchange failed:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});
```

---

## 5. Posting Flow

### 5.1 Text-Only Post

```javascript
// Composer.jsx
const handleDirectPost = async () => {
  const accessToken = sessionStorage.getItem('x_access_token');
  
  if (!accessToken) {
    alert('Please login to X first');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:3001/api/x/post', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ 
        text: postText 
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(`Posted successfully! Tweet ID: ${result.tweetId}`);
      // Optionally open the tweet
      window.open(`https://x.com/${xUser.username}/status/${result.tweetId}`, '_blank');
    }
  } catch (error) {
    console.error('Failed to post:', error);
    alert('Failed to publish post');
  }
};
```

```javascript
// backend/routes/xPost.js
router.post('/post', async (req, res) => {
  const { text } = req.body;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const client = new TwitterApi(accessToken);
    
    // Post tweet
    const { data } = await client.v2.tweet({ text });
    
    res.json({ 
      success: true, 
      tweetId: data.id,
      tweetUrl: `https://x.com/i/web/status/${data.id}`
    });
    
  } catch (error) {
    console.error('Post failed:', error);
    res.status(500).json({ 
      error: 'Failed to post tweet',
      details: error.message 
    });
  }
});
```

### 5.2 Post with Image

**Flow:**
1. User provides image URL (from URL param or upload)
2. Backend downloads image from URL or receives base64
3. Backend uploads to X media endpoint
4. Backend creates tweet with media_id

```javascript
// Composer.jsx
const handleDirectPostWithImage = async () => {
  const accessToken = sessionStorage.getItem('x_access_token');
  
  try {
    const response = await fetch('http://localhost:3001/api/x/post/with-media', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ 
        text: postText,
        imageUrl: image  // or imageBase64 if uploaded
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(`Posted with image! Tweet ID: ${result.tweetId}`);
      window.open(`https://x.com/${xUser.username}/status/${result.tweetId}`, '_blank');
    }
  } catch (error) {
    console.error('Failed to post with image:', error);
  }
};
```

```javascript
// backend/routes/xPost.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

router.post('/post/with-media', async (req, res) => {
  const { text, imageUrl, imageBase64 } = req.body;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const client = new TwitterApi(accessToken);
    
    let mediaId;
    
    if (imageUrl) {
      // Download image from URL
      const imageResponse = await axios.get(imageUrl, { 
        responseType: 'arraybuffer' 
      });
      const buffer = Buffer.from(imageResponse.data);
      
      // Upload to X
      mediaId = await client.v1.uploadMedia(buffer, { 
        mimeType: imageResponse.headers['content-type'] 
      });
      
    } else if (imageBase64) {
      // Handle base64 image
      const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const buffer = Buffer.from(matches[2], 'base64');
      const mimeType = matches[1];
      
      mediaId = await client.v1.uploadMedia(buffer, { mimeType });
    }
    
    // Post tweet with media
    const { data } = await client.v2.tweet({
      text,
      media: { media_ids: [mediaId] }
    });
    
    res.json({ 
      success: true, 
      tweetId: data.id,
      tweetUrl: `https://x.com/i/web/status/${data.id}`
    });
    
  } catch (error) {
    console.error('Post with media failed:', error);
    res.status(500).json({ 
      error: 'Failed to post tweet with media',
      details: error.message 
    });
  }
});
```

---

## 6. UI/UX Changes

### 6.1 New Components

#### XLoginButton Component
```jsx
// components/XLoginButton.jsx
import React from 'react';
import { Twitter } from 'lucide-react';

export const XLoginButton = ({ onLogin, isLoading }) => {
  return (
    <button 
      onClick={onLogin}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 bg-black text-white 
                 rounded-lg hover:bg-gray-800 transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Twitter size={18} />
      {isLoading ? 'Connecting...' : 'Login with X'}
    </button>
  );
};
```

#### XAccountBadge Component
```jsx
// components/XAccountBadge.jsx
import React from 'react';
import { LogOut } from 'lucide-react';

export const XAccountBadge = ({ user, onLogout }) => {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border border-brand-border 
                    rounded-lg bg-white">
      <img 
        src={user.avatar} 
        alt={user.name}
        className="w-8 h-8 rounded-full"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{user.name}</div>
        <div className="text-xs text-brand-textSecondary">@{user.username}</div>
      </div>
      <button 
        onClick={onLogout}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        title="Logout from X"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
};
```

#### XPostModal Component
```jsx
// components/XPostModal.jsx
import React from 'react';
import { X } from 'lucide-react';

export const XPostModal = ({ isOpen, onClose, onConfirm, postText, image, xUser }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Confirm Post to X</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-brand-textSecondary mb-2">
            Posting as @{xUser.username}
          </p>
          
          <div className="border border-brand-border rounded-lg p-3">
            <p className="text-sm whitespace-pre-wrap">{postText}</p>
            {image && (
              <img 
                src={image} 
                alt="Post attachment" 
                className="mt-3 rounded-lg max-h-64 object-cover"
              />
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-brand-border rounded-lg
                       hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-black text-white rounded-lg
                       hover:bg-gray-800 transition-colors"
          >
            Post to X
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 6.2 Composer Changes

Add two new buttons:
- **"Login with X"** (when not authenticated)
- **"Post Directly to X"** (when authenticated, replaces or supplements the intent button)

```jsx
// Composer.jsx (additions)
<div className="flex gap-2">
  {!xUser ? (
    <XLoginButton onLogin={handleXLogin} />
  ) : (
    <>
      <XAccountBadge user={xUser} onLogout={handleXLogout} />
      <button 
        onClick={() => setShowXPostModal(true)}
        disabled={!postText.trim()}
        className="flex-1 px-4 py-3 bg-black text-white rounded-xl
                   hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        Post Directly to X
      </button>
    </>
  )}
  
  <button 
    onClick={() => handlePost(postText)}
    className="px-4 py-3 border border-brand-border rounded-xl
               hover:bg-gray-50 transition-colors"
  >
    Use X Intent (Text Only)
  </button>
</div>

<XPostModal 
  isOpen={showXPostModal}
  onClose={() => setShowXPostModal(false)}
  onConfirm={handleDirectPost}
  postText={postText}
  image={image}
  xUser={xUser}
/>
```

---

## 7. Security Considerations

### 7.1 Token Storage
- **Access Token:** Store in `sessionStorage` (cleared on tab close)
- **Refresh Token:** Store in `sessionStorage` or `localStorage` (for persistent login)
- **Never** expose tokens in client-side code or logs
- Implement token refresh logic before expiration

### 7.2 CORS Configuration
```javascript
// backend/server.js
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

### 7.3 Environment Variables
```bash
# backend/.env
X_CLIENT_ID=your_client_id
X_CLIENT_SECRET=your_client_secret
X_REDIRECT_URI=http://localhost:5173/auth/callback
FRONTEND_URL=http://localhost:5173
PORT=3001
```

### 7.4 Rate Limiting
- X API has rate limits (300 tweets per 3 hours for user context)
- Implement frontend rate limit tracking
- Show warning if user approaches limit

---

## 8. Backend Server Structure

```
backend/
├── server.js                 # Express app entry point
├── .env                      # Environment variables
├── package.json
├── routes/
│   ├── xAuth.js             # OAuth endpoints
│   ├── xPost.js             # Posting endpoints
│   └── xUser.js             # User info endpoints
├── middleware/
│   ├── validateToken.js     # JWT/token validation
│   └── errorHandler.js      # Global error handling
└── utils/
    ├── twitter.js           # Twitter API client wrapper
    └── logger.js            # Logging utility
```

### 8.1 Package.json
```json
{
  "name": "brightmind-post-publisher-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "twitter-api-v2": "^1.15.2",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### 8.2 Server.js
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const xAuthRoutes = require('./routes/xAuth');
const xPostRoutes = require('./routes/xPost');
const xUserRoutes = require('./routes/xUser');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // For base64 images

// Routes
app.use('/api/x', xAuthRoutes);
app.use('/api/x', xPostRoutes);
app.use('/api/x', xUserRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
```

---

## 9. Testing Strategy

### 9.1 Manual Testing Checklist
- [ ] OAuth flow completes successfully
- [ ] Access token stored and retrieved correctly
- [ ] Text-only post publishes to X
- [ ] Post with image (URL) publishes correctly
- [ ] Post with image (base64) publishes correctly
- [ ] Token refresh works when expired
- [ ] Logout clears tokens and state
- [ ] Error handling for network failures
- [ ] Error handling for invalid tokens
- [ ] Rate limit warnings display correctly

### 9.2 Test Accounts
- Create a test X developer account
- Use separate test accounts for posting
- Do not use production accounts during development

---

## 10. Migration Path

### Phase 1: Backend Setup (Week 1)
1. Create backend server structure
2. Implement OAuth flow endpoints
3. Test authentication with Postman
4. Deploy backend to staging environment

### Phase 2: Frontend Integration (Week 1-2)
1. Add X login button to UI
2. Implement OAuth callback handling
3. Add XAccountBadge component
4. Test authentication flow end-to-end

### Phase 3: Posting Features (Week 2)
1. Implement text-only posting
2. Implement image posting
3. Add XPostModal confirmation
4. Test posting flow

### Phase 4: Polish & Deploy (Week 3)
1. Error handling improvements
2. Loading states and animations
3. Rate limit tracking
4. Production deployment
5. Documentation updates

---

## 11. Environment Configuration

### 11.1 Development
```bash
# Frontend (.env)
VITE_BACKEND_URL=http://localhost:3001
VITE_X_AUTH_ENABLED=true

# Backend (.env)
X_CLIENT_ID=your_dev_client_id
X_CLIENT_SECRET=your_dev_client_secret
X_REDIRECT_URI=http://localhost:5173/auth/callback
FRONTEND_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
```

### 11.2 Production
```bash
# Frontend (.env.production)
VITE_BACKEND_URL=https://api.brightmind-community.com
VITE_X_AUTH_ENABLED=true

# Backend (.env.production)
X_CLIENT_ID=your_prod_client_id
X_CLIENT_SECRET=your_prod_client_secret
X_REDIRECT_URI=https://publisher.brightmind-community.com/auth/callback
FRONTEND_URL=https://publisher.brightmind-community.com
PORT=3001
NODE_ENV=production
```

---

## 12. Alternative Approaches

### 12.1 Option A: Serverless Functions (Recommended for Small Scale)
- Use Vercel/Netlify serverless functions instead of Express server
- Simpler deployment, auto-scaling
- Better for low-traffic applications

### 12.2 Option B: Client-Side Only (Not Recommended)
- Use OAuth 2.0 implicit flow (less secure)
- Tokens exposed in browser
- Not recommended for production use

### 12.3 Option C: Integration with BrightMind Backend
- Add X authentication to existing BrightMind API
- Single backend for all features
- Better for long-term maintenance
- **Requires BrightMind API modifications**

---

## 13. Future Enhancements

### 13.1 Post Scheduling
- Schedule posts for future publishing
- Recurring post templates
- Best time to post suggestions

### 13.2 Analytics
- Track post performance
- Engagement metrics
- Persona effectiveness comparison

### 13.3 Thread Support
- Create multi-tweet threads
- Automatic thread numbering
- Thread preview

### 13.4 Draft Management
- Save drafts for later
- Draft history and versioning
- Share drafts with team members

---

## 14. Cost & Resource Estimates

### 14.1 Development Time
- Backend setup: **10-15 hours**
- Frontend integration: **15-20 hours**
- Testing & debugging: **10-15 hours**
- Documentation: **5 hours**
- **Total: 40-55 hours**

### 14.2 Infrastructure Costs (Monthly)
- Backend hosting (e.g., Railway, Render): **$5-20**
- X API (Free tier): **$0** (basic access)
- X API (Basic tier): **$100** (if elevated access needed)
- Total monthly: **$5-120**

### 14.3 X API Rate Limits (Free Tier)
- Tweet creation: **300 tweets per 3 hours** (per user)
- Media upload: **50 media uploads per 24 hours**
- Sufficient for individual use

---

## 15. Success Metrics

### 15.1 Technical Metrics
- OAuth success rate > 95%
- Post success rate > 98%
- Average post latency < 3 seconds
- Zero token exposure incidents

### 15.2 User Metrics
- % of users who enable X login
- Posts via direct API vs. intents
- Average posts per user per day
- User satisfaction score

---

## 16. References & Resources

### Official Documentation
- [X API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [OAuth 2.0 PKCE Flow](https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code)
- [Media Upload Guide](https://developer.twitter.com/en/docs/twitter-api/v1/media/upload-media/overview)

### npm Packages
- [twitter-api-v2](https://www.npmjs.com/package/twitter-api-v2)
- [express](https://www.npmjs.com/package/express)
- [axios](https://www.npmjs.com/package/axios)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [ngrok](https://ngrok.com/) - Local development tunneling

---

## Appendix A: API Endpoint Specifications

### POST /api/x/auth/init
**Request:** None  
**Response:**
```json
{
  "authUrl": "https://twitter.com/i/oauth2/authorize?...",
  "state": "abc123",
  "codeVerifier": "xyz789"
}
```

### POST /api/x/auth/callback
**Request:**
```json
{
  "code": "oauth_code",
  "codeVerifier": "xyz789"
}
```
**Response:**
```json
{
  "accessToken": "token",
  "refreshToken": "refresh",
  "user": {
    "id": "123",
    "username": "john_doe",
    "name": "John Doe",
    "avatar": "https://..."
  }
}
```

### POST /api/x/post
**Headers:** `Authorization: Bearer <token>`  
**Request:**
```json
{
  "text": "Hello world!"
}
```
**Response:**
```json
{
  "success": true,
  "tweetId": "1234567890",
  "tweetUrl": "https://x.com/john_doe/status/1234567890"
}
```

### POST /api/x/post/with-media
**Headers:** `Authorization: Bearer <token>`  
**Request:**
```json
{
  "text": "Check out this image!",
  "imageUrl": "https://example.com/image.jpg"
}
```
**Response:**
```json
{
  "success": true,
  "tweetId": "1234567890",
  "tweetUrl": "https://x.com/john_doe/status/1234567890"
}
```

### GET /api/x/user
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "id": "123",
  "username": "john_doe",
  "name": "John Doe",
  "avatar": "https://...",
  "verified": false,
  "followersCount": 1000
}
```

---

## Appendix B: Error Codes

| Code | Error | Description | User Action |
|------|-------|-------------|-------------|
| 401 | `unauthorized` | Invalid or expired token | Re-login to X |
| 403 | `forbidden` | Insufficient permissions | Check app permissions |
| 429 | `rate_limit_exceeded` | Too many requests | Wait before posting again |
| 400 | `invalid_image` | Image format not supported | Use JPG, PNG, or GIF |
| 413 | `media_too_large` | Image exceeds size limit | Reduce image size |
| 500 | `internal_error` | Server error | Try again later |

---

**Document Version:** 1.0  
**Last Updated:** January 21, 2026  
**Author:** BrightMind Development Team  
**Status:** Draft - Awaiting Review

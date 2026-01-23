# BrightMind Post Publisher - Backend Service

Backend Node.js service for X (Twitter) OAuth 2.0 authentication and direct posting functionality.

## Features

- **OAuth 2.0 with PKCE** - Secure authentication flow
- **Direct Tweet Posting** - Post text and images to X/Twitter
- **Media Upload** - Support for images via URL or base64
- **User Information** - Retrieve authenticated user details
- **Rate Limit Handling** - Proper error handling for API limits
- **Token Management** - Access token and refresh token support

## Prerequisites

- Node.js 16+ and npm
- X (Twitter) Developer Account with OAuth 2.0 enabled
- X Developer App credentials (Client ID and Client Secret)

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file:
```bash
cp .env.example .env
```

4. Edit `.env` and add your X API credentials:
```env
X_CLIENT_ID=your_client_id_here
FRONTEND_URL=http://localhost:5173
```

> **Note:** You no longer need `X_CLIENT_SECRET` or `X_REDIRECT_URI` as OAuth callback is handled client-side. The redirect URI configured in your X Developer App should be `http://localhost:5173` (or your frontend URL).

## Running the Server

### Option 1: Local Development (with auto-reload)
```bash
npm run dev
```

### Option 2: Production
```bash
npm start
```

### Option 3: Docker

#### Build and run with Docker:
```bash
docker build -t brightmind-backend .
docker run -p 3001:3001 --env-file .env brightmind-backend
```

#### Using Docker Compose (recommended):
```bash
docker-compose up -d
```

Stop the container:
```bash
docker-compose down
```

View logs:
```bash
docker-compose logs -f
```

The server will start on `http://localhost:3001` (or the PORT specified in .env).

## API Endpoints

### Authentication

#### `GET /api/x/auth/config`
Get OAuth configuration for client-side authentication (returns only public client ID).

**Response:**
```json
{
  "clientId": "your_client_id"
}
```

> **Note:** OAuth flow is handled client-side using PKCE. The client generates code verifier/challenge and exchanges the authorization code directly with X API.

#### `POST /api/x/auth/refresh`
Refresh an expired access token (proxies request to X API).

**Request:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "accessToken": "new_token",
  "refreshToken": "new_refresh_token",
  "expiresIn": 7200
}
```

#### `GET /api/x/user`
Get authenticated user information from access token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "user": {
    "id": "123",
    "username": "john_doe",
    "name": "John Doe",
    "avatar": "https://...",
    "verified": false
  }
}
```

### Posting

#### `POST /api/x/post`
Post a text-only tweet.

**Headers:**
```
Authorization: Bearer <access_token>
```

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

#### `POST /api/x/post/with-media`
Post a tweet with an image.

**Headers:**
```/tweets?limit=10`
Get recent tweets from authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "123",
  "username": "john_doe",
  "name": "John Doe",
  "avatar": "https://...",
  "verified": false,
  "description": "Bio text",
  "metrics": {
    "followersCount": 1000,
    "followingCount": 500,
    "tweetCount": 5000
  }
}
```

#### `GET /api/x/user/tweets?limit=10`
Get recent tweets from authenticated user.

#### `GET /api/x/user/rate-limits`
Get current rate limit status.

### Health Check

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-22T10:30:00.000Z",
  "version": "1.0.0"
}
```

## Error Handling

All errors return a consistent JSON format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## X API Rate Limits

- **Tweet Creation**: 300 tweets per 3 hours (per user)
- **Media Upload**: 50 uploads per 24 hours
- **User Lookup**: Varies by endpoint

## Security Considerations

- Never commit `.env` file with real credentials
- Use HTTPS in production
- Implement rate limiting on the backend
- Validate all user input
- Keep dependencies up to date
- Use secure token storage on the frontend

## Project Structure

```
backend/
├── server.js                 # Express app entry point
├── package.json              # Dependencies
├── .env.example             # Environment template
├── .env                     # Your credentials (git-ignored)
├── routes/
│   ├── xAuth.js            # OAuth endpoints
│   ├── xPost.js            # Posting endpoints
│   └── xUser.js            # User endpoints
├── middleware/
│   ├── validateToken.js    # Token validation
│ OAuth callback is handled client-side using PKCE (no client secret exposed)
- Client secret is NOT required for public OAuth 2.0 apps
- Use HTTPS in production
- Implement rate limiting on the backend
- Validate all user input
- Keep dependencies up to date
- Use secure token storage on the frontend (sessionStorage)

## Deployment

### Production Environment Variables

Update `.env` for production:

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
X_REDIRECT_URI=https://yourdomain.com/auth/callback
```

### Docker Deployment

#### Build the image:
```bash
docker build -t brightmind-backend:latest .
```

#### Run the container:
```bash
docker run -d \
  -p 3001:3001 \
  --name brightmind-backend \
  --env-file .env \
  --restart unless-stopped \
  brightmind-backend:latest
``CLIENT_ID=your_production_client_id
```

> **Important:** Configure your X Developer App's OAuth 2.0 redirect URI to `https://yourdomain.com` (your frontend URL, not backend).
#### Push to registry (Docker Hub example):
```bash
docker tag brightmind-backend:latest yourusername/brightmind-backend:latest
docker push yourusername/brightmind-backend:latest
```

### Deployment Platforms

- **Railway**: Connect GitHub repo, add environment variables, or use Docker
- **Render**: Create new Web Service, use Docker or Node.js
- **Heroku**: Deploy with Docker or `git push heroku main`
- **DigitalOcean App Platform**: Connect repo and configure
- **AWS EC2/ECS**: Deploy with Docker
- **Google Cloud Run**: Deploy containerized app
- **Azure Container Instances**: Deploy Docker container

### Using PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start server.js --name brightmind-backend
pm2 save
pm2 startup
```

- Restart the server after changing `.env`
- Note: `X_CLIENT_SECRET` is no longer required

### "X API credentials not configured"
- Ensure `.env` file exists with valid `X_CLIENT_ID` and `X_CLIENT_SECRET`
- Restart the server after changing `.env`

### "CORS error"
- Check `FRONTEND_URL` in `.env` matches your frontend URL exactly
- Ensure frontend is making requests to correct backend URL

### "Invalid or expired access token"
- User needs to log in again
- Implement token refresh on the frontend

### "Rate limit exceeded"
- Wait before making more requests
- Implement request throttling on frontend
- Show user-friendly error messages

## Development

### Adding New Endpoints

1. Create route handler in appropriate file (`routes/`)
2. Use `validateToken` middleware for protected routes
3. Use `parseTwitterError` utility for consistent error handling
4. Update this README with endpoint documentation

### Testing

Test endpoints with cURL or Postman:

```bash
# Health check
curl http://localhost:3001/health

# Initialize OAuth
curl -X POST http://localhost:3001/api/x/auth/init

# Post tweet
curl -X POST http://localhost:3001/api/x/post \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello from API!"}'
```

## License

MIT

## Support

For issues or questions, please refer to the main project documentation or create an issue in the repository.

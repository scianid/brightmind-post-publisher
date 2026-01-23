require('dotenv').config();
const express = require('express');
const cors = require('cors');

const xAuthRoutes = require('./routes/xAuth');
const xPostRoutes = require('./routes/xPost');
const xUserRoutes = require('./routes/xUser');

const app = express();

// Middleware
// Allow multiple origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://publisher.brightmind-community.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(null, true); // Allow anyway for development
    }
  },
  credentials: true
}));

// Parse JSON payloads (with larger limit for base64 images)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/x', xAuthRoutes);
app.use('/api/x', xPostRoutes);
app.use('/api/x', xUserRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'BrightMind Post Publisher Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/x/auth/*',
      post: '/api/x/post',
      user: '/api/x/user'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path 
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Handle specific error types
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: err.message 
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error',
      message: err.message 
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : err.message 
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

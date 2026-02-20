const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { ensureDefaultCategory } = require('./utils/activityCategory');

const createApp = () => {
  const app = express();

  // Middleware
  app.use(helmet());
  
  // Extension bypass route (before CORS)
  app.use('/api/v1/extension', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  
  app.use(cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      /^chrome-extension:\/\/.*$/
    ],
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  ensureDefaultCategory().catch((error) => {
    console.error('Failed to ensure default activity category:', error);
  });

  // API Routes
  app.use('/api/v1', routes);

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  });

  return app;
};

module.exports = createApp;

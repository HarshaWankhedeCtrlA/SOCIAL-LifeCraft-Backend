require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const { connectDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

const postRoutes = require('./routes/posts');
const mediaRoutes = require('./routes/media');
const engagementRoutes = require('./routes/engagement');
const bookmarkRoutes = require('./routes/bookmarks');
const followRoutes = require('./routes/follow');
const feedRoutes = require('./routes/feed');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const trendingRoutes = require('./routes/trending');
const masterRoutes = require('./routes/master.routes');

const app = express();
 connectDB();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'social-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/ready', (req, res) => {
  const dbState = require('mongoose').connection.readyState;
  if (dbState === 1) {
    res.json({
      status: 'ready',
      database: 'connected'
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      database: 'disconnected'
    });
  }
});

// API Routes
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/engagement', engagementRoutes);
app.use('/api/v1/bookmarks', bookmarkRoutes);
app.use('/api/v1/follow', followRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/trending', trendingRoutes);
app.use('/api/v1', masterRoutes);

// Error handling
app.use(errorHandler);
app.use('/uploads', express.static('uploads'));  

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Social Service running on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
  console.log(`📝 Posts API: http://localhost:${PORT}/api/v1/posts`);
});

module.exports = app;
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');

const config = require('./config/env');
const logger = require('./config/logger');

// Import routes
const authRoutes = require('./routes/auth');
const questRoutes = require('./routes/quest');
const locationRoutes = require('./routes/location');
const nftRoutes = require('./routes/nft');
const gameRoutes = require('./routes/game'); // Use 'games' instead of 'game'

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.cors.frontendUrl,
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet());

// Rate limiting
app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: config.cors.frontendUrl,
  credentials: true,
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { 
    stream: { write: message => logger.info(message.trim()) } 
  }));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Socket.io for real-time updates
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/nft', nftRoutes);
app.use('/api/game', gameRoutes); // This should work now

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Treasure Hunt Backend',
    version: '1.0.0'
  });
});

// Socket connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  socket.on('join_quest', (questId) => {
    socket.join(`quest_${questId}`);
    logger.info(`User ${socket.id} joined quest ${questId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = { app, httpServer, io };
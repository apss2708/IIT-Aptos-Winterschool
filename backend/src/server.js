require('dotenv').config();
const mongoose = require('mongoose');
const { httpServer } = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.database.mongodbUri);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

const PORT = config.server.port;

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Treasure Hunt Backend server running on port ${PORT}`);
      logger.info(`📱 Environment: ${config.server.nodeEnv}`);
      logger.info(`🔗 Frontend URL: ${config.cors.frontendUrl}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Server startup error:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    mongoose.connection.close();
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

startServer();
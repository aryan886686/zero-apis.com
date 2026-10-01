const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

let mongoServer = null;

const connectDB = async () => {
  try {
    if (config.mongodbUri) {
      logger.info('Attempting to connect to MongoDB Atlas...');
      const conn = await mongoose.connect(config.mongodbUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000, // Timeout fast so we can fallback
        socketTimeoutMS: 45000,
      });
      logger.info(`MongoDB connected to Atlas: ${conn.connection.host}`);
      return conn;
    } else {
      throw new Error('MONGODB_URI is not set');
    }
  } catch (error) {
    logger.warn(`Atlas connection failed (${error.message}).`);
    
    if (config.nodeEnv === 'development') {
      logger.info('Starting In-Memory MongoDB Server fallback for local development...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        logger.info(`In-memory Server running at: ${mongoUri}`);

        const conn = await mongoose.connect(mongoUri, {
          maxPoolSize: 10,
        });
        logger.info('Connected to In-Memory MongoDB successfully!');
        return conn;
      } catch (innerError) {
        logger.error(`Failed to start in-memory MongoDB: ${innerError.message}`);
        process.exit(1);
      }
    } else {
      logger.error('Cannot fallback to in-memory DB in production mode. Exiting.');
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB error: ${err.message}`);
});

module.exports = connectDB;

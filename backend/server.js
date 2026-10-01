const logger = require('./src/utils/logger');
const config = require('./src/config/env');

const startServer = async () => {
  try {
    const app = require('./src/app');
    const connectDB = require('./src/config/database');
    const Admin = require('./src/models/Admin');
    const Api = require('./src/models/Api');

    // 1. Connect to MongoDB Atlas
    await connectDB();

    // 2. Seed default super admin if none exists
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const admin = new Admin({
        name: 'Super Admin',
        email: config.adminEmail,
        passwordHash: config.adminPassword,
        role: 'super_admin',
        status: 'active',
      });
      await admin.save();
      logger.info(`Default super admin created: ${config.adminEmail}`);
    }

    // 3. Seed default PAN API if none exist
    const apiCount = await Api.countDocuments();
    if (apiCount === 0) {
      await Api.insertMany([
        {
          name: 'Pan Info',
          description: 'Verify PAN card details',
          customEndpoint: 'pan',
          upstreamUrl: 'https://etsdatacell.com/host/api/pan.php',
          method: 'GET',
          paramName: 'q',
          status: 'active',
          rateLimit: { requestsPerDay: 10000, requestsPerMinute: 100, concurrentRequests: 50 },
          caching: { enabled: false, ttl: 0 },
          createdBy: config.adminEmail,
          totalRequests: 0,
        },
      ]);
      logger.info('Default PAN API seeded.');
    }

    // 4. Start server
    const server = app.listen(config.port, '0.0.0.0', () => {
      logger.info(`
╔══════════════════════════════════════════════════════╗
║           API Gateway Management System              ║
║══════════════════════════════════════════════════════║
║  Environment: ${config.nodeEnv.padEnd(38)}║
║  Port:        ${String(config.port).padEnd(38)}║
║  Admin:       ${config.adminEmail.padEnd(38)}║
╚══════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
      logger.error(`Unhandled Rejection: ${reason}`);
    });
  } catch (error) {
    logger.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();

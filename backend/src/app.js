const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const gatewayRoutes = require('./routes/gateway');
const statsRoutes = require('./routes/stats');

const app = express();

// Security headers – relax CSP for serving frontend
app.use(
  helmet({
    contentSecurityPolicy: false, // Frontend uses inline styles/scripts
    crossOriginEmbedderPolicy: false,
  })
);

// CORS – allow same origin on Render + localhost during dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:10000',
];
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow no-origin requests (Postman, server-to-server) and allowed list
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      // On Render the frontend is served from the same domain – always allow
      if (config.nodeEnv === 'production') return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging (only in non-test env)
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ── Public Settings (no auth) ─────────────────────────────────────────────────
const { getLoginPath } = require('./controllers/settingsController');
app.get('/api/settings/login-path', getLoginPath);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/stats', statsRoutes);
app.use('/api/v1', gatewayRoutes);

// ── Serve Built Frontend (Production / Render) ─────────────────────────────
const distPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));

// SPA fallback – all non-API routes return index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    notFoundHandler(req, res);
  }
});

// Error handling
app.use(errorHandler);

module.exports = app;

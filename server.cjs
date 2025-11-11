require('dotenv').config({ path: __dirname + '/.env' });

// Memory optimization for free hosting
process.env.NODE_OPTIONS = '--max-old-space-size=256';

// FORCE REBUILD - Quiz Routes Fix: 2025-10-29 23:15 - Trigger redeploy

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Route Imports
const authRoutes = require('./routes/authRoutes.cjs');
const googleAuthRoutes = require('./routes/googleAuth.cjs'); // Added Google Auth routes
const contentRoutes = require('./routes/contentRoutes.cjs');
const paymentRoutes = require('./routes/paymentRoutes.cjs');
const paymentSettingsRoutes = require('./routes/paymentSettingsRoutes.cjs'); // ✅ NEW
const payuRoutes = require('./routes/payuRoutes.cjs'); // ✅ PayU Gateway
const participationRoutes = require('./routes/participationRoutes.cjs'); // ✅ Participate & Win
const quizRoutes = require('./routes/quizRoutes.cjs'); // ✅ Quiz System - Separate
const initializeDatabase = require('./initialize-db.cjs'); // ✅ Auto-initialize database

const app = express();

// =======================
// ✅ CORS Middleware Setup (AGGRESSIVE - Allow all for production)
// =======================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://climax-frontend.vercel.app',
  'https://watchclimax.vercel.app',
  'https://climaxott.vercel.app',
  'https://climax-fullstack.onrender.com',
];

// 🔥 IMPORTANT: CORS MUST come BEFORE routes
app.use(
  cors({
    origin: '*', // Allow all origins for now (we control the backend)
    credentials: false, // Set to false when using '*'
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 3600,
  })
);

// 🔧 Additional explicit CORS headers for troublesome browsers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '3600');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// =======================
// ✅ MongoDB Connection (Optimized for free hosting)
// =======================
let mongoConnected = false;

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, {
    // Modern Mongoose options (v6+)
    maxPoolSize: 5, // Limit connection pool for free tiers
    serverSelectionTimeoutMS: 8000, // Fail fast if DB not reachable
    socketTimeoutMS: 45000, // Reasonable socket timeout
  })
    .then(() => {
      mongoConnected = true;
      console.log('✅ Connected to MongoDB Atlas');
      
      // Auto-initialize database with sample content if empty
      console.log('🚀 Auto-initializing database...');
      initializeDatabase().catch(err => {
        console.error('⚠️  Database initialization warning:', err.message);
        // Don't fail startup if initialization fails
      });
    })
    .catch(err => {
      mongoConnected = false;
      console.error('❌ MongoDB connection error:', err.message);
      console.error('⚠️  IMPORTANT: Add your IP to MongoDB Atlas whitelist:');
      console.error('   1. Go to: https://cloud.mongodb.com/');
      console.error('   2. Select cluster "ott"');
      console.error('   3. Network Access → IP Whitelist');
      console.error('   4. Add IP: 0.0.0.0/0 (Allow access from anywhere)');
      console.error('   5. Or add your specific IP address');
    });
} else {
  console.warn('⚠️  WARNING: MONGO_URI environment variable not set');
  console.warn('   Database features will not be available');
  console.warn('   Set MONGO_URI to enable full backend functionality');
}

// =======================
// ✅ Root Endpoint
// =======================
app.get('/', (req, res) => {
  res.json({
    message: '🎬 Climax OTT Backend - v2',
    status: 'online',
    timestamp: new Date().toISOString(),
    database: mongoConnected ? 'connected' : 'disconnected'
  });
});

// =======================
// ✅ Health Check Endpoint
// =======================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoConnected ? 'connected' : 'disconnected',
    message: mongoConnected ? 'Database connected' : 'Database disconnected - check IP whitelist'
  });
});

// =======================
// ✅ API Routes
// =======================
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);  // <-- Add Google auth routes here
app.use('/api/contents', contentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-settings', paymentSettingsRoutes); // ✅ NEW
app.use('/api/payu', payuRoutes); // ✅ PayU Gateway
app.use('/api/participation', participationRoutes); // ✅ Participate & Win
app.use('/api/quiz', quizRoutes); // ✅ Quiz System - Completely Separate
console.log('✅ Quiz routes registered at /api/quiz');

// CDN-optimized video endpoint for super fast delivery
app.get('/api/video/:id', async (req, res) => {
  try {
    const Content = require('./models/Content.cjs');
    const { optimizeVideoUrl } = require('./utils/cdnHelper.cjs');
    
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    // Get CDN-optimized URL
    const optimizedUrl = optimizeVideoUrl(content.videoUrl);
    
    // Set aggressive caching headers for CDN
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
      'Content-Type': 'video/mp4',
      'X-CDN-Optimized': 'true'
    });
    
    // Redirect to CDN URL for super fast delivery
    res.redirect(301, optimizedUrl);
  } catch (error) {
    console.error('Video CDN error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// =======================
// ✅ Start Server (only if run directly, not when imported)
// =======================
const PORT = process.env.PORT || 5000;

// Only start server if this file is run directly (not imported by server.js)
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📛 SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('📛 SIGINT received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });
} else {
  // When imported by server.js, just log success
  console.log('✅ Backend module loaded successfully, exporting Express app');
}

// Export the Express app for use by server.js
module.exports = app;

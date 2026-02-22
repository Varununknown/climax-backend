require('dotenv').config({ path: __dirname + '/.env' });

// Memory optimization for free hosting
process.env.NODE_OPTIONS = '--max-old-space-size=256';

// FORCE REBUILD - Instamojo API FIXED with correct headers: 2025-11-19 22:15 - MUST DEPLOY NOW

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Route Imports
const authRoutes = require('./routes/authRoutes.cjs');
const googleAuthRoutes = require('./routes/googleAuth.cjs'); // Added Google Auth routes
const contentRoutes = require('./routes/contentRoutes.cjs');
const paymentRoutes = require('./routes/paymentRoutes.cjs');
const paymentSettingsRoutes = require('./routes/paymentSettingsRoutes.cjs'); // ✅ NEW
const phonepeRoutes = require('./routes/phonepeRoutes.cjs'); // ✅ PhonePe Gateway
const upiRoutes = require('./routes/upiRoutes.cjs'); // ✅ UPI Deep Link Gateway
const cashfreeRoutes = require('../routes/cashfreeRoutes.cjs'); // ✅ Cashfree Gateway
// const instamojoRoutes = require('./routes/instamojo.cjs'); // ✅ Instamojo Gateway - USING INLINE ROUTES
const bannerRoutes = require('./routes/bannerRoutes.cjs'); // ✅ NEW - Banners/Ads
const exploreRoutes = require('./routes/exploreRoutes.cjs'); // ✅ NEW - Explore Section Items
const participationRoutes = require('./routes/participationRoutes.cjs'); // ✅ Participate & Win
const quizRoutes = require('./routes/quizRoutes.cjs'); // ✅ Quiz System - Separate
const settingsRoutes = require('./routes/settingsRoutes.cjs'); // ✅ Settings Management
let razorpayRoutes = null;
try {
  razorpayRoutes = require('./routes/razorpayRoutes.cjs'); // ✅ Razorpay Payment Gateway
} catch (err) {
  console.warn('⚠️  Razorpay routes not available:', err.message);
}
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
// ✅ MongoDB Connection (Optimized with AGGRESSIVE RETRY LOGIC)
// =======================
let mongoConnected = false;

async function connectToMongoDB(attempt = 1, maxAttempts = 5) {
  try {
    console.log(`\n🔌 MongoDB Connection Attempt ${attempt}/${maxAttempts}...`);
    
    await mongoose.connect(process.env.MONGO_URI, {
      // Modern Mongoose options (v6+)
      maxPoolSize: 10, // Increased for better concurrency
      serverSelectionTimeoutMS: 10000, // Give more time for first connection
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
    });

    mongoConnected = true;
    console.log('✅ Connected to MongoDB Atlas - READY FOR ACTION!');
    
    // Auto-initialize database with sample content if empty
    console.log('🚀 Auto-initializing database with content...');
    initializeDatabase().catch(err => {
      console.error('⚠️  Database initialization warning:', err.message);
    });

    return true;
  } catch (err) {
    console.error(`❌ Connection attempt ${attempt} failed:`, err.message);
    
    if (attempt < maxAttempts) {
      const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff
      console.log(`⏳ Retrying in ${waitTime / 1000} seconds... (${attempt}/${maxAttempts})`);
      console.log('💡 Waiting for MongoDB Atlas to be ready...\n');
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return connectToMongoDB(attempt + 1, maxAttempts);
    } else {
      mongoConnected = false;
      console.error('\n❌ CRITICAL: Failed to connect to MongoDB after 5 attempts');
      console.error('⚠️  Your app will work for API requests but NO database features');
      console.error('\n🔧 Fix this by:');
      console.error('   1. Go to: https://cloud.mongodb.com/');
      console.error('   2. Select cluster "ott"');
      console.error('   3. Network Access → IP Whitelist');
      console.error('   4. Add your IP: 0.0.0.0/0 (Allow all)');
      console.error('   5. Wait 2-3 minutes for change to apply');
      console.error('   6. Restart this backend server\n');
      return false;
    }
  }
}

// Start MongoDB connection with retries
if (process.env.MONGO_URI) {
  connectToMongoDB().catch(err => {
    console.error('❌ Fatal MongoDB connection error:', err.message);
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
    message: mongoConnected ? 'Database connected' : 'Database disconnected - check IP whitelist',
    environment: process.env.NODE_ENV || 'development',
    version: 'v2-instamojo-fixed-nov19-2225',
    timestamp: new Date().toISOString(),
    routes: {
      auth: 'active',
      google: 'active',
      payments: 'active',
      cashfree: 'active'
    },
    envVars: {
      cashfree_configured: !!process.env.CASHFREE_CLIENT_ID && !!process.env.CASHFREE_SECRET_KEY,
      jwt_secret: !!process.env.JWT_SECRET,
      mongo_uri: process.env.MONGO_URI ? 'configured' : 'missing',
      frontend_url: process.env.FRONTEND_URL || 'not set'
    }
  });
});

app.get('/api/diagnostics', (req, res) => {
  res.json({
    status: 'diagnostic',
    mongo: mongoConnected,
    environment: {
      node_env: process.env.NODE_ENV,
      port: process.env.PORT,
      has_mongo_uri: !!process.env.MONGO_URI,
      has_jwt_secret: !!process.env.JWT_SECRET,
      has_cashfree_config: !!process.env.CASHFREE_CLIENT_ID,
      has_google_config: !!process.env.GOOGLE_CLIENT_ID
    },
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    uptime: process.uptime() + ' seconds',
    timestamp: new Date().toISOString()
  });
});

// =======================
// ✅ Root Endpoint
// =======================
app.get('/api', (req, res) => {
  res.json({
    message: 'Climax OTT Backend API',
    version: '2.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      diagnostics: '/api/diagnostics',
      auth: '/api/auth',
      contents: '/api/contents',
      payments: '/api/payments',
      cashfree: '/api/cashfree'
    }
  });
});

// =======================
// ✅ API Routes
// =======================
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);  // <-- Add Google auth routes here
app.use('/api/banners', bannerRoutes); // ✅ BANNER/ADS MANAGEMENT
app.use('/api/contents', contentRoutes);
app.use('/api/payment-settings', paymentSettingsRoutes); // ✅ Payment Settings
app.use('/api/payments', upiRoutes); // ✅ UPI Deep Link Gateway - Register FIRST
app.use('/api/payments', paymentRoutes); // ✅ QR Code Payment Routes - Register SECOND
app.use('/api/phonepe', phonepeRoutes); // ✅ PhonePe Gateway
app.use('/api/cashfree', cashfreeRoutes); // ✅ Cashfree Gateway
// app.use('/api/instamojo', instamojoRoutes); // ✅ Instamojo Gateway - USING INLINE ROUTES
app.use('/api/participation', participationRoutes); // ✅ Participate & Win
app.use('/api/quiz', quizRoutes); // ✅ Quiz System - Completely Separate
app.use('/api/settings', settingsRoutes); // ✅ Settings Management
if (razorpayRoutes) {
  app.use('/api/razorpay', razorpayRoutes); // ✅ Razorpay Payment Gateway
}
console.log('✅ Quiz routes registered at /api/quiz');
console.log('✅ Settings routes registered at /api/settings');

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

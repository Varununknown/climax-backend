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
// const instamojoRoutes = require('./routes/instamojo.cjs'); // ✅ Instamojo Gateway - USING INLINE ROUTES
const bannerRoutes = require('./routes/bannerRoutes.cjs'); // ✅ NEW - Banners/Ads
const exploreRoutes = require('./routes/exploreRoutes.cjs'); // ✅ NEW - Explore Section Items
const participationRoutes = require('./routes/participationRoutes.cjs'); // ✅ Participate & Win
const quizRoutes = require('./routes/quizRoutes.cjs'); // ✅ Quiz System - Separate
const settingsRoutes = require('./routes/settingsRoutes.cjs'); // ✅ Settings Management
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
    instamojo_route_loaded: typeof instamojoRoutes !== 'undefined' ? 'YES' : 'NO',
    version: 'v2-instamojo-fixed-nov19-2225'
  });
});

// =======================
// ✅ API Routes
// =======================
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);  // <-- Add Google auth routes here
app.use('/api/banners', bannerRoutes); // ✅ BANNER/ADS MANAGEMENT
app.use('/api/contents', contentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-settings', paymentSettingsRoutes); // ✅ NEW
app.use('/api/phonepe', phonepeRoutes); // ✅ PhonePe Gateway
// app.use('/api/instamojo', instamojoRoutes); // ✅ Instamojo Gateway - USING INLINE ROUTES
app.use('/api/participation', participationRoutes); // ✅ Participate & Win
app.use('/api/quiz', quizRoutes); // ✅ Quiz System - Completely Separate
app.use('/api/settings', settingsRoutes); // ✅ Settings Management
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
// ✅ INLINE INSTAMOJO ROUTES
// =======================
console.log('⚡ Setting up INLINE Instamojo routes...');

const axios = require('axios');
const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY || '';
const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN || '';
const INSTAMOJO_SALT = process.env.INSTAMOJO_SALT || '';
const INSTAMOJO_API_URL = 'https://www.instamojo.com/api/1.1/';

const instamojoAPI = axios.create({
  baseURL: INSTAMOJO_API_URL,
  headers: {
    'X-Api-Key': INSTAMOJO_API_KEY,
    'X-Auth-Token': INSTAMOJO_AUTH_TOKEN,
  },
  timeout: 30000,
});

console.log('🔐 Instamojo Inline - API Key:', INSTAMOJO_API_KEY ? '✅' : '❌');
console.log('🔐 Instamojo Inline - Auth Token:', INSTAMOJO_AUTH_TOKEN ? '✅' : '❌');

// POST /api/instamojo/create
app.post('/api/instamojo/create', async (req, res) => {
  try {
    const { userId, contentId, amount, purpose } = req.body;
    console.log('📡 Instamojo CREATE endpoint hit - userId:', userId, 'contentId:', contentId);

    if (!userId || !contentId || !amount) {
      return res.status(400).json({ error: 'Missing required fields: userId, contentId, amount' });
    }

    const User = require('./models/User.cjs');
    const Content = require('./models/Content.cjs');
    const Payment = require('./models/Payment.cjs');

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify content exists
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const amountInRupees = (amount / 100).toFixed(2);

    const paymentRequestData = {
      purpose: purpose || `Payment for ${content.title}`,
      amount: amountInRupees,
      buyer_name: user.name || 'Customer',
      email: user.email || 'user@climax.app',
      phone: user.phone || '9000000000',
      redirect_url: `${process.env.FRONTEND_URL || 'https://climaxott.vercel.app'}/payment/success`,
      send_email: false,
      send_sms: false,
      webhook: `${process.env.BACKEND_URL || 'https://climax-fullstack.onrender.com'}/api/instamojo/webhook`,
    };

    console.log('📡 Sending to Instamojo API:', paymentRequestData);

    const response = await instamojoAPI.post('payment-requests/', paymentRequestData);
    const paymentRequest = response.data.payment_request;

    const payment = new Payment({
      userId,
      contentId,
      amount,
      status: 'pending',
      gateway: 'instamojo',
      transactionId: paymentRequest.id,
      paymentUrl: paymentRequest.longurl,
    });

    await payment.save();
    console.log('✅ Instamojo payment created:', paymentRequest.id);

    res.json({
      success: true,
      paymentUrl: paymentRequest.longurl,
      transactionId: paymentRequest.id,
      message: 'Payment request created successfully',
    });
  } catch (error) {
    console.error('❌ Instamojo CREATE error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to create payment request',
      details: error.response?.data?.message || error.message,
    });
  }
});

// GET /api/instamojo/status/:transactionId
app.get('/api/instamojo/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    console.log('🔍 Instamojo STATUS check:', transactionId);

    const response = await instamojoAPI.get(`payment-requests/${transactionId}/`);
    const paymentRequest = response.data.payment_request;

    res.json({
      status: paymentRequest.status,
      amount: paymentRequest.amount,
      purpose: paymentRequest.purpose,
      email: paymentRequest.email,
    });
  } catch (error) {
    console.error('❌ Instamojo STATUS error:', error.message);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// POST /api/instamojo/webhook
app.post('/api/instamojo/webhook', async (req, res) => {
  try {
    const { payment_request_id, status } = req.body;
    console.log('🔔 Instamojo WEBHOOK received:', payment_request_id, status);

    const Payment = require('./models/Payment.cjs');
    const User = require('./models/User.cjs');

    const payment = await Payment.findOne({ transactionId: payment_request_id });

    if (!payment) {
      console.warn('⚠️ Payment not found:', payment_request_id);
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (status === 'completed') {
      payment.status = 'success';
      await payment.save();

      const user = await User.findById(payment.userId);
      if (user) {
        if (!user.purchasedContent) {
          user.purchasedContent = [];
        }
        if (!user.purchasedContent.includes(payment.contentId)) {
          user.purchasedContent.push(payment.contentId);
          await user.save();
        }
      }

      console.log('✅ Instamojo payment confirmed');
    } else {
      payment.status = 'failed';
      await payment.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Instamojo WEBHOOK error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /api/instamojo/verify
app.post('/api/instamojo/verify', async (req, res) => {
  try {
    const { transactionId, userId, contentId } = req.body;
    console.log('🔍 Instamojo VERIFY:', transactionId);

    const Payment = require('./models/Payment.cjs');
    const User = require('./models/User.cjs');

    const payment = await Payment.findOne({
      transactionId,
      userId,
      contentId,
      status: 'success',
    });

    if (payment) {
      return res.json({ verified: true, message: 'Payment verified' });
    }

    const response = await instamojoAPI.get(`payment-requests/${transactionId}/`);
    const paymentRequest = response.data.payment_request;

    if (paymentRequest.status === 'completed') {
      const dbPayment = await Payment.findOne({ transactionId });
      if (dbPayment) {
        dbPayment.status = 'success';
        await dbPayment.save();

        const user = await User.findById(userId);
        if (user && !user.purchasedContent?.includes(contentId)) {
          user.purchasedContent = user.purchasedContent || [];
          user.purchasedContent.push(contentId);
          await user.save();
        }
      }

      return res.json({ verified: true, message: 'Payment verified' });
    }

    res.json({ verified: false, message: 'Payment not completed' });
  } catch (error) {
    console.error('❌ Instamojo VERIFY error:', error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

console.log('✅ INLINE Instamojo routes registered: /api/instamojo/*');

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

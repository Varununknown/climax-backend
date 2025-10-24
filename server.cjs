require('dotenv').config({ path: __dirname + '/.env' });

// Memory optimization for free hosting
process.env.NODE_OPTIONS = '--max-old-space-size=256';

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Route Imports
const authRoutes = require('./routes/authRoutes.cjs');
const googleAuthRoutes = require('./routes/googleAuth.cjs'); // Added Google Auth routes
const contentRoutes = require('./routes/contentRoutes.cjs');
const paymentRoutes = require('./routes/paymentRoutes.cjs');
const paymentSettingsRoutes = require('./routes/paymentSettingsRoutes.cjs'); // ✅ NEW

const app = express();

// =======================
// ✅ CORS Middleware Setup
// =======================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://climax-frontend.vercel.app',
  'https://watchclimax.vercel.app',
  'https://climaxott.vercel.app',
  'https://climax-fullstack.onrender.com',
  // Allow any Vercel deployment
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow no origin (mobile apps, curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Allow specific origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow any Vercel subdomain
      if (origin.includes('vercel.app')) {
        return callback(null, true);
      }
      
      // Allow any render subdomain
      if (origin.includes('onrender.com')) {
        return callback(null, true);
      }
      
      // Allow localhost variants
      if (origin.includes('localhost')) {
        return callback(null, true);
      }
      
      // Reject others
      console.warn(`❌ CORS blocked: ${origin}`);
      callback(new Error('CORS Not Allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

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
    message: '🎬 Climax OTT Backend',
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
// ✅ Start Server
// =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
});

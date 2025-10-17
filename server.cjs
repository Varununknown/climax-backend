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
  'https://climax-frontend.vercel.app',
  'https://watchclimax.vercel.app', // ✅ new domain
  'https://climaxott.vercel.app', // ✅ current domain
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS Not Allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // ✅ Added PATCH method
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// =======================
// ✅ MongoDB Connection (Optimized for free hosting)
// =======================
mongoose.connect(process.env.MONGO_URI, {
  // Modern Mongoose options (v6+)
  maxPoolSize: 5, // Limit connection pool for free tiers
  serverSelectionTimeoutMS: 8000, // Fail fast if DB not reachable
  socketTimeoutMS: 45000, // Reasonable socket timeout
})
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
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

// Test route to verify server is working
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

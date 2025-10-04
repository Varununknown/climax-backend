require('dotenv').config();

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
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// =======================
// ✅ MongoDB Connection (Optimized for free hosting)
// =======================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 5, // Limit connection pool
  bufferMaxEntries: 0 // Disable buffering
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

// Video proxy endpoint for better loading performance
app.get('/api/video/:id', async (req, res) => {
  try {
    const Content = require('./models/Content.cjs');
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    // Set caching headers for better performance
    res.set({
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'video/mp4'
    });
    
    // Redirect to the video URL with caching
    res.redirect(301, content.videoUrl);
  } catch (error) {
    console.error('Video proxy error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// =======================
// ✅ Start Server
// =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running`);
});

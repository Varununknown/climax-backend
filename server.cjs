require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Route Imports
const authRoutes = require('./routes/authRoutes.cjs');
const contentRoutes = require('./routes/contentRoutes.cjs');
const paymentRoutes = require('./routes/paymentRoutes.cjs');
const paymentSettingsRoutes = require('./routes/paymentSettingsRoutes.cjs'); // ✅ NEW

const app = express();

// =======================
// ✅ Middleware
// =======================
app.use(cors());
app.use(express.json());

// =======================
// ✅ MongoDB Connection
// =======================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
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
app.use('/api/contents', contentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-settings', paymentSettingsRoutes); // ✅ NEW

// =======================
// ✅ Start Server
// =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

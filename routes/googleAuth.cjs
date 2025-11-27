const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User.cjs'); // adjust path as needed

const router = express.Router();

// Helper function to handle Google authentication
const handleGoogleAuth = async (code) => {
  console.log('🔐 handleGoogleAuth - Starting token exchange...');
  console.log('📋 Using GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ NOT SET');
  console.log('📋 Using GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ NOT SET');
  console.log('📋 Using GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
  
  // Create client fresh each time to ensure env vars are loaded
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  // Exchange code for tokens
  const { tokens } = await client.getToken(code);
  console.log('✅ Got tokens from Google');
  
  client.setCredentials(tokens);

  // Get user info from Google
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  console.log('✅ Verified ID token');

  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = payload;
  console.log('👤 Google user:', email);

  // Extract username from email (part before @)
  const username = email.split('@')[0];

  // Find or create user in your DB
  let user = await User.findOne({ email });
  console.log('📦 User from DB:', user ? 'Found' : 'Not found');

  if (!user) {
    console.log('➕ Creating new user:', email);
    user = new User({
      name: name || username,
      email,
      password: '', // OAuth users have no password here
      role: 'user',
      googleId,
      profileImage: picture || '',
    });
    await user.save();
    console.log('✅ New user saved:', email);
  } else if (!user.googleId) {
    // If user exists but doesn't have googleId, add it
    console.log('🔗 Linking Google ID to existing user:', email);
    user.googleId = googleId;
    await user.save();
  }

  // Create JWT token for your app
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  console.log('🎟️ JWT token created');

  return { token, user: { id: user._id, name: user.name, email: user.email, role: user.role, premium: user.premium } };
};

// GET endpoint for OAuth redirect (original flow)
router.get('/google/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  try {
    const { token } = await handleGoogleAuth(code);
    // Redirect to frontend with token
    return res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});

// Helper function to get user info from access_token (for implicit flow)
const handleGoogleAuthImplicit = async (accessToken) => {
  console.log('🔐 handleGoogleAuthImplicit - Verifying access token...');
  
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  client.setCredentials({ access_token: accessToken });

  // Get user info from Google using access token
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error('Failed to get user info from Google');
  }

  const userInfo = await response.json();
  const { id: googleId, email, name, picture } = userInfo;
  console.log('👤 Google user (implicit):', email);

  // Extract username from email (part before @)
  const username = email.split('@')[0];

  // Find or create user in your DB
  let user = await User.findOne({ email });
  console.log('📦 User from DB:', user ? 'Found' : 'Not found');

  if (!user) {
    console.log('➕ Creating new user:', email);
    user = new User({
      name: name || username,
      email,
      password: '', // OAuth users have no password here
      role: 'user',
      googleId,
      profileImage: picture || '',
    });
    await user.save();
    console.log('✅ New user saved:', email);
  } else if (!user.googleId) {
    // If user exists but doesn't have googleId, add it
    console.log('🔗 Linking Google ID to existing user:', email);
    user.googleId = googleId;
    await user.save();
  }

  // Create JWT token for your app
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  console.log('🎟️ JWT token created');

  return { token, user: { id: user._id, name: user.name, email: user.email, role: user.role, premium: user.premium } };
};

// POST endpoint for frontend AJAX calls (supports both auth-code and implicit flows)
router.post('/google/signin', async (req, res) => {
  // 🔧 Explicit CORS headers for this endpoint
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  const { code, access_token } = req.body;

  if (!code && !access_token) {
    console.error('❌ No authorization code or access token provided');
    return res.status(400).json({ error: 'Authorization code or access token required' });
  }

  try {
    let result;
    
    if (code) {
      // Auth-code flow (browser)
      console.log('🔍 Google OAuth attempt with code (browser):', code.substring(0, 20) + '...');
      result = await handleGoogleAuth(code);
    } else if (access_token) {
      // Implicit flow (Median app)
      console.log('🔍 Google OAuth attempt with access_token (Median)...');
      result = await handleGoogleAuthImplicit(access_token);
    }

    const { token, user } = result;
    console.log('✅ Google auth success for:', user.email);
    return res.json({ token, user });
  } catch (err) {
    console.error('❌ Google auth error:', err.message);
    console.error('Full error:', err);
    return res.status(500).json({ 
      error: 'Failed to authenticate with Google',
      details: err.message 
    });
  }
});

module.exports = router;

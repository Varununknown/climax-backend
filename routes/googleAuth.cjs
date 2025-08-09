const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User.cjs'); // adjust path as needed

const router = express.Router();

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

router.get('/google/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  try {
    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Find or create user in your DB
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        password: '', // OAuth users have no password here
        role: 'user',
        googleId,
      });
      await user.save();
    }

    // Create JWT token for your app
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Redirect to frontend with token
    return res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);

  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});

module.exports = router;

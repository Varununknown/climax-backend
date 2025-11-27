const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.cjs');

/* ----------  REGISTER  ---------- */
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  console.log('▶️ Register attempt:', { name, email, role });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('⛔ User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Enforce only this email can be admin
    let finalRole = 'user';
    if (role === 'admin' && email === 'admin@example.com') {
      finalRole = 'admin';
    }

    console.log('✅ Final role to assign:', finalRole);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: finalRole
    });

    await newUser.save();

    console.log('✅ User created:', email, 'Role:', finalRole);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('❌ Registration error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ----------  LOGIN  ---------- */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    console.log('👤 User from DB:', user);
    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ----------  GET CURRENT USER  ---------- */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        premium: user.premium,
        googleId: user.googleId,
        profileImage: user.profileImage
      }
    });
  } catch (err) {
    console.error('❌ Get user error:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
});

/* ----------  GET ALL USERS (ADMIN ONLY)  ---------- */
router.get('/admin/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await User.findById(decoded.id);

    // Check if user is admin
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    
    // Format user data for admin panel
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      subscription: user.premium ? 'premium' : 'free',
      joinDate: user.createdAt.toISOString().split('T')[0],
      lastActive: user.lastLogin || user.createdAt.toISOString().split('T')[0],
      totalSpent: 0, // Can be calculated from payment records if needed
      contentWatched: 0, // Can be calculated from watch history if needed
      status: 'active',
      role: user.role,
      googleId: user.googleId
    }));

    res.json({ success: true, users: formattedUsers });
  } catch (err) {
    console.error('❌ Get users error:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
});

/* ----------  DELETE USER (ADMIN ONLY)  ---------- */
router.delete('/admin/users/:userId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await User.findById(decoded.id);

    // Check if user is admin
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Prevent admin from deleting themselves
    if (decoded.id === req.params.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User deleted:', user.email);
    res.json({ success: true, message: `User ${user.name} has been deleted` });
  } catch (err) {
    console.error('❌ Delete user error:', err.message);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

/* ----------  DELETE ALL USERS (ADMIN ONLY) - DANGEROUS  ---------- */
router.delete('/admin/users-all/delete-all', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await User.findById(decoded.id);

    // Check if user is admin
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Require confirmation token
    const confirmationToken = req.headers['x-confirm-delete'];
    if (confirmationToken !== 'DELETE_ALL_USERS_CONFIRMED') {
      return res.status(400).json({ message: 'Deletion not confirmed. Send header X-Confirm-Delete: DELETE_ALL_USERS_CONFIRMED' });
    }

    const result = await User.deleteMany({});
    
    console.log('⚠️ WARNING: All users deleted. Count:', result.deletedCount);
    res.json({ success: true, message: `${result.deletedCount} users have been deleted`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('❌ Delete all users error:', err.message);
    res.status(500).json({ message: 'Error deleting users' });
  }
});

module.exports = router;

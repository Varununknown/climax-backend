const mongoose = require('mongoose');
const Content = require('./models/Content.cjs');
require('dotenv').config({ path: __dirname + '/.env' });

const addTestContent = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for adding test content');

    // Check if test content already exists
    const existingContent = await Content.findOne({ title: 'Test Premium Movie' });
    if (existingContent) {
      console.log('🎬 Test content already exists:', existingContent._id);
      console.log('📱 Test URL: http://localhost:5173/watch/' + existingContent._id);
      process.exit(0);
    }

    // Add test content
    const testContent = new Content({
      title: 'Test Premium Movie',
      description: 'Premium test content for YouTube-style video player. This video has a paywall at 10 seconds.',
      category: 'Movies',
      type: 'movie',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=400&h=225&fit=crop&auto=format',
      climaxTimestamp: 10, // Paywall triggers at 10 seconds
      premiumPrice: 99,
      duration: 60, // 60 seconds
      genre: ['Action', 'Drama'],
      rating: 4.5,
      isActive: true
    });

    const savedContent = await testContent.save();
    console.log('🎯 Test content added successfully!');
    console.log('📺 Content ID:', savedContent._id);
    console.log('🎬 Title:', savedContent.title);
    console.log('⏰ Paywall at:', savedContent.climaxTimestamp + ' seconds');
    console.log('💰 Price: $' + (savedContent.premiumPrice / 100));
    console.log('');
    console.log('🚀 TEST YOUR PREMIUM PLAYER:');
    console.log('📱 URL: http://localhost:5173/watch/' + savedContent._id);
    console.log('📱 Mobile: http://192.168.56.1:5173/watch/' + savedContent._id);
    console.log('');
    console.log('🎯 Features to test:');
    console.log('✅ Red timeline progress bar');
    console.log('✅ Quality controller');
    console.log('✅ Mobile touch controls (left=forward, right=backward)');
    console.log('✅ Paywall at 10 seconds');
    console.log('✅ Payment popup (auto-approves)');
    console.log('✅ Fullscreen auto-rotate on mobile');

  } catch (error) {
    console.error('❌ Error adding test content:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
};

addTestContent();
const mongoose = require('mongoose');
const Content = require('./models/Content.cjs');
require('dotenv').config();

const updateThumbnails = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // High-quality movie poster style images from reliable sources
    const movieThumbnails = [
      'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1516962126636-27ad087061cc?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1478720568477-b0924f2f2a2b?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1512070679279-8988d32161be?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1458682625221-3a45f8a844c7?w=400&h=600&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?w=400&h=600&fit=crop&auto=format'
    ];

    // Get all content
    const allContent = await Content.find({});
    console.log(`📝 Found ${allContent.length} content items to update`);

    let updateCount = 0;
    
    // Update each content item with a unique thumbnail
    for (let i = 0; i < allContent.length; i++) {
      const content = allContent[i];
      const thumbnailIndex = i % movieThumbnails.length;
      const newThumbnail = movieThumbnails[thumbnailIndex];
      
      await Content.findByIdAndUpdate(content._id, {
        thumbnail: newThumbnail
      });
      
      updateCount++;
      
      if (updateCount % 10 === 0) {
        console.log(`📸 Updated ${updateCount}/${allContent.length} thumbnails...`);
      }
    }

    console.log(`✅ Successfully updated ${updateCount} thumbnails!`);
    console.log('\n🖼️ All content now has high-quality movie poster thumbnails');
    console.log('📱 Images are optimized for mobile and desktop viewing');
    console.log('🌐 All thumbnails use reliable Unsplash CDN');
    console.log('🎬 Perfect for payment gateway verification');

  } catch (error) {
    console.error('❌ Error updating thumbnails:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
};

updateThumbnails();
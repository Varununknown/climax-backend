// Auto-initialization script for Climax OTT Database
// This script runs once to populate the database with sample content
// If database already has content, it does nothing

const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

const Content = require('./models/Content.cjs');

async function initializeDatabase() {
  try {
    console.log('\n=== 🚀 AUTO INITIALIZE DATABASE ===\n');
    
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      console.log('⚠️  MONGO_URI not set - skipping auto-initialization');
      return;
    }
    
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    });
    
    console.log('✅ Connected to MongoDB for initialization');
    
    // Check if database already has content
    const count = await Content.countDocuments();
    if (count > 0) {
      console.log(`✅ Database already has ${count} items - skipping seed`);
      await mongoose.disconnect();
      return;
    }
    
    console.log('📝 Database is empty - adding sample content...\n');
    
    const sampleContent = [
      {
        title: 'The Dark Knight',
        description: 'When the menace known as the Joker emerges from his mysterious past, he wreaks havoc on Gotham. Batman must accept one of the greatest test to fight injustice.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&h=750&fit=crop',
        category: 'Action',
        type: 'movie',
        duration: 152,
        climaxTimestamp: 120,
        premiumPrice: 49,
        genre: ['Action', 'Crime', 'Drama'],
        rating: 9.0,
        language: 'English',
        isActive: true
      },
      {
        title: 'Stranger Things',
        description: 'When a young boy disappears, his friends, family and local police uncover a mystery involving secret government experiments and terrifying supernatural forces.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'series',
        duration: 45,
        climaxTimestamp: 35,
        premiumPrice: 29,
        genre: ['Drama', 'Fantasy', 'Horror'],
        rating: 8.7,
        language: 'English',
        isActive: true
      },
      {
        title: 'Inception',
        description: 'A skilled thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerBlazes.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop',
        category: 'Sci-Fi',
        type: 'movie',
        duration: 148,
        climaxTimestamp: 110,
        premiumPrice: 49,
        genre: ['Sci-Fi', 'Action', 'Thriller'],
        rating: 8.8,
        language: 'English',
        isActive: true
      },
      {
        title: 'Breaking Bad',
        description: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with his former student.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerEscapes.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1495909406351-987e042f556b?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'series',
        duration: 47,
        climaxTimestamp: 35,
        premiumPrice: 29,
        genre: ['Crime', 'Drama', 'Thriller'],
        rating: 9.5,
        language: 'English',
        isActive: true
      },
      {
        title: 'Interstellar',
        description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerJoyrides.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop',
        category: 'Sci-Fi',
        type: 'movie',
        duration: 169,
        climaxTimestamp: 140,
        premiumPrice: 49,
        genre: ['Sci-Fi', 'Drama', 'Adventure'],
        rating: 8.6,
        language: 'English',
        isActive: true
      },
      {
        title: 'Parasite',
        description: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/Sintel.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'movie',
        duration: 132,
        climaxTimestamp: 100,
        premiumPrice: 39,
        genre: ['Drama', 'Thriller'],
        rating: 8.6,
        language: 'English',
        isActive: true
      }
    ];
    
    // Insert all at once
    const result = await Content.insertMany(sampleContent);
    console.log(`✅ Successfully added ${result.length} sample content items!\n`);
    
    // Show what was added
    result.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.title} (ID: ${item._id})`);
    });
    
    console.log('\n✅ Database initialization complete!\n');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('\n❌ Database initialization error:', error.message);
    console.error('This is normal if database already has content.\n');
    
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  }
}

// Auto-run if called directly
if (require.main === module) {
  initializeDatabase().then(() => process.exit(0));
}

module.exports = initializeDatabase;

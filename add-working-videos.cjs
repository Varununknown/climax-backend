const mongoose = require('mongoose');
const Content = require('./models/Content.cjs');
require('dotenv').config();

const addWorkingVideoContent = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Add content with working video URLs from reliable sources
    const workingContent = [
      // Big Buck Bunny - Open source movie
      {
        title: 'Big Buck Bunny',
        description: 'A fun and heartwarming 3D animated short film about a large, lovable rabbit dealing with three bullying rodents.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=750&fit=crop',
        category: 'Comedy',
        type: 'movie',
        duration: 596, // 9:56 minutes
        climaxTimestamp: 400, // 6:40 into the video
        premiumPrice: 19,
        genre: ['Comedy', 'Animation', 'Family'],
        rating: 8.2,
        language: 'English',
        isActive: true
      },
      
      // Elephant Dream - Open source sci-fi
      {
        title: 'Elephants Dream',
        description: 'A surreal journey through a mechanical world, exploring the relationship between two characters in a dream-like environment.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop',
        category: 'Sci-Fi',
        type: 'movie',
        duration: 654, // 10:54 minutes
        climaxTimestamp: 500, // 8:20 into the video
        premiumPrice: 29,
        genre: ['Sci-Fi', 'Animation', 'Fantasy'],
        rating: 7.8,
        language: 'English',
        isActive: true
      },

      // Sintel - Open source fantasy/action
      {
        title: 'Sintel',
        description: 'A lone traveler seeks to rescue her friend and pet dragon from an adult dragon. A touching story of friendship and adventure.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/Sintel.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=750&fit=crop',
        category: 'Action',
        type: 'movie',
        duration: 888, // 14:48 minutes
        climaxTimestamp: 600, // 10:00 into the video
        premiumPrice: 39,
        genre: ['Action', 'Adventure', 'Animation'],
        rating: 8.5,
        language: 'English',
        isActive: true
      },

      // Tears of Steel - Open source sci-fi/action
      {
        title: 'Tears of Steel',
        description: 'In the future, a small group of rebels wage war against the evil Empire, using advanced technology and robot warriors.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/TearsOfSteel.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&h=750&fit=crop',
        category: 'Action',
        type: 'movie',
        duration: 734, // 12:14 minutes
        climaxTimestamp: 500, // 8:20 into the video
        premiumPrice: 49,
        genre: ['Action', 'Sci-Fi', 'Thriller'],
        rating: 8.0,
        language: 'English',
        isActive: true
      },

      // For Bigger Blazes - Sample content
      {
        title: 'For Bigger Blazes',
        description: 'An intense drama about firefighters risking their lives to save others in dangerous situations.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerBlazes.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'movie',
        duration: 15, // 15 seconds sample
        climaxTimestamp: 10,
        premiumPrice: 25,
        genre: ['Drama', 'Action'],
        rating: 7.5,
        language: 'English',
        isActive: true
      },

      // For Bigger Escapes - Thriller
      {
        title: 'For Bigger Escapes',
        description: 'A thrilling escape story where the protagonist must use wit and courage to break free from captivity.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerEscapes.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=750&fit=crop',
        category: 'Thriller',
        type: 'movie',
        duration: 15, // 15 seconds sample
        climaxTimestamp: 10,
        premiumPrice: 35,
        genre: ['Thriller', 'Suspense'],
        rating: 8.1,
        language: 'English',
        isActive: true
      },

      // For Bigger Fun - Comedy
      {
        title: 'For Bigger Fun',
        description: 'A hilarious comedy that will keep you laughing from start to finish with its witty humor and great characters.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerFun.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=500&h=750&fit=crop',
        category: 'Comedy',
        type: 'movie',
        duration: 15, // 15 seconds sample
        climaxTimestamp: 10,
        premiumPrice: 20,
        genre: ['Comedy', 'Entertainment'],
        rating: 7.8,
        language: 'English',
        isActive: true
      },

      // Romance content
      {
        title: 'For Bigger Joyrides',
        description: 'A romantic adventure about two people who find love during an unexpected road trip across the country.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerJoyrides.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1516962126636-27ad087061cc?w=500&h=750&fit=crop',
        category: 'Romance',
        type: 'movie',
        duration: 15, // 15 seconds sample
        climaxTimestamp: 10,
        premiumPrice: 30,
        genre: ['Romance', 'Adventure'],
        rating: 7.9,
        language: 'English',
        isActive: true
      },

      // Series content for different categories
      {
        title: 'Tech Talk Series',
        description: 'An educational series exploring the latest in technology and innovation. Perfect for tech enthusiasts.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/WhatCarCanYouGetForAGrand.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop',
        category: 'Sci-Fi',
        type: 'series',
        duration: 15,
        climaxTimestamp: 10,
        premiumPrice: 15,
        genre: ['Technology', 'Educational'],
        rating: 8.3,
        language: 'English',
        isActive: true
      },

      // Show content
      {
        title: 'Auto Review Show',
        description: 'A comprehensive review show covering the latest cars, motorcycles, and automotive technology.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/VolkswagenGTIReview.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=500&h=750&fit=crop',
        category: 'Comedy',
        type: 'show',
        duration: 15,
        climaxTimestamp: 10,
        premiumPrice: 12,
        genre: ['Entertainment', 'Reviews'],
        rating: 7.6,
        language: 'English',
        isActive: true
      }
    ];

    // Insert the content
    const result = await Content.insertMany(workingContent);
    console.log(`✅ Successfully added ${result.length} working video content items!`);

    // Show updated content count by category
    const actionCount = await Content.countDocuments({ category: 'Action' });
    const dramaCount = await Content.countDocuments({ category: 'Drama' });
    const comedyCount = await Content.countDocuments({ category: 'Comedy' });
    const thrillerCount = await Content.countDocuments({ category: 'Thriller' });
    const romanceCount = await Content.countDocuments({ category: 'Romance' });
    const scifiCount = await Content.countDocuments({ category: 'Sci-Fi' });

    console.log('\n📊 Updated Content Distribution:');
    console.log(`🎬 Action: ${actionCount} items`);
    console.log(`🎭 Drama: ${dramaCount} items`);
    console.log(`😂 Comedy: ${comedyCount} items`);
    console.log(`😱 Thriller: ${thrillerCount} items`);
    console.log(`💕 Romance: ${romanceCount} items`);
    console.log(`🚀 Sci-Fi: ${scifiCount} items`);

    const totalCount = await Content.countDocuments();
    console.log(`\n🎯 Total Content: ${totalCount} items`);
    console.log('\n✅ All content now has working video URLs!');
    console.log('🎥 Videos will actually play during verification');
    console.log('📝 Ready to delete these after verification if needed');

  } catch (error) {
    console.error('❌ Error adding working video content:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
};

addWorkingVideoContent();
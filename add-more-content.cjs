const mongoose = require('mongoose');
const Content = require('./models/Content.cjs');
require('dotenv').config();

const addMoreContent = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Additional content to ensure every category has multiple items
    const moreContent = [
      // Action Movies
      {
        title: 'Mission Impossible',
        description: 'Ethan Hunt and his team race against time to prevent a global catastrophe.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&h=750&fit=crop',
        category: 'Action',
        type: 'movie',
        duration: 147,
        climaxTimestamp: 120,
        premiumPrice: 49,
        genre: ['Action', 'Thriller'],
        rating: 8.5,
        language: 'English',
        isActive: true
      },
      {
        title: 'Fast & Furious',
        description: 'A group of street racers plan a massive heist to buy their freedom.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop',
        category: 'Action',
        type: 'movie',
        duration: 139,
        climaxTimestamp: 110,
        premiumPrice: 39,
        genre: ['Action', 'Crime'],
        rating: 8.2,
        language: 'English',
        isActive: true
      },
      
      // Drama Movies
      {
        title: 'The Pursuit of Happyness',
        description: 'A struggling salesman takes custody of his son as they both struggle to find happiness.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerBlazes.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'movie',
        duration: 117,
        climaxTimestamp: 95,
        premiumPrice: 29,
        genre: ['Drama', 'Biography'],
        rating: 8.0,
        language: 'English',
        isActive: true
      },
      {
        title: 'A Beautiful Mind',
        description: 'A brilliant mathematician struggles with schizophrenia while working on groundbreaking theories.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerEscapes.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'movie',
        duration: 135,
        climaxTimestamp: 115,
        premiumPrice: 35,
        genre: ['Drama', 'Biography'],
        rating: 8.2,
        language: 'English',
        isActive: true
      },

      // Comedy Movies
      {
        title: 'The Hangover',
        description: 'Three friends wake up from a bachelor party in Las Vegas with no memory of the previous night.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerFun.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=500&h=750&fit=crop',
        category: 'Comedy',
        type: 'movie',
        duration: 100,
        climaxTimestamp: 80,
        premiumPrice: 25,
        genre: ['Comedy'],
        rating: 7.7,
        language: 'English',
        isActive: true
      },
      {
        title: 'Superbad',
        description: 'High school best friends try to make the most of their last days before graduation.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerJoyrides.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=500&h=750&fit=crop',
        category: 'Comedy',
        type: 'movie',
        duration: 113,
        climaxTimestamp: 90,
        premiumPrice: 29,
        genre: ['Comedy'],
        rating: 7.6,
        language: 'English',
        isActive: true
      },

      // Thriller Movies
      {
        title: 'Gone Girl',
        description: 'A man becomes the prime suspect when his wife disappears on their fifth wedding anniversary.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerMeltdowns.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=750&fit=crop',
        category: 'Thriller',
        type: 'movie',
        duration: 149,
        climaxTimestamp: 125,
        premiumPrice: 39,
        genre: ['Thriller', 'Drama'],
        rating: 8.1,
        language: 'English',
        isActive: true
      },
      {
        title: 'Shutter Island',
        description: 'A U.S. Marshal investigates a psychiatric facility on a remote island.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/Sintel.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=750&fit=crop',
        category: 'Thriller',
        type: 'movie',
        duration: 138,
        climaxTimestamp: 115,
        premiumPrice: 35,
        genre: ['Thriller', 'Mystery'],
        rating: 8.2,
        language: 'English',
        isActive: true
      },

      // Romance Movies
      {
        title: 'The Notebook',
        description: 'A poor but passionate young man falls in love with a rich young woman.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/TearsOfSteel.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1516962126636-27ad087061cc?w=500&h=750&fit=crop',
        category: 'Romance',
        type: 'movie',
        duration: 117,
        climaxTimestamp: 95,
        premiumPrice: 29,
        genre: ['Romance', 'Drama'],
        rating: 7.8,
        language: 'English',
        isActive: true
      },
      {
        title: 'Titanic',
        description: 'A seventeen-year-old aristocrat falls in love with a penniless artist aboard the Titanic.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/VolkswagenGTIReview.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1516962126636-27ad087061cc?w=500&h=750&fit=crop',
        category: 'Romance',
        type: 'movie',
        duration: 194,
        climaxTimestamp: 170,
        premiumPrice: 49,
        genre: ['Romance', 'Drama'],
        rating: 7.9,
        language: 'English',
        isActive: true
      },

      // Sci-Fi Movies
      {
        title: 'Blade Runner 2049',
        description: 'A young blade runner discovers a secret that leads him to Rick Deckard.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/WhatCarCanYouGetForAGrand.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop',
        category: 'Sci-Fi',
        type: 'movie',
        duration: 164,
        climaxTimestamp: 140,
        premiumPrice: 45,
        genre: ['Sci-Fi', 'Drama'],
        rating: 8.0,
        language: 'English',
        isActive: true
      },
      {
        title: 'The Matrix',
        description: 'A computer programmer is led to fight against machines who have taken over the world.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop',
        category: 'Sci-Fi',
        type: 'movie',
        duration: 136,
        climaxTimestamp: 115,
        premiumPrice: 39,
        genre: ['Sci-Fi', 'Action'],
        rating: 8.7,
        language: 'English',
        isActive: true
      },

      // Series
      {
        title: 'Game of Thrones',
        description: 'Multiple noble families fight for control of the mythical land of Westeros.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'series',
        duration: 60,
        climaxTimestamp: 45,
        premiumPrice: 19,
        genre: ['Drama', 'Fantasy'],
        rating: 9.3,
        language: 'English',
        isActive: true
      },
      {
        title: 'Friends',
        description: 'Follows the personal and professional lives of six friends living in Manhattan.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerBlazes.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=500&h=750&fit=crop',
        category: 'Comedy',
        type: 'series',
        duration: 22,
        climaxTimestamp: 18,
        premiumPrice: 9,
        genre: ['Comedy', 'Romance'],
        rating: 8.9,
        language: 'English',
        isActive: true
      }
    ];

    // Insert the content
    const result = await Content.insertMany(moreContent);
    console.log(`✅ Successfully added ${result.length} more content items!`);

    // Show current content count by category
    const actionCount = await Content.countDocuments({ category: 'Action' });
    const dramaCount = await Content.countDocuments({ category: 'Drama' });
    const comedyCount = await Content.countDocuments({ category: 'Comedy' });
    const thrillerCount = await Content.countDocuments({ category: 'Thriller' });
    const romanceCount = await Content.countDocuments({ category: 'Romance' });
    const scifiCount = await Content.countDocuments({ category: 'Sci-Fi' });

    console.log('\n📊 Content Distribution:');
    console.log(`🎬 Action: ${actionCount} items`);
    console.log(`🎭 Drama: ${dramaCount} items`);
    console.log(`😂 Comedy: ${comedyCount} items`);
    console.log(`😱 Thriller: ${thrillerCount} items`);
    console.log(`💕 Romance: ${romanceCount} items`);
    console.log(`🚀 Sci-Fi: ${scifiCount} items`);

    const totalCount = await Content.countDocuments();
    console.log(`\n🎯 Total Content: ${totalCount} items`);
    console.log('\n✅ Database is now ready for payment gateway verification!');
    console.log('🌟 Every category has multiple content items to display.');

  } catch (error) {
    console.error('❌ Error adding content:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
};

addMoreContent();
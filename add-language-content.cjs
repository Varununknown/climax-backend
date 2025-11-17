const mongoose = require('mongoose');
const Content = require('./models/Content.cjs');
require('dotenv').config();

const addLanguageContent = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Add content for different Indian languages
    const languageContent = [
      // Hindi Content
      {
        title: 'Hindi Blockbuster Movie',
        description: 'A thrilling Hindi action movie featuring spectacular stunts and an engaging storyline that will keep you on the edge.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&h=750&fit=crop',
        category: 'Action',
        type: 'movie',
        duration: 596,
        climaxTimestamp: 400,
        premiumPrice: 39,
        genre: ['Action', 'Drama'],
        rating: 8.5,
        language: 'Hindi',
        isActive: true
      },
      {
        title: 'Hindi Comedy Special',
        description: 'A hilarious Hindi comedy that brings together the best comedians for non-stop entertainment and laughter.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerFun.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=500&h=750&fit=crop',
        category: 'Comedy',
        type: 'movie',
        duration: 15,
        climaxTimestamp: 10,
        premiumPrice: 29,
        genre: ['Comedy'],
        rating: 8.0,
        language: 'Hindi',
        isActive: true
      },

      // Tamil Content
      {
        title: 'Tamil Action Hero',
        description: 'An epic Tamil action film with incredible fight sequences and a compelling story of heroism and justice.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/Sintel.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=750&fit=crop',
        category: 'Action',
        type: 'movie',
        duration: 888,
        climaxTimestamp: 600,
        premiumPrice: 45,
        genre: ['Action', 'Drama'],
        rating: 8.7,
        language: 'Tamil',
        isActive: true
      },
      {
        title: 'Tamil Romance Story',
        description: 'A beautiful Tamil romantic drama that explores love, relationships, and the complexities of modern life.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerJoyrides.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1516962126636-27ad087061cc?w=500&h=750&fit=crop',
        category: 'Romance',
        type: 'movie',
        duration: 15,
        climaxTimestamp: 10,
        premiumPrice: 35,
        genre: ['Romance', 'Drama'],
        rating: 8.2,
        language: 'Tamil',
        isActive: true
      },

      // Telugu Content
      {
        title: 'Telugu Mega Hit',
        description: 'A spectacular Telugu film combining action, drama, and emotion in a story that will captivate audiences.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'movie',
        duration: 654,
        climaxTimestamp: 500,
        premiumPrice: 42,
        genre: ['Drama', 'Action'],
        rating: 8.6,
        language: 'Telugu',
        isActive: true
      },
      {
        title: 'Telugu Thriller Mystery',
        description: 'A gripping Telugu thriller that keeps you guessing until the very end with its intricate plot and suspense.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerEscapes.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=750&fit=crop',
        category: 'Thriller',
        type: 'movie',
        duration: 15,
        climaxTimestamp: 10,
        premiumPrice: 38,
        genre: ['Thriller', 'Mystery'],
        rating: 8.3,
        language: 'Telugu',
        isActive: true
      },

      // Malayalam Content
      {
        title: 'Malayalam Art Film',
        description: 'A critically acclaimed Malayalam drama that explores deep human emotions and social issues with artistic brilliance.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/TearsOfSteel.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'movie',
        duration: 734,
        climaxTimestamp: 500,
        premiumPrice: 32,
        genre: ['Drama', 'Art'],
        rating: 8.8,
        language: 'Malayalam',
        isActive: true
      },
      {
        title: 'Malayalam Comedy Show',
        description: 'A popular Malayalam comedy series featuring the best comedians and hilarious skits that entertain the whole family.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/VolkswagenGTIReview.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=500&h=750&fit=crop',
        category: 'Comedy',
        type: 'series',
        duration: 15,
        climaxTimestamp: 10,
        premiumPrice: 18,
        genre: ['Comedy'],
        rating: 7.9,
        language: 'Malayalam',
        isActive: true
      },

      // Kannada Content
      {
        title: 'Kannada Historical Epic',
        description: 'A grand Kannada historical epic that brings ancient Karnataka history to life with stunning visuals and powerful performances.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'movie',
        duration: 596,
        climaxTimestamp: 400,
        premiumPrice: 40,
        genre: ['Drama', 'Historical'],
        rating: 8.4,
        language: 'Kannada',
        isActive: true
      },
      {
        title: 'Kannada Action Thriller',
        description: 'An intense Kannada action thriller featuring high-octane chase sequences and a gripping storyline.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerBlazes.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&h=750&fit=crop',
        category: 'Action',
        type: 'movie',
        duration: 15,
        climaxTimestamp: 10,
        premiumPrice: 36,
        genre: ['Action', 'Thriller'],
        rating: 8.1,
        language: 'Kannada',
        isActive: true
      },

      // Bengali Content
      {
        title: 'Bengali Literary Classic',
        description: 'A beautiful adaptation of a classic Bengali literary work, showcasing the rich cultural heritage of Bengal.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/Sintel.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'movie',
        duration: 888,
        climaxTimestamp: 600,
        premiumPrice: 30,
        genre: ['Drama', 'Classic'],
        rating: 8.9,
        language: 'Bengali',
        isActive: true
      },

      // Marathi Content
      {
        title: 'Marathi Social Drama',
        description: 'A thought-provoking Marathi social drama that addresses contemporary issues with sensitivity and depth.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'movie',
        duration: 654,
        climaxTimestamp: 500,
        premiumPrice: 28,
        genre: ['Drama', 'Social'],
        rating: 8.0,
        language: 'Marathi',
        isActive: true
      },

      // Gujarati Content
      {
        title: 'Gujarati Family Entertainment',
        description: 'A heartwarming Gujarati family film that celebrates traditions, values, and the importance of family bonds.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerFun.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=500&h=750&fit=crop',
        category: 'Comedy',
        type: 'movie',
        duration: 15,
        climaxTimestamp: 10,
        premiumPrice: 25,
        genre: ['Comedy', 'Family'],
        rating: 7.8,
        language: 'Gujarati',
        isActive: true
      },

      // Punjabi Content
      {
        title: 'Punjabi Comedy Film',
        description: 'A laugh-out-loud Punjabi comedy featuring popular comedians and a hilarious storyline set in rural Punjab.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/WhatCarCanYouGetForAGrand.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1489599808050-e1d2b7c9fec0?w=500&h=750&fit=crop',
        category: 'Comedy',
        type: 'movie',
        duration: 15,
        climaxTimestamp: 10,
        premiumPrice: 27,
        genre: ['Comedy', 'Rural'],
        rating: 7.7,
        language: 'Punjabi',
        isActive: true
      }
    ];

    // Insert the content
    const result = await Content.insertMany(languageContent);
    console.log(`✅ Successfully added ${result.length} language-specific content items!`);

    // Show content count by language
    const languages = ['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'];
    
    console.log('\n🌍 Content Distribution by Language:');
    for (const lang of languages) {
      const count = await Content.countDocuments({ language: lang });
      console.log(`${lang}: ${count} items`);
    }

    const totalCount = await Content.countDocuments();
    console.log(`\n🎯 Total Content: ${totalCount} items`);
    console.log('\n✅ All language filters now have content!');
    console.log('🎥 No more empty language categories');
    console.log('📝 Ready to delete these after verification if needed');

  } catch (error) {
    console.error('❌ Error adding language content:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
};

addLanguageContent();
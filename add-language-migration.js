const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Content schema (simplified for migration)
const contentSchema = new mongoose.Schema({
  title: String,
  description: String,
  thumbnail: String,
  videoUrl: String,
  category: String,
  type: String,
  duration: Number,
  climaxTimestamp: Number,
  premiumPrice: Number,
  genre: [String],
  rating: Number,
  isActive: { type: Boolean, default: true },
  language: String,
  createdAt: { type: Date, default: Date.now }
});

const Content = mongoose.model('Content', contentSchema);

async function addLanguageFields() {
  try {
    console.log('🔄 Starting language field migration...');
    
    // Find all content without language field
    const contentWithoutLanguage = await Content.find({ 
      language: { $exists: false } 
    });
    
    console.log(`📊 Found ${contentWithoutLanguage.length} content items without language field`);
    
    if (contentWithoutLanguage.length === 0) {
      console.log('✅ All content already has language field');
      return;
    }
    
    // Update content without language field to have default language
    const result = await Content.updateMany(
      { language: { $exists: false } },
      { $set: { language: 'English' } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} content items with default language: English`);
    
    // Show some examples
    const updatedContent = await Content.find({ language: 'English' }).limit(3);
    console.log('\n📝 Sample updated content:');
    updatedContent.forEach(content => {
      console.log(`- ${content.title} (${content.type}) -> Language: ${content.language}`);
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

async function main() {
  await connectDB();
  await addLanguageFields();
  
  console.log('\n🎉 Migration completed!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
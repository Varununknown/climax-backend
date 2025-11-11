const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

async function testMongoDB() {
  console.log('🔍 MongoDB Connection Test');
  console.log('================================\n');
  
  console.log('📍 Connection String:', process.env.MONGO_URI);
  console.log('⏱️  Timeout: 10 seconds\n');
  
  try {
    console.log('🔌 Attempting to connect...\n');
    
    const start = Date.now();
    
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
    });
    
    const duration = Date.now() - start;
    
    console.log(`✅ SUCCESS! Connected in ${duration}ms\n`);
    console.log('📊 Testing database access...\n');
    
    // Try to access a collection
    const db = mongoose.connection.getClient().db('ottdb');
    const collections = await db.listCollections().toArray();
    
    console.log(`✅ Database accessible!`);
    console.log(`📦 Found ${collections.length} collections:\n`);
    
    collections.forEach(col => {
      console.log(`   • ${col.name}`);
    });
    
    // Try to count documents in Contents
    const contentsCount = await db.collection('contents').countDocuments();
    console.log(`\n📺 Contents collection: ${contentsCount} items\n`);
    
    // Try to count users
    const usersCount = await db.collection('users').countDocuments();
    console.log(`👤 Users collection: ${usersCount} items\n`);
    
    console.log('✅ EVERYTHING WORKS! Database is fully accessible.\n');
    console.log('💡 Recommendations:');
    console.log('   1. Restart your backend server');
    console.log('   2. Try logging in again');
    console.log('   3. Try editing content again\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (err) {
    const duration = Date.now() - (global.start || Date.now());
    
    console.error(`❌ FAILED after ${duration}ms\n`);
    console.error(`Error: ${err.message}\n`);
    
    if (err.message.includes('getaddrinfo ENOTFOUND')) {
      console.error('🔴 Network Issue: Cannot reach MongoDB server');
      console.error('   - Check if MongoDB credentials are correct');
      console.error('   - Check your internet connection\n');
    } else if (err.message.includes('authentication failed')) {
      console.error('🔴 Authentication Error: Invalid credentials');
      console.error('   - Check MongoDB username: myuser');
      console.error('   - Check MongoDB password: ott123\n');
    } else if (err.message.includes('IP whitelist')) {
      console.error('🔴 IP Whitelist Error: Your IP is not whitelisted');
      console.error('   - Go to: https://cloud.mongodb.com/');
      console.error('   - Cluster "ott" → Network Access');
      console.error('   - Add IP: 0.0.0.0/0\n');
    } else if (err.message.includes('ServerSelectionTimeout')) {
      console.error('🔴 Connection Timeout: MongoDB is not responding');
      console.error('   - Possible causes:');
      console.error('   1. MongoDB IP whitelist is blocking your IP');
      console.error('   2. MongoDB server is down');
      console.error('   3. Network connectivity issue\n');
      console.error('   🔧 Solution:');
      console.error('   1. Go to: https://cloud.mongodb.com/');
      console.error('   2. Cluster "ott" → Network Access');
      console.error('   3. Add IP: 0.0.0.0/0');
      console.error('   4. Wait 2-3 minutes for change to apply');
      console.error('   5. Try again\n');
    }
    
    console.error('📋 Full Error Details:');
    console.error(err);
    console.error('\n');
    
    process.exit(1);
  }
}

testMongoDB();

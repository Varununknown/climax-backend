#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Initialize S3/R2 client
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  region: 'auto',
  signatureVersion: 'v4',
  s3ForcePathStyle: true
});

const MOVIE_FILE = process.argv[2];
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!MOVIE_FILE) {
  console.error('❌ Usage: node upload-movie.js "<path-to-movie>"');
  console.error('Example: node upload-movie.js "D:\\\\Videos\\\\LIFE360.mp4"');
  process.exit(1);
}

async function uploadMovie() {
  try {
    // Validate file exists
    if (!fs.existsSync(MOVIE_FILE)) {
      throw new Error(`File not found: ${MOVIE_FILE}`);
    }

    const fileStats = fs.statSync(MOVIE_FILE);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    const fileName = path.basename(MOVIE_FILE);
    const s3Key = `Movies/${fileName}`;

    console.log('\n🎬 R2 Movie Upload Started');
    console.log('═'.repeat(50));
    console.log(`📁 Bucket: ${BUCKET_NAME}`);
    console.log(`📽️  File: ${fileName}`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`🔑 Key: ${s3Key}`);
    console.log('═'.repeat(50));
    console.log('\n⏳ Uploading... Please wait...\n');

    // Read file
    const fileContent = fs.readFileSync(MOVIE_FILE);

    // Upload to R2
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'video/mp4',
      ACL: 'public-read'
    };

    const uploadResult = await s3.upload(uploadParams).promise();

    // Generate public URL
    const publicUrl = `https://${BUCKET_NAME}.r2.cloudflarestorage.com/${s3Key}`;

    console.log('✅ Upload Complete!\n');
    console.log('═'.repeat(50));
    console.log('📌 Public URL (use in admin panel):');
    console.log('═'.repeat(50));
    console.log(`\n${publicUrl}\n`);
    console.log('═'.repeat(50));
    console.log('\n💡 Steps to add to your OTT:');
    console.log('1. Go to admin panel → Add Content');
    console.log('2. Paste the URL above in "Video URL" field');
    console.log('3. Fill other details and save\n');

  } catch (error) {
    console.error('\n❌ Upload Failed!');
    console.error(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

uploadMovie();

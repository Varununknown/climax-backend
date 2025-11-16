#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// R2 Configuration
const R2_CONFIG = {
  endpoint: 'https://1de5ea2f9fef1e217236be8e34ffb849.r2.cloudflarestorage.com',
  accessKeyId: 'b860747c66ddb440e0e56eff9465a5a6',
  secretAccessKey: '8b82974a8bb7e5b0fb41e676cabb3ccddc46ee170291c5586a28bbf252f3cb42',
  region: 'auto',
  signatureVersion: 'v4',
  s3ForcePathStyle: true
};

const BUCKET_NAME = 'ottvideos';
const MOVIE_FILE = process.argv[2];

if (!MOVIE_FILE) {
  console.error('❌ Usage: node simple-upload.js "<path-to-movie>"');
  process.exit(1);
}

async function uploadToR2() {
  try {
    // Initialize S3 client
    const s3 = new AWS.S3(R2_CONFIG);

    // Validate file
    if (!fs.existsSync(MOVIE_FILE)) {
      throw new Error(`File not found: ${MOVIE_FILE}`);
    }

    const fileStats = fs.statSync(MOVIE_FILE);
    const fileSizeBytes = fileStats.size;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    const fileSizeGB = (fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2);

    const fileName = path.basename(MOVIE_FILE);
    const s3Key = `Movies/${fileName}`;

    console.log('\n🎬 R2 Simple Upload');
    console.log('═'.repeat(60));
    console.log(`📁 Bucket: ${BUCKET_NAME}`);
    console.log(`📽️  File: ${fileName}`);
    console.log(`📊 Size: ${fileSizeMB} MB (${fileSizeGB} GB)`);
    console.log(`🔑 Path: ${s3Key}`);
    console.log('═'.repeat(60));
    console.log('\n⏳ Uploading... DO NOT CLOSE THIS WINDOW\n');

    // Read file into memory
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
    console.log('═'.repeat(60));
    console.log('📌 PUBLIC URL (Copy this for admin panel):');
    console.log('═'.repeat(60));
    console.log(`\n${publicUrl}\n`);
    console.log('═'.repeat(60));
    console.log('\n💡 How to use in your OTT:');
    console.log('   1. Go to Admin Dashboard');
    console.log('   2. Click "Add Content"');
    console.log('   3. Paste the URL above in "Video URL" field');
    console.log('   4. Fill in other details');
    console.log('   5. Click Save\n');

  } catch (error) {
    console.error('\n❌ Upload Failed!');
    console.error(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

uploadToR2();

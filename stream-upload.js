#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3({
  endpoint: 'https://1de5ea2f9fef1e217236be8e34ffb849.r2.cloudflarestorage.com',
  accessKeyId: 'b860747c66ddb440e0e56eff9465a5a6',
  secretAccessKey: '8b82974a8bb7e5b0fb41e676cabb3ccddc46ee170291c5586a28bbf252f3cb42',
  region: 'auto',
  signatureVersion: 'v4',
  s3ForcePathStyle: true
});

const BUCKET = 'ottvideos';
const MOVIE_FILE = process.argv[2];

if (!MOVIE_FILE) {
  console.error('Usage: node stream-upload.js "<path-to-file>"');
  process.exit(1);
}

async function upload() {
  try {
    if (!fs.existsSync(MOVIE_FILE)) {
      throw new Error(`File not found: ${MOVIE_FILE}`);
    }

    const fileName = path.basename(MOVIE_FILE);
    const fileSize = fs.statSync(MOVIE_FILE).size;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

    console.log(`\n📽️ Uploading: ${fileName}`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`⏳ Using stream upload (memory efficient)\n`);

    const s3Key = `Movies/${fileName}`;
    const stream = fs.createReadStream(MOVIE_FILE, { highWaterMark: 10 * 1024 * 1024 });

    let uploadedBytes = 0;
    stream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const percent = ((uploadedBytes / fileSize) * 100).toFixed(1);
      process.stdout.write(`\r⏳ Progress: ${percent}% (${(uploadedBytes / (1024 * 1024)).toFixed(1)}MB)`);
    });

    const params = {
      Bucket: BUCKET,
      Key: s3Key,
      Body: stream,
      ContentType: 'video/mp4'
    };

    const result = await s3.upload(params, {
      partSize: 50 * 1024 * 1024, // 50MB parts
      queueSize: 2 // Use 2 concurrent uploads for stability
    }).promise();

    const publicUrl = `https://pub-95bb0d4ac3014d6082cbcd99b03f24c5.r2.dev/Movies/${fileName}`;

    console.log('\n\n✅ Upload Complete!\n');
    console.log('═'.repeat(70));
    console.log('📌 Your Public URL:');
    console.log('═'.repeat(70));
    console.log(`\n${publicUrl}\n`);
    console.log('═'.repeat(70));
    console.log('\n✨ Use this URL in your admin panel!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

upload();

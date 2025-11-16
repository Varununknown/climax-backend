#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const FILE_PATH = process.argv[2];
if (!FILE_PATH) {
  console.error('Usage: node batch-upload.js "<file>"');
  process.exit(1);
}

async function upload() {
  const fileName = path.basename(FILE_PATH);
  const fileSize = fs.statSync(FILE_PATH).size;
  
  console.log(`\n📽️ ${fileName} (${(fileSize/1024/1024/1024).toFixed(2)}GB)`);
  console.log('⏳ Uploading to R2...\n');

  const s3 = new AWS.S3({
    endpoint: 'https://1de5ea2f9fef1e217236be8e34ffb849.r2.cloudflarestorage.com',
    accessKeyId: 'b860747c66ddb440e0e56eff9465a5a6',
    secretAccessKey: '8b82974a8bb7e5b0fb41e676cabb3ccddc46ee170291c5586a28bbf252f3cb42',
    region: 'auto',
    s3ForcePathStyle: true,
    maxRetries: 5,
    httpOptions: { timeout: 600000 }
  });

  try {
    const fileBuffer = fs.readFileSync(FILE_PATH);
    let uploadedBytes = 0;

    const result = await s3.upload({
      Bucket: 'ottvideos',
      Key: `Movies/${fileName}`,
      Body: fileBuffer,
      ContentType: 'video/mp4'
    }, {
      partSize: 50 * 1024 * 1024,
      queueSize: 1
    }).on('httpUploadProgress', (progress) => {
      uploadedBytes = progress.loaded;
      const percent = ((uploadedBytes / fileSize) * 100).toFixed(1);
      process.stdout.write(`\r[${percent}%] ${(uploadedBytes/1024/1024).toFixed(0)}MB / ${(fileSize/1024/1024).toFixed(0)}MB`);
    }).promise();

    console.log(`\n\n✅ Uploaded!\nhttps://pub-95bb0d4ac3014d6082cbcd99b03f24c5.r2.dev/Movies/${fileName}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

upload();

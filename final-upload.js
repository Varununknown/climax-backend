#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const s3Client = new AWS.S3({
  endpoint: 'https://1de5ea2f9fef1e217236be8e34ffb849.r2.cloudflarestorage.com',
  accessKeyId: 'b860747c66ddb440e0e56eff9465a5a6',
  secretAccessKey: '8b82974a8bb7e5b0fb41e676cabb3ccddc46ee170291c5586a28bbf252f3cb42',
  region: 'auto',
  signatureVersion: 'v4',
  s3ForcePathStyle: true
});

const BUCKET = 'ottvideos';
const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks - smaller for stability
const MOVIE_FILE = process.argv[2];

if (!MOVIE_FILE) {
  console.error('Usage: node final-upload.js "<path-to-file>"');
  process.exit(1);
}

async function uploadWithRetry(params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await s3Client.uploadPart(params).promise();
    } catch (err) {
      if (i < retries - 1) {
        console.log(`  ⚠️  Retry ${i + 1}/${retries - 1}...`);
        await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Exponential backoff
      } else {
        throw err;
      }
    }
  }
}

async function upload() {
  try {
    if (!fs.existsSync(MOVIE_FILE)) {
      throw new Error(`File not found: ${MOVIE_FILE}`);
    }

    const fileName = path.basename(MOVIE_FILE);
    const fileSize = fs.statSync(MOVIE_FILE).size;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    console.log(`\n📽️ Uploading: ${fileName}`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`📦 Strategy: ${totalChunks} chunks × 25MB with retry logic\n`);

    const s3Key = `Movies/${fileName}`;

    // Initiate multipart upload
    console.log('🔄 Initiating upload...');
    const multipart = await s3Client.createMultipartUpload({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: 'video/mp4'
    }).promise();

    const uploadId = multipart.UploadId;
    const parts = [];

    // Upload chunks with retry logic
    for (let partNum = 1; partNum <= totalChunks; partNum++) {
      const start = (partNum - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunkSize = end - start;

      const buffer = Buffer.alloc(chunkSize);
      const fd = fs.openSync(MOVIE_FILE, 'r');
      fs.readSync(fd, buffer, 0, chunkSize, start);
      fs.closeSync(fd);

      const percent = (partNum / totalChunks * 100).toFixed(1);
      process.stdout.write(`\r⏳ [${partNum}/${totalChunks}] ${percent}% uploading...`);

      const result = await uploadWithRetry({
        Bucket: BUCKET,
        Key: s3Key,
        UploadId: uploadId,
        PartNumber: partNum,
        Body: buffer
      });

      parts.push({
        ETag: result.ETag,
        PartNumber: partNum
      });
    }

    console.log('\n\n🔄 Finalizing...');
    await s3Client.completeMultipartUpload({
      Bucket: BUCKET,
      Key: s3Key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts }
    }).promise();

    const publicUrl = `https://pub-95bb0d4ac3014d6082cbcd99b03f24c5.r2.dev/Movies/${fileName}`;

    console.log('\n✅ Upload Complete!\n');
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

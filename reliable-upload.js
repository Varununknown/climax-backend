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
  s3ForcePathStyle: true,
  maxRetries: 5,
  httpOptions: { timeout: 300000 }
});

const BUCKET = 'ottvideos';
const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks (more stable)
const MOVIE_FILE = process.argv[2];

if (!MOVIE_FILE) {
  console.error('Usage: node reliable-upload.js "<path-to-file>"');
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
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    console.log(`\n📽️ Uploading: ${fileName}`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`📦 Strategy: ${totalChunks} chunks × 50MB\n`);

    const s3Key = `Movies/${fileName}`;
    
    // Initiate multipart upload
    const multipartUpload = await s3.createMultipartUpload({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: 'video/mp4'
    }).promise();

    const uploadId = multipartUpload.UploadId;
    const parts = [];

    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunkSize = end - start;
      
      const buffer = Buffer.alloc(chunkSize);
      const fd = fs.openSync(MOVIE_FILE, 'r');
      fs.readSync(fd, buffer, 0, chunkSize, start);
      fs.closeSync(fd);

      console.log(`⏳ [${i + 1}/${totalChunks}] Uploading chunk ${((i + 1) / totalChunks * 100).toFixed(1)}%...`);

      const partResult = await s3.uploadPart({
        Bucket: BUCKET,
        Key: s3Key,
        UploadId: uploadId,
        PartNumber: i + 1,
        Body: buffer
      }).promise();

      parts.push({
        ETag: partResult.ETag,
        PartNumber: i + 1
      });

      process.stdout.write(`✓ Chunk ${i + 1} uploaded\n`);
    }

    // Complete multipart upload
    console.log('\n🔄 Finalizing upload...');
    await s3.completeMultipartUpload({
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

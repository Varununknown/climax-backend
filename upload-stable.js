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
  maxRetries: 10,
  httpOptions: { timeout: 600000 }
});

const BUCKET = 'ottvideos';
const PART_SIZE = 100 * 1024 * 1024; // 100MB
const MOVIE_FILE = process.argv[2];

if (!MOVIE_FILE) {
  console.error('Usage: node upload-stable.js "<path-to-file>"');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadPartWithRetry(s3, params, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await s3.uploadPart(params).promise();
    } catch (err) {
      if (attempt < retries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        console.log(`  ⚠️  Part ${params.PartNumber} retry ${attempt}/${retries} (${delayMs}ms delay)`);
        await sleep(delayMs);
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

    const fileSize = fs.statSync(MOVIE_FILE).size;
    const fileName = path.basename(MOVIE_FILE);
    const s3Key = `Movies/${fileName}`;

    console.log(`\n📽️ ${fileName}`);
    console.log(`📊 ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📦 ${Math.ceil(fileSize / PART_SIZE)} parts × 100MB\n`);

    // Initiate
    const { UploadId } = await s3.createMultipartUpload({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: 'video/mp4'
    }).promise();

    const parts = [];
    const totalParts = Math.ceil(fileSize / PART_SIZE);

    // Upload parts
    for (let partNum = 1; partNum <= totalParts; partNum++) {
      const start = (partNum - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, fileSize);
      const partSize = end - start;

      // Read chunk
      const buffer = Buffer.alloc(partSize);
      const fd = fs.openSync(MOVIE_FILE, 'r');
      const bytesRead = fs.readSync(fd, buffer, 0, partSize, start);
      fs.closeSync(fd);

      if (bytesRead !== partSize) {
        throw new Error(`Failed to read part ${partNum}: expected ${partSize}, got ${bytesRead}`);
      }

      const percent = ((partNum / totalParts) * 100).toFixed(1);
      process.stdout.write(`\r[${partNum}/${totalParts}] ${percent}% `);

      // Upload with retry
      const result = await uploadPartWithRetry(s3, {
        Bucket: BUCKET,
        Key: s3Key,
        PartNumber: partNum,
        UploadId: UploadId,
        Body: buffer
      });

      parts.push({
        ETag: result.ETag,
        PartNumber: partNum
      });
    }

    console.log('\n✓ All parts uploaded, finalizing...');

    // Complete
    await s3.completeMultipartUpload({
      Bucket: BUCKET,
      Key: s3Key,
      UploadId: UploadId,
      MultipartUpload: { Parts: parts }
    }).promise();

    const url = `https://pub-95bb0d4ac3014d6082cbcd99b03f24c5.r2.dev/Movies/${fileName}`;

    console.log('\n✅ Complete!\n');
    console.log('═'.repeat(70));
    console.log(url);
    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

upload();

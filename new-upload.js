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
  maxRetries: 3,
  httpOptions: { timeout: 120000 }
});

const BUCKET = 'ottvideos';
const PART_SIZE = 100 * 1024 * 1024;
const FILE_PATH = process.argv[2];

if (!FILE_PATH) {
  console.error('Usage: node new-upload.js "<path-to-file>"');
  process.exit(1);
}

async function uploadFile() {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      throw new Error(`File not found: ${FILE_PATH}`);
    }

    const fileName = path.basename(FILE_PATH);
    const fileSize = fs.statSync(FILE_PATH).size;
    const totalParts = Math.ceil(fileSize / PART_SIZE);
    const s3Key = `Movies/${fileName}`;

    console.log(`\n📽️ ${fileName}`);
    console.log(`📊 ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📦 ${totalParts} parts x 100MB\n`);

    // Start multipart upload
    const multipart = await s3.createMultipartUpload({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: 'video/mp4'
    }).promise();

    const uploadId = multipart.UploadId;
    const parts = [];

    // Upload each part
    for (let i = 1; i <= totalParts; i++) {
      const start = (i - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, fileSize);
      const size = end - start;

      const buffer = Buffer.alloc(size);
      const fd = fs.openSync(FILE_PATH, 'r');
      fs.readSync(fd, buffer, 0, size, start);
      fs.closeSync(fd);

      const percent = ((i / totalParts) * 100).toFixed(1);
      process.stdout.write(`\r[${i}/${totalParts}] ${percent}% `);

      const result = await s3.uploadPart({
        Bucket: BUCKET,
        Key: s3Key,
        PartNumber: i,
        UploadId: uploadId,
        Body: buffer
      }).promise();

      parts.push({ ETag: result.ETag, PartNumber: i });
    }

    console.log('\n✓ Finalizing...');

    // Complete upload
    await s3.completeMultipartUpload({
      Bucket: BUCKET,
      Key: s3Key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts }
    }).promise();

    const url = `https://pub-95bb0d4ac3014d6082cbcd99b03f24c5.r2.dev/Movies/${fileName}`;
    console.log('\n✅ Done!\n');
    console.log('═'.repeat(70));
    console.log(url);
    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

uploadFile();

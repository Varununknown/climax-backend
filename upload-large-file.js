#!/usr/bin/env node

/**
 * R2 Large File Upload using Multipart Upload API
 * Handles files > 100MB efficiently with AWS SDK v2
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// R2 Configuration (from .env)
const R2_CONFIG = {
  endpoint: 'https://1de5ea2f9fef1e217236be8e34ffb849.r2.cloudflarestorage.com',
  accessKeyId: 'b860747c66ddb440e0e56eff9465a5a6',
  secretAccessKey: '8b82974a8bb7e5b0fb41e676cabb3ccddc46ee170291c5586a28bbf252f3cb42',
  region: 'auto',
  signatureVersion: 'v4',
  s3ForcePathStyle: true
};

const BUCKET_NAME = 'ottvideos'; // Hardcoded since env vars not loading
const MOVIE_FILE = process.argv[2];

if (!MOVIE_FILE) {
  console.error('❌ Usage: node upload-large-file.js "<path-to-movie>"');
  console.error('Example: node upload-large-file.js "D:\\\\Videos\\\\LIFE360.mp4"');
  process.exit(1);
}

// Initialize S3 client for R2
const s3 = new AWS.S3({
  ...R2_CONFIG,
  maxRetries: 5,
  httpOptions: {
    timeout: 300000 // 5 minutes per request
  }
});

async function uploadLargeFile() {
  try {
    // Validate file
    if (!fs.existsSync(MOVIE_FILE)) {
      throw new Error(`❌ File not found: ${MOVIE_FILE}`);
    }

    const fileStats = fs.statSync(MOVIE_FILE);
    const fileSizeBytes = fileStats.size;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    const fileSizeGB = (fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2);

    const fileName = path.basename(MOVIE_FILE);
    const s3Key = `Movies/${fileName}`;

    console.log('\n🎬 R2 Large File Upload');
    console.log('═'.repeat(60));
    console.log(`📁 Bucket: ${BUCKET_NAME}`);
    console.log(`📽️  File: ${fileName}`);
    console.log(`📊 Size: ${fileSizeMB} MB (${fileSizeGB} GB)`);
    console.log(`🔑 Path: ${s3Key}`);
    console.log('═'.repeat(60));

    // For large files, use multipart upload
    const PART_SIZE = 100 * 1024 * 1024; // 100MB per part
    const totalParts = Math.ceil(fileSizeBytes / PART_SIZE);

    console.log(`\n📦 Upload Strategy: Multipart (${totalParts} parts of 100MB each)`);
    console.log('⏳ Starting upload... DO NOT CLOSE THIS WINDOW\n');

    // Create multipart upload
    const multipartParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: 'video/mp4'
    };

    const multipartUpload = await s3.createMultipartUpload(multipartParams).promise();
    const uploadId = multipartUpload.UploadId;

    console.log(`✓ Multipart upload initiated (ID: ${uploadId.substring(0, 10)}...)`);
    console.log('');

    const parts = [];
    let uploadedBytes = 0;
    let lastProgressTime = Date.now();

    // Upload parts
    for (let partNum = 1; partNum <= totalParts; partNum++) {
      const start = (partNum - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, fileSizeBytes);
      const partSize = end - start;

      // Read part from file
      const buffer = Buffer.alloc(partSize);
      const fd = fs.openSync(MOVIE_FILE, 'r');
      fs.readSync(fd, buffer, 0, partSize, start);
      fs.closeSync(fd);

      // Upload part
      const partParams = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        PartNumber: partNum,
        UploadId: uploadId,
        Body: buffer
      };

      try {
        const partUpload = await s3.uploadPart(partParams).promise();
        parts.push({
          ETag: partUpload.ETag,
          PartNumber: partNum
        });

        uploadedBytes += partSize;
        const percentComplete = ((uploadedBytes / fileSizeBytes) * 100).toFixed(1);
        const uploadedMB = (uploadedBytes / (1024 * 1024)).toFixed(1);

        // Progress update
        const now = Date.now();
        if (now - lastProgressTime > 10000 || partNum === totalParts) {
          console.log(`[${partNum}/${totalParts}] ${percentComplete}% uploaded (${uploadedMB}MB)`);
          lastProgressTime = now;
        }
      } catch (partErr) {
        console.error(`\n❌ Part ${partNum} failed:`, partErr.message);
        // Retry once
        const retryUpload = await s3.uploadPart(partParams).promise();
        parts.push({
          ETag: retryUpload.ETag,
          PartNumber: partNum
        });
        uploadedBytes += partSize;
        console.log(`[${partNum}/${totalParts}] (retry successful)`);
      }
    }

    console.log('\n✓ All parts uploaded');
    console.log('⏳ Completing upload...\n');

    // Complete multipart upload
    const completeParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber) }
    };

    const result = await s3.completeMultipartUpload(completeParams).promise();

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
    if (error.code) {
      console.error(`Error Code: ${error.code}`);
    }
    process.exit(1);
  }
}

// Run upload
uploadLargeFile();

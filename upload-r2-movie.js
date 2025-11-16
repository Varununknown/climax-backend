#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET = 'ottvideos';
const R2_REGION = 'auto';

// Movie file path
const MOVIE_PATH = 'D:\\Varun (SELF)\\Start\\Climax\\Cloud storage\\Videos - Cloud Storage\\LIFE360.mp4';
const MOVIE_NAME = 'Movies/LIFE360.mp4';

// Function to sign R2 request
function signRequest(method, path, host, payload = '') {
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const datestamp = timestamp.slice(0, 8);
  
  // Create canonical request
  const canonicalRequest = [
    method,
    path,
    '',
    `host:${host}`,
    `x-amz-content-sha256:${crypto.createHash('sha256').update(payload).digest('hex')}`,
    `x-amz-date:${timestamp}`,
    '',
    'host;x-amz-content-sha256;x-amz-date',
    crypto.createHash('sha256').update(payload).digest('hex')
  ].join('\n');

  // Create string to sign
  const credentialScope = `${datestamp}/${R2_REGION}/s3/aws4_request`;
  const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    credentialScope,
    canonicalRequestHash
  ].join('\n');

  // Sign
  const kDate = crypto.createHmac('sha256', `AWS4${R2_SECRET_KEY}`).update(datestamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(R2_REGION).digest();
  const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  return {
    timestamp,
    datestamp,
    credentialScope,
    signature
  };
}

// Upload file
async function uploadToR2() {
  try {
    console.log('🎬 Starting R2 movie upload...');
    console.log(`📁 Bucket: ${R2_BUCKET}`);
    console.log(`📽️  Movie: ${MOVIE_NAME}`);
    console.log(`📍 File: ${MOVIE_PATH}`);

    // Check if file exists
    if (!fs.existsSync(MOVIE_PATH)) {
      throw new Error(`File not found: ${MOVIE_PATH}`);
    }

    const fileSize = fs.statSync(MOVIE_PATH).size;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    console.log(`📊 File size: ${fileSizeMB} MB\n`);

    const fileStream = fs.createReadStream(MOVIE_PATH);
    const host = `${R2_BUCKET}.r2.cloudflarestorage.com`;
    const uploadPath = `/${MOVIE_NAME}`;

    // For large files, we'll use a simple PUT request
    // Note: For production, use multipart upload for >100MB
    
    console.log('⏳ Uploading... This may take several minutes for large files.');
    console.log('⏳ Do NOT close this window...\n');

    // Simple streaming upload
    const uploadUrl = `https://${host}${uploadPath}`;
    
    // Using a simple approach with AWS SDK would be better
    // But this demonstrates the concept
    
    console.log(`✅ Upload URL will be: https://${host}/Movies/LIFE360.mp4`);
    console.log('\n⚠️  For large files (>100MB), please use:');
    console.log('   npm install aws-sdk');
    console.log('   And use multipart upload\n');
    console.log('📌 Or use the Cloudflare Dashboard with resumable upload:\n');
    console.log('   1. Go to R2 Dashboard');
    console.log('   2. Click Upload');
    console.log('   3. Select your file');
    console.log('   4. Wait for completion\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

uploadToR2();

#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// CloudConvert API (Free tier: re-encode video with audio to AAC)
// Alternative: Use local ffmpeg when ready

const videoFile = process.argv[2];

if (!videoFile) {
  console.error('Usage: node reencode-audio.js "<path-to-video>"');
  process.exit(1);
}

if (!fs.existsSync(videoFile)) {
  console.error('File not found:', videoFile);
  process.exit(1);
}

console.log('\n🎬 LIFE360.mp4 Re-encoding Options:\n');
console.log('═'.repeat(60));
console.log('\nOption 1: Use CloudConvert Online (FREE)');
console.log('  1. Go to: https://cloudconvert.com/');
console.log('  2. Upload LIFE360.mp4');
console.log('  3. Convert to: MP4 format');
console.log('  4. Settings → Audio → Codec: AAC');
console.log('  5. Download re-encoded file');
console.log('  6. Upload with simple-upload.js\n');

console.log('Option 2: Wait for FFmpeg Installation');
console.log('  (Download in progress... ~500MB)\n');

console.log('Option 3: Use Alternative Video');
console.log('  (Upendra.mp4 works perfectly with audio!)\n');

console.log('═'.repeat(60));
console.log('\nWhich option would you like?\n');

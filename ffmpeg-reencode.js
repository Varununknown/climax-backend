#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const videoFile = process.argv[2];

if (!videoFile) {
  console.error('Usage: node ffmpeg-reencode.js "<path-to-video>"');
  process.exit(1);
}

if (!fs.existsSync(videoFile)) {
  console.error('❌ File not found:', videoFile);
  process.exit(1);
}

const fileName = path.basename(videoFile);
const fileDir = path.dirname(videoFile);
const outputFile = path.join(fileDir, `${path.parse(fileName).name}-reencoded.mp4`);

console.log('\n🎬 FFmpeg Re-encoding - Audio Codec Fix');
console.log('═'.repeat(70));
console.log(`📁 Input:  ${fileName}`);
console.log(`📁 Output: ${path.basename(outputFile)}`);
console.log(`⚙️  Codec:  AAC Audio (compatible with all browsers)`);
console.log('═'.repeat(70));
console.log('\n⏳ Re-encoding... This may take 5-15 minutes\n');

// FFmpeg command: Keep video as-is, re-encode audio to AAC
const ffmpegPath = 'C:\\ffmpeg\\ffmpeg.exe';
const ffmpeg = spawn(ffmpegPath, [
  '-i', videoFile,
  '-c:v', 'copy',                    // Copy video stream (no re-encoding)
  '-c:a', 'aac',                     // Convert audio to AAC
  '-b:a', '128k',                    // Audio bitrate
  '-y',                              // Overwrite output file
  outputFile
]);

let progress = 0;

ffmpeg.stderr.on('data', (data) => {
  const output = data.toString();
  
  // Track progress
  if (output.includes('frame=')) {
    const match = output.match(/frame=\s+(\d+)/);
    if (match) {
      progress = match[1];
      process.stdout.write(`\r⏳ Processing... Frame: ${progress}`);
    }
  }
  
  // Show errors
  if (output.includes('error') || output.includes('Error')) {
    console.error('\n❌ Error:', output);
  }
});

ffmpeg.on('close', (code) => {
  console.log('\n');
  
  if (code === 0) {
    const stats = fs.statSync(outputFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('✅ Re-encoding Complete!\n');
    console.log('═'.repeat(70));
    console.log(`📁 Output File: ${outputFile}`);
    console.log(`📊 Size: ${sizeMB} MB`);
    console.log('═'.repeat(70));
    console.log('\n📤 Next: Upload with simple-upload.js\n');
    console.log(`Command:\n  node simple-upload.js "${outputFile}"\n`);
  } else {
    console.error('❌ Re-encoding failed with code:', code);
    process.exit(1);
  }
});

ffmpeg.on('error', (error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

#!/usr/bin/env node

const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  endpoint: 'https://1de5ea2f9fef1e217236be8e34ffb849.r2.cloudflarestorage.com',
  accessKeyId: 'b860747c66ddb440e0e56eff9465a5a6',
  secretAccessKey: '8b82974a8bb7e5b0fb41e676cabb3ccddc46ee170291c5586a28bbf252f3cb42',
  region: 'auto',
  s3ForcePathStyle: true
});

(async () => {
  try {
    console.log('🔍 Checking for ongoing multipart uploads...\n');
    
    const uploads = await s3.listMultipartUploads({ Bucket: 'ottvideos' }).promise();
    
    if (uploads.Uploads && uploads.Uploads.length > 0) {
      console.log(`Found ${uploads.Uploads.length} ongoing upload(s):\n`);
      
      for (const upload of uploads.Uploads) {
        console.log(`⏳ Cancelling: ${upload.Key}`);
        await s3.abortMultipartUpload({
          Bucket: 'ottvideos',
          Key: upload.Key,
          UploadId: upload.UploadId
        }).promise();
        console.log(`✅ Cancelled\n`);
      }
      
      console.log('🧹 All incomplete uploads cleaned up!');
    } else {
      console.log('✅ No ongoing multipart uploads found');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();

const AWS = require('aws-sdk');
const { generateCDNUrl } = require('./cdnHelper.cjs');
require('dotenv').config();

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  region: 'auto',
  signatureVersion: 'v4'
});

const uploadToR2 = async (fileBuffer, fileName, mimeType) => {
  const params = {
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: 'public-read'
  };

  const uploadResult = await s3.upload(params).promise();
  // Return CDN URL for super fast delivery
  return generateCDNUrl(fileName);
};

module.exports = { uploadToR2 };

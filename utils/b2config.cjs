const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
  endpoint: process.env.B2_ENDPOINT, // e.g. https://s3.us-west-004.backblazeb2.com
  accessKeyId: process.env.B2_KEY_ID,
  secretAccessKey: process.env.B2_APP_KEY,
  region: process.env.B2_REGION, // can be any string; B2 ignores it
  signatureVersion: 'v4'
});

module.exports = { s3 };

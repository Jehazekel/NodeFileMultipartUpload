const AWS = require('@aws-sdk/client-s3');
require('dotenv').config();

// Create Aws S3 Client
const AwsS3Client = new AWS.S3({
   region: (process.env.AWS_REGION),
   credentials: {
      accessKeyId: String(process.env.AWS_ACCESS_KEY_ID),
      secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY)
   },
   correctClockSkew: true, // whether to apply a clock skew correction and retry requests that fail because of an skewed client clock. Defaults to false.
   httpOptions: {
      xhrAsync: false, //Set to false to send requests synchronously. Defaults to true (async on)
      timeout: 300000, //Sets the socket to timeout after timeout milliseconds of inactivity on the socket. Defaults to two minutes (120000).

   }
})
module.exports = AwsS3Client;
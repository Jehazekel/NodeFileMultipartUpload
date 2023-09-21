const AWS = require('@aws-sdk/client-s3');
require('dotenv').config();

// Create Aws S3 Client
const AwsS3Client = new AWS.S3({
     region: (process.env.AWS_REGION ),
     credentials: {
        accessKeyId: String(process.env.AWS_ACCESS_KEY_ID),
        secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY)
     }
})
module.exports = AwsS3Client;
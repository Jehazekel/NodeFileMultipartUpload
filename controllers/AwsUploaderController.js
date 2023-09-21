require('dotenv').config()
const AwsS3Client = require('../config/AwsS3Client')
const fs = require("fs");
// import s3 client 


let instance
class AwsUploaderController {

  bucketParams
  s3
  readFromPath //part of file on server
  fileSize

  MAX_CHUNK_SIZE = 5 * 1024 * 1024  // 5MB
  startBlock = 0 // for slicing the file
  endBlock = 0 // for slicing the file


  uploadId // Id of the file to be uploaded

  constructor(fileName, fileSize ,filePath) {
    this.bucketParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName
    }

    // import s3 client
    this.s3 = AwsS3Client

    this.
    this.readFromPath = filePath
  }

  getFilePart( startPos ) {
    let endPos = startPos + this.MAX_CHUNK_SIZE > this.fileSize ? this.fileSize : startPos + this.MAX_CHUNK_SIZE
    // Create Read Stream for file
    const fileStream = fs.createReadStream(this.readFromPath, {start : startPos , end : endPos })

    return fileStream
  }

  async uploadToAws() {

    // initiate MultiPartUpload
    try{
      const resp = await this.s3.createMultipartUpload(this.bucketParams)
      
      // set upload Id
      this.uploadId = resp.UploadId

      
      
    } 
    catch( e ){
      console.log(e)

    }

  }

  async uploadPart( partNumber ){

    const currFilePart = getFilePart(partNumber)
    
    //create Upload Part Parameters
    const uploadPartParams = {
      // Bucket: 'STRING_VALUE', /* required */
      // Key: 'STRING_VALUE', /* required */
      // PartNumber: 'NUMBER_VALUE', /* required */
      // UploadId: 'STRING_VALUE', /* required */
      Key: this.bucketParams.Key,
      Bucket: this.bucketParams.Bucket,
      Body: currFilePart,
      UploadId: this.uploadId,
      PartNumber: partNumber,
    }


  }
}
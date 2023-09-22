require('dotenv').config()
const AwsS3Client = require('../config/AwsS3Client')
const fs = require("fs");
const path = require('path');
// import s3 client 


class AwsUploaderController {

  bucketParams
  s3Client
  readFromPath //part of file on server
  fileSize

  MAX_CHUNK_SIZE = 20 * 1024 * 1024  // 100MB
  totalPartsCount // # of chunks to be uploaded
  currPartNumber = 1

  uploadId // Id of the file to be uploaded
  uploadedParts = []

  // Manging 
  pendingRequest = 0
  MAX_CONCURRENT_REQUEST = 2
  REQUEST_TIMEOUT = 300000

  constructor(fileName, fileSize, filePath) {
    this.bucketParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName
    }

    // import s3 client
    this.s3Client = AwsS3Client
    this.fileSize = fileSize
    this.readFromPath = filePath

    this.calculateTotalNumParts();
  }

  //calculate total # of request required to upload file
  calculateTotalNumParts() {
    this.totalPartsCount = Math.ceil(this.fileSize / this.MAX_CHUNK_SIZE);
    console.log('Total Part to be uploaded', this.totalPartsCount)
  }

  async getFilePart(partNumber) {
    try {
      const startPos = partNumber === 1 ? 0 : (partNumber - 1) * this.MAX_CHUNK_SIZE //+ 1
      const end = partNumber * this.MAX_CHUNK_SIZE
      const endPos = end > this.fileSize ? this.fileSize : end

      console.log(`Segment startPos (${startPos}) to end(${endPos})`)
      // Create Read Stream for file
      const fileStream = fs.createReadStream(this.readFromPath, { start: Number(startPos), end: Number(endPos) })

      return fileStream
    }
    catch (e) {
      console.log('Error segmenting file', e)
    }
  }

  async uploadToAws() {

    // initiate MultiPartUpload
    try {
      console.log('Starting Multi Part Initiation')
      const resp = await this.s3Client.createMultipartUpload(this.bucketParams)
      console.log(`Completed Multi Part Initiation ${resp.UploadId} \n\n`)

      // set upload Id
      this.uploadId = resp.UploadId

      // const initialUploads = this.totalPartsCount < 10 ? this.totalPartsCount : 10
      // for (let i = 1; i <= initialUploads; i++) {
      //   this.uploadPart(this.currPartNumber)
      //   this.currPartNumber += 1
      // }

      this.uploadNextPart()

    }
    catch (e) {
      console.log('MultiPart Upload Initiation Error', e)

    }

  }

  uploadNextPart() {
    if (this.pendingRequest + 1 <= this.MAX_CONCURRENT_REQUEST && this.currPartNumber <= this.totalPartsCount) {
      this.uploadPart(this.currPartNumber)
      this.currPartNumber += 1
    }

  }

  async uploadPart(partNumber) {

    try {
      this.pendingRequest += 1

      const currFilePart = await this.getFilePart(partNumber)
      if (!currFilePart)
        return

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

      console.log(`Part #${partNumber} uploading`)

      const resp = await this.s3Client.uploadPart(uploadPartParams, { requestTimeout: this.REQUEST_TIMEOUT })
      
      console.log(`Part #${partNumber} uploaded successfully : ${resp?.ETag} \n\n`)
      this.uploadedParts.push({ ETag: resp?.ETag, PartNumber: uploadPartParams?.PartNumber })

      // Update Pending Request
      this.pendingRequest -= 1


      if (this.uploadedParts?.length === this.totalPartsCount)
        this.completePartsUpload()
      else
        this.uploadNextPart()

    }
    catch (e) {
      console.log('Upload Part Error', e)
      await this.abortFileUpload()
      this.deleteFile()
    }
    // finally {
    // }

  }

  async completePartsUpload() {

    try {
      //sort uploadedParts Arr
      const sortedParts = this.uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);

      const completeParams = {
        // Bucket: 'STRING_VALUE', /* required */
        // Key: 'STRING_VALUE', /* required */
        // UploadId: 'STRING_VALUE', /* required */
        Key: this.bucketParams.Key,
        Bucket: this.bucketParams.Bucket,
        UploadId: this.uploadId,
        MultipartUpload: {
          Parts: sortedParts//[{ ETag: data?.ETag, PartNumber: 1 }] // array of Completed Part 
        }
      }

      const resp = await this.s3Client.completeMultipartUpload(completeParams)

      if (resp?.ETag) {
        console.log(`${this.bucketParams.Key} uploaded Succesfully`)
      }

    }
    catch (e) {
      console.log('Complete Aws multipart upload Error', e)
    }
    finally {
      await this.abortFileUpload()
      this.deleteFile()
    }

  }

  async abortFileUpload() {

    try {
      const resp = await this.s3Client.abortMultipartUpload({

        Key: this.bucketParams.Key,
        Bucket: this.bucketParams.Bucket,
        UploadId: this.uploadId,
      })

      console.log('File Upload Aborted')
    }
    catch (e) {
      console.log('File Upload Abortion error : ', e)
    }
  }

  deleteFile() {
    const filePath = `${path.dirname(__dirname)}\\Uploads\\${this.bucketParams.Key}`
    console.log(`From AWS Controller\n\n File Path to be deleted: ${filePath}`)
    fs.unlink(filePath, function (err) {
      if (err)
        console.log(err);
      else
        console.log("File Removed from server!")

    })
  }
}



module.exports = { AwsUploaderController };
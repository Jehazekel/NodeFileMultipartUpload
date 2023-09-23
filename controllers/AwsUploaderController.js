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

  MAX_CHUNK_SIZE = ( process.env?.MAX_CHUNK_SIZE_IN_MB ?? 100 ) * 1024 * 1024  // 100MB
  totalPartsCount // # of chunks to be uploaded
  currPartNumber = 1

  uploadId // Id of the file to be uploaded
  uploadedParts = []

  // Manging 
  pendingRequest = 0
  MAX_CONCURRENT_REQUEST = process.env?.MAX_CONCURRENT_REQUEST ?? 10
  REQUEST_TIMEOUT = 300000

  fileBuffer
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
    const startPos = partNumber === 1 ? 0 : (partNumber - 1) * this.MAX_CHUNK_SIZE
    const end = partNumber * this.MAX_CHUNK_SIZE
    const endPos = end > this.fileSize ? this.fileSize : end


    return this.fileBuffer?.buffer.slice(startPos, endPos)

    // return new Promise((resolve, reject) => {

    //   const startPos = partNumber === 1 ? 0 : (partNumber - 1) * this.MAX_CHUNK_SIZE 
    //   const end = partNumber * this.MAX_CHUNK_SIZE
    //   const endPos = end > this.fileSize ? this.fileSize : end

    //   console.log(`Segment startPos (${startPos}) to end(${endPos})`)
    //   // Create Read Stream for file
    //   const fileStream =  fs.createReadStream(this.readFromPath, { start: Number(startPos), end: Number(endPos) })

    //   let fileData
    //   fileStream.on('data', (data) => {
    //     if (!fileData)
    //       fileData = data
    //     else
    //       fileData += data
    //   })
    //   fileStream.on('end', () => {
    //     resolve(fileData)
    //     fileStream.close()
    //   })

    //   fileStream.on('error', (e) => {
    //     console.log('Error segmenting file', e)
    //     resolve()
    //     fileStream.close()
    //   })

    // })
  }

  async uploadToAws() {

    // initiate MultiPartUpload
    try {
      console.log('Reading File..')
      this.fileBuffer = await fs.promises.readFile(this.readFromPath)
      console.log('Finish Reading File..\n\n')

      console.log('Starting Multi Part Initiation', new Date().toLocaleTimeString())
      const resp = await this.s3Client.createMultipartUpload(this.bucketParams, { requestTimeout: this.REQUEST_TIMEOUT })
      console.log(`Completed Multi Part Initiation ${resp.UploadId} \n\n`)

      // set upload Id
      this.uploadId = resp.UploadId

      const initialUploads = Math.min( this.MAX_CONCURRENT_REQUEST, this.totalPartsCount ) 
      for (let i = 1; i <= initialUploads; i++) {
        this.uploadPart(this.currPartNumber)
        this.currPartNumber += 1
      }

      // this.uploadNextPart()

    }
    catch (e) {
      console.log(new Date().toLocaleTimeString(), 'MultiPart Upload Initiation Error', e)

      await this.abortFileUpload()
      this.deleteFile()
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
      const currFilePart = await this.getFilePart(partNumber)
      if (!currFilePart)
        return
      // console.log(`CHunk #${partNumber}`, currFilePart)
      this.pendingRequest += 1


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
        ContentLength: currFilePart?.byteLength //Buffer.byteLength(currFilePart)
      }

      console.log(`Part #${partNumber} uploading`, new Date().toLocaleTimeString())

      const resp = await this.s3Client.uploadPart(uploadPartParams, { requestTimeout: this.REQUEST_TIMEOUT })

      if (resp?.ETag) {
        console.log(`Part #${partNumber} uploaded successfully : ${resp?.ETag} \n\n`)
        this.uploadedParts.push({ ETag: resp?.ETag, PartNumber: uploadPartParams?.PartNumber })
      }
      // Update Pending Request
      this.pendingRequest -= 1


      if (this.uploadedParts?.length === this.totalPartsCount)
        this.completePartsUpload()
      else
        this.uploadNextPart()

    }
    catch (e) {
      console.log(new Date().toLocaleTimeString(), 'Upload Part Error', e)
      await this.abortFileUpload()
      this.deleteFile()
    }

  }

  async completePartsUpload() {

    try {
      //sort uploadedParts Arr
      const sortedParts = this.uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);
      console.log('Sorted Parts', sortedParts)
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
      await this.abortFileUpload()
    }
    finally {
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
require('dotenv').config()
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const AwsS3Client = require('../config/AwsS3Client')
const fs = require("fs");
const path = require('path');
// import s3 client 
const { FileDetailsClass } = require('../db/model/FileDetailsClass');


class AwsUploaderController {

  bucketParams
  s3Client
  readFromPath //part of file on server
  fileSize

  MAX_CHUNK_SIZE = (process.env?.MAX_CHUNK_SIZE_IN_MB ?? 5) * 1024 * 1024  // 100MB
  totalPartsCount // # of chunks to be uploaded
  currPartNumber = 1

  uploadId // Id of the file to be uploaded
  uploadedParts = []

  // Manging 
  pendingRequest = 0
  MAX_CONCURRENT_REQUEST = process.env?.MAX_CONCURRENT_REQUEST ?? 10
  REQUEST_TIMEOUT = 300000

  fileBuffer
  useSingleUpload = false
  constructor(fileName, filePath) {
    this.bucketParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName
    }

    // import s3 client
    this.s3Client = AwsS3Client
    this.readFromPath = filePath
    this.fileSize = fs.statSync(this.readFromPath)?.size

    if (this.fileSize > 5 * 1024 * 1024)
      this.calculateTotalNumParts();
    else
      this.useSingleUpload = true
  }


  //calculate total # of request required to upload file
  calculateTotalNumParts() {
    let totalCount = Math.ceil(this.fileSize / this.MAX_CHUNK_SIZE)
    while (totalCount > 1000) {
      this.MAX_CHUNK_SIZE = this.MAX_CHUNK_SIZE * 2
      totalCount = Math.ceil(this.fileSize / this.MAX_CHUNK_SIZE)
    }
    this.totalPartsCount = totalCount
    console.log('Total Part to be uploaded', this.totalPartsCount)
  }


  readBytes(fd, sharedBuffer, startPos) {
    return new Promise((resolve, reject) => {
      fs.read(
        fd,
        sharedBuffer,
        0,
        sharedBuffer.length,
        startPos,
        (err, bytesRead, data) => {
          console.log('Bytes Read', bytesRead)
          if (err) { return reject(err); }
          fs.close(fd);
          resolve(data);
        }
      );
    });
  }

  async getFilePart(partNumber) {
    // METHOD 1
    const stats = fs.statSync(this.readFromPath); // file details
    const fd = fs.openSync(this.readFromPath); // file descriptor

    const startPos = partNumber === 1 ? 0 : (partNumber - 1) * this.MAX_CHUNK_SIZE
    const bufferSize = partNumber * this.MAX_CHUNK_SIZE > stats?.size
      ? stats?.size - startPos
      : this.MAX_CHUNK_SIZE
    this.fileBuffer = Buffer.alloc(bufferSize);
    console.log(`Part #${partNumber} : Start Pos ${startPos} ... end Pos ${startPos + bufferSize}`)
    // console.log('File Stat', stats?.size)
    
    
    return await this.readBytes(fd, this.fileBuffer, startPos)

    // return this.fileBuffer

  }

  async uploadToAws() {

    // initiate MultiPartUpload
    try {

      if (this.useSingleUpload) {
        await this.singleUpload()
        return
      }

      console.log('Starting Multi Part Initiation', new Date().toLocaleTimeString())
      const resp = await this.s3Client.createMultipartUpload({ ...this.bucketParams, ACL: 'public-read' }, { requestTimeout: this.REQUEST_TIMEOUT })
      console.log(`Completed Multi Part Initiation ${resp.UploadId} \n\n`)

      // set upload Id
      this.uploadId = resp.UploadId

      const initialUploads = Math.min(this.MAX_CONCURRENT_REQUEST, this.totalPartsCount)
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
      this.pendingRequest += 1

      //create Upload Part Parameters
      const uploadPartParams = {
        // Bucket: 'STRING_VALUE', /* required */
        // Key: 'STRING_VALUE', /* required */
        // PartNumber: 'NUMBER_VALUE', /* required */
        // UploadId: 'STRING_VALUE', /* required */
        Key: this.bucketParams.Key,
        Bucket: this.bucketParams.Bucket,
        Body: await this.getFilePart(partNumber),
        UploadId: this.uploadId,
        PartNumber: partNumber,

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
        console.log('\n\n\nMulti Resp', resp?.Location)
        
        const fileDetails = await new FileDetailsClass().setFileToSuccessfulUpload( this.bucketParams.Key, resp?.Location)
        console.log(`Successful Upload : ${fileDetails?.uploadIsSuccess}\n Entity Type: ${fileDetails?.entity_type}`)
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


  async singleUpload() {
    try {
      console.log('Initating Single File Upload...', new Date().toLocaleTimeString())
      //create Upload Part Parameters
      const uploadPartParams = {
        // Bucket: 'STRING_VALUE', /* required */
        // Key: 'STRING_VALUE', /* required */
        // PartNumber: 'NUMBER_VALUE', /* required */
        // UploadId: 'STRING_VALUE', /* required */
        Key: this.bucketParams.Key,
        Bucket: this.bucketParams.Bucket,
        Body: await this.getFilePart(1),
        ACL: 'public-read'
      }
      console.log(' Params', uploadPartParams)
      console.log(`Uploading`, new Date().toLocaleTimeString())

      const resp = await this.s3Client.send(
        new PutObjectCommand(uploadPartParams),
        { requestTimeout: this.REQUEST_TIMEOUT }
      )


      
      if (resp?.ETag) {
        console.log(`${this.bucketParams.Key} uploaded Succesfully`)
        // console.log('Single response:', resp)
        const newAwsUrl =  `https://${this.bucketParams?.Bucket ?? process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${this.bucketParams?.Key}`
        console.log('\n\n\nAws File Location:', newAwsUrl)
        
        const fileDetails = await new FileDetailsClass().setFileToSuccessfulUpload( this.bucketParams.Key, newAwsUrl)
        console.log(`Successful Upload : ${fileDetails?.uploadIsSuccess}\n Entity Type: ${fileDetails?.entity_type}`)
      }
    }
    catch (e) {
      console.log('Aws Sinlge file upload Error', e)
      // await this.abortFileUpload()
    }
    finally {
      this.deleteFile()
    }
  }

  deleteFile() {
    // const filePath = `${path.dirname(__dirname)}\\Uploads\\${this.bucketParams.Key}`
    // console.log(`From AWS Controller\n\n File Path to be deleted: ${filePath}`)
    console.log(`From AWS Controller\n\n File Path to be deleted: ${this.readFromPath}`)
    fs.unlink(this.readFromPath, function (err) {
      if (err)
        console.log(err);
      else
        console.log("File Removed from server!")

    })
  }
}



module.exports = { AwsUploaderController };
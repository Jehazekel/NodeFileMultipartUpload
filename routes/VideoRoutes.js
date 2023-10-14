
const express = require('express');
const multer = require("multer");
const VideoRouter = express.Router();
const { attachmentUpload, deleteUploadedFile } = require('../fileUpload');


const { FileDetailsClass } = require('../db/model/FileDetailsClass');
const {
  UploadSmallFile,
  UploadFilePartCreateSession,
  UploadFilePart,
  CompleteUploadFilePart
} = require('../services/requestFunctions');

const FILE_TYPE = 'VIDEO';

// for uploading thumbnails
VideoRouter.post("/:videoId", attachmentUpload, async (req, res, next) => {
  try {
    // request body params

    if (req.file) {

      try {
        //url params
        const {
          videoId
        } = req.params;

        //file name is generated in 'attachmentUpload()' callback
        const uniqueFileId = req?.file?.filename//await generateRandomFileName(req.file.filename);

        // Create file record
        const fileDetails = new FileDetailsClass(videoId, uniqueFileId, FILE_TYPE)
        const saveFileDetails = await fileDetails.create()
        console.log('saved file Details', saveFileDetails)

        // Upload to Aws
        // const awsUploader = new AwsUploaderController(uniqueFileId, req.file.path)
        // awsUploader.uploadToAws()


        // res.send({
        //   success: true,
        //   fileInfo: { uniqueFileName: req.file.filename },
        //   message: 'Uploaded Successfully'
        // })

        if (req?.file?.size < 5 * 1024 * 1024)
          await UploadSmallFile(req, res)

        else
          res.send({
            success: false,
            message: 'Invalid file upload parameters'
          })
      }
      catch (e) {
        console.log(e)
        res.send({
          success: false,
          message: 'An error occured. Unable to save file'
        })

      }

    }
    else {
      res.send({
        success: false,
        message: 'No file recieved'
      })
    }
  }
  catch (e) {
    console.log(e)
  }
})

// recieve thumbnail session initialization request 
VideoRouter.post("/create_session/:videoId", multer().none(), async (req, res, next) => {
  try {

    const {
      fileName,
      fileSize
    } = req.body;

    //url params
    const {
      videoId
    } = req.params;

    req.body.FILE_TYPE = FILE_TYPE

    console.log(req.body)
    if (fileName != null && fileSize != null) {
      console.log('entered')
      
      await UploadFilePartCreateSession(req, res)
    }
    else
      res.send({
        success: false,
        message: 'Invalid session parameters'
      })
  }
  catch (e) {
    res.send({ success: false, message: 'Failed to create video upload session ' });
  }
}
);

// recieve thumbnail multipart file 
VideoRouter.post("/file_parts/:videoId", multer().single('filePart'), async (req, res, next) => {
  try {

    //extract file chunk & generate a sessionId to return
    const {
      sessionId,
      uniqueFileName,
      partNumber,
      isLast
    } = req.body;
    // const filePart = req.file;

    if (uniqueFileName != null && sessionId != null)
      await UploadFilePart(req, res)

    else
      res.send({
        success: false,
        message: 'Invalid file parts parameters'
      })
  }
  catch (e) {
    res.send({ success: false, message: 'Failed to save video file part' });
  }
}
);

// complete thumbnail multipart file 
VideoRouter.post("/complete/:videoId", multer().none(), async (req, res, next) => {
  try {

    const {
      sessionId,
      uniqueFileName,
      lastPartNumber,
      totalFileSize
    } = req.body;

    if (!sessionId || !lastPartNumber || !uniqueFileName)
      return res.send({
        success: false,
        message: 'Invalid complete request'
      })


    else
      await CompleteUploadFilePart(req, res)
  }

  catch (e) {
    res.send({ success: false, message: 'Failed to complete video file parts upload' });
  }
}
);

module.exports = { VideoRouter };


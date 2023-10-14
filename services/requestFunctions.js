
const { AwsUploaderController } = require('../controllers/AwsUploaderController');
const { FilePartController } = require('../controllers/FilePartController');
const { FileUploadSessionClass } = require('../db/model/FileUploadSessionClass');
const { FileDetailsClass } = require('../db/model/FileDetailsClass');

async function UploadSmallFile(req, res) {
  console.log('Enter /upload/:videoId route')
  if (req.file) {

    try {
      // uploadImageToStorage(req.file).then(results => {
      //   res.send(results)
      // });

      //url params
      const {
        videoId
      } = req.params;

      const {
        fileSize
      } = req.body;

      console.log('Req Params :', req?.params)
      console.log('FileSize', fileSize)
      console.log('File', req?.file)

      const uniqueFileId = req?.file?.filename// await generateRandomFileName(req.file.filename);

      const awsUploader = new AwsUploaderController(uniqueFileId, req.file.path)
      awsUploader.uploadToAws()

      // const attachmentPath = req.file.path;
      // console.log(' File To Be Deleted', attachmentPath);


      res.send({
        success: true,
        fileInfo: { uniqueFileName: req.file.filename },
        message: 'Uploaded Successfully'
      })


    } catch (e) {
      console.log(e)
      res.send({
        success: false,
        message: 'An error occured. Unable to save file'
      })
      // res.send(`{"error": "${e}"}`)


    }

  }
  else {
    res.send({
      success: false,
      message: 'No file recieved'
    })
  }
}// END OF UPLOAD SMALL fILE FN


async function UploadFilePartCreateSession(req, res) {
  try {
    const {
      fileName,
      fileSize,
      FILE_TYPE
    } = req.body;

    //url params
    const {
      videoId
    } = req.params;

    console.log(req.body)

    if (fileName != null && fileSize != null) {
      //accept file & generate a sessionId to return
      const { _id, unique_file_name } = await new FileUploadSessionClass(fileName, Number(fileSize)).create();

      
      // Create file record
      const fileDetails = new FileDetailsClass(videoId, unique_file_name, FILE_TYPE)
      const saveFileDetails = await fileDetails.create()
      console.log('saved file Details', saveFileDetails)

      if (_id != null && unique_file_name != null)
        res.send({
          success: true,
          fileInfo: { sessionId: _id, uniqueFileName: unique_file_name }
        })

      else
        res.send({ success: false, message: ' Failed to Create Session Id' });
    }

    else
      res.send({ success: false, message: ' Failed to Create Session Id' });
  }
  catch (e) {
    console.log(' Failed to Create Session Id', e);
    res.send({ success: false, message: ' Failed to Create Session Id' });
  }
}


async function UploadFilePart(req, res) {
  try {
    //extract file chunk & generate a sessionId to return
    const {
      sessionId,
      uniqueFileName,
      partNumber,
      isLast
    } = req.body;
    const filePart = req.file;

    // console.log('File Parts Req Body', req.body);
    // console.log('Req file', req.file);

    // const sessionId = '64e95ea6d5f94db498b5d0b4'
    if (!sessionId || !filePart || !uniqueFileName) {
      return res.send({
        success: false,
        message: 'Invalid request'
      })

    }

    else {
      // //get validate sessionId & find file
      const fileInfo = await new FileUploadSessionClass().findSessionFileInfo(sessionId);



      if (!fileInfo)
        res.send({
          success: false,
          message: 'session Id not found'
        })

      else {
        // // write file chunk to localStorage
        const f = new FilePartController(filePart, uniqueFileName, partNumber);
        await f.saveFileChunk();

        // if (isLast === 'true') {
        //   console.log(`executing merge on ${partNumber}`)
        //   await f.mergeFileParts(partNumber);
        // }
        res.send({
          success: true,
          fileInfo: fileInfo
        })

      }

    }

  }
  catch (e) {
    console.log(' Failed to save file part', e);
    res.send({ success: false, message: ' Failed to save file part' });
  }
}

async function CompleteUploadFilePart(req, res) {
  try {
    //extract file chunk & generate a sessionId to return
    const {
      sessionId,
      uniqueFileName,
      lastPartNumber,
      totalFileSize
    } = req.body;

    if (!sessionId || !lastPartNumber || !uniqueFileName) {
      return res.send({
        success: false,
        message: 'Invalid request'
      })

    }

    else {
      // //get validate sessionId & find file
      const fileInfo = await new FileUploadSessionClass().findSessionFileInfo(sessionId);

      if (!fileInfo)
        res.send({
          success: false,
          message: 'session Id not found'
        })

      else {

        const f = new FilePartController(undefined, uniqueFileName, lastPartNumber);
        console.log(`executing merge on ${lastPartNumber}`)

        // TO Wait on File Merge Completed
        // await f.mergeFileParts(lastPartNumber);

        f.mergeFileParts(lastPartNumber);

        res.send({
          success: true,
          fileInfo: fileInfo
        })

      }

    }

  }
  catch (e) {
    console.log(' Failed to save file part', e);
    res.send({ success: false, message: ' Failed to save file part' });
  }
}


module.exports = { 
  UploadSmallFile,
  UploadFilePartCreateSession,
  UploadFilePart,
  CompleteUploadFilePart
}
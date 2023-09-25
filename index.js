
const express = require('express');
const cors = require("cors")
const path = require('path');  //import the module path
const { attachmentUpload, deleteUploadedFile } = require('./fileUpload');
const { FileUploadSessionClass } = require('./db/model/FileUploadSessionClass');
const { FilePartController } = require('./controllers/FilePartController');

const app = express();
const multer = require("multer");
require('dotenv').config()
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'html');


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Model 
// const FileUploadSession = require('./db/schemas/FileUploadSession');

app.get("/upload", (req, res) => {
  res.header('Content-Type', 'text/html').send(`
  <h1> Upload </h1>

    <form method="POST" action="/upload" enctype="multipart/form-data">
      <input name="file" type="file" />
      <input type="submit" />
    </form>
  `);
})


app.post("/upload", attachmentUpload, (req, res) => {
  console.log(req?.params)
  if (req.file) {

    try {
      // uploadImageToStorage(req.file).then(results => {
      //   res.send(results)
      // });
      res.send("File recieved!")
    } catch (e) {
      res.send(`{"error": "${e}"}`)
    }
    const attachmentPath = req.file.path;
    console.log(' File To Be Deleted', attachmentPath);
    // setTimeout(() => {

    //   deleteUploadedFile(attachmentPath);
    // }, 3000);
  }
  else {
    res.send("No file recieved!")
  }

})


app.post('/upload/create_session', multer().none(), async (req, res) => {
  try {
    const {
      fileName,
      fileSize
    } = req.body;

    console.log(req.body)

    if (fileName != null && fileSize != null) {
      //accept file & generate a sessionId to return
      const { _id, unique_file_name } = await new FileUploadSessionClass(fileName, Number(fileSize)).create();

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
})


app.post('/upload/file_parts', multer().single('filePart'), async (req, res) => {
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
})


app.post('/upload/complete', multer().none(), async (req, res) => {
  try {
    //extract file chunk & generate a sessionId to return
    const {
      sessionId,
      uniqueFileName,
      lastPartNumber ,
      totalFileSize
    } = req.body;
    // const filePart = req.file;

    // console.log('File Parts Req Body', req.body);
    // console.log('Req file', req.file);

    // const sessionId = '64e95ea6d5f94db498b5d0b4'
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
})


app.get('/', (req, res) => {
  res.send('Server is running !')
})
app.listen(3000, () => {

  console.log('3001 is running !' );
  // console.log('S3 Bucket -',  process.env.AWS_S3_BUCKET );
});

const express = require('express');
const cors = require("cors")
const path = require('path');  //import the module path
const { attachmentUpload, deleteUploadedFile } = require('./fileUpload');
const { FileUploadSessionClass } = require('./db/model/FileUploadSessionClass');

const app = express();

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
    setTimeout(() => {

      deleteUploadedFile(attachmentPath);
    }, 3000);
  }
  else {
    res.send("No file recieved!")
  }

})


app.get('/upload/create_session', async (req, res) => {
  try {
    //accept file & generate a sessionId to return
    const {_id , unique_file_name} = await new FileUploadSessionClass().create();

    res.send({
      success: true,
      fileInfo: { sessionId : _id , uniqueFileName : unique_file_name } 
    })
  }
  catch (e) {
    console.log(' Failed to Create Session Id', e);
    res.send({ success: false, message: ' Failed to Create Session Id' });
  }
})


app.get('/upload/file_parts', async (req, res) => {
  try {
    //extract file chunk & generate a sessionId to return
    // const { 
    //   sessionId 

    // } = req.body ;
    // const file = req.file ;


    const sessionId = '64e95ea6d5f94db498b5d0b4'

    //get validate sessionId & find file
    const fileInfo = await new FileUploadSessionClass().findSessionFileInfo(sessionId);

    // write file chunk to localStorage

    if (!fileInfo)
      res.send({
        success: false,
        message: 'Invalid session Id'
      })

    else
      res.send({
        success: true,
        fileInfo: fileInfo
      })
  }
  catch (e) {
    console.log(' Failed to find Session info', e);
    res.send({ success: false, message: ' Failed to find Session info' });
  }
})



app.get('/', (req, res) => {
  res.send('Server is running !')
})
app.listen(3000, () => {

  console.log('3001 is running !');
});
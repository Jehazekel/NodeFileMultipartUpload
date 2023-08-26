// Install packages
// npm i @google - cloud / storage    //dependency to connect to Firebase Cloud Storage
// npm i multer

//const googleStorage = require('@google-cloud/storage');
//const Multer = require('multer');

// const storage = googleStorage({
//   projectId: process.env.GCLOUD_PROJECT_ID,
//   keyFilename: process.env.GCLOUD_PRIVATE_KEY  // generate from firebase "project settings/ service accounts"
// });

const fs = require("fs");
const path = require('path');  //import the module path
const rootDirectory = path.dirname(require.main.filename ); //returns the directory name of the file that is running aka "app.js" parent folder
const multer = require("multer"); //for handleing Multipart forms ONLY

//Setting Up local storage for file

//Set a storage engien to store recieved files locally
const localStorage = multer.diskStorage({
    destination: function(req, file, callback){
        //call back( error, destination)
        if ( file )
        callback(null, path.join(rootDirectory, 'Uploads'));  //store in firebase folder
    },
    filename: function (req, file, callback){
        //callback( error, fileName)
        
        if ( file ){
          const newFileName = `${Date.now()}${path.extname(file.originalname)}` ;
          console.log( 'New File Name', newFileName)
          
          // callback(null, `${file.originalname}`);
          callback(null, newFileName);
        }
        
        //callback(null, `${req.body.name.toLowerCase().replace(" ","_")}.${file.originalname.split('.')[1]}`);
    }
});

const attachmentUpload = multer({
    storage:localStorage,
}).single("file")  //name of multipart form field to process 

//To remove file off the server
function deleteUploadedFile(attachmentPath){
    let filePath =  attachmentPath
    console.log(`\n\nFile Path to be deleted: ${filePath}`)
    fs.unlink( filePath, function(err){
        if(err)
            console.log(err);
        else
            console.log("File Removed from server!")

    })
}





module.exports = { attachmentUpload, deleteUploadedFile};
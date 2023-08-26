
const {mongoose} = require('../script') ;

//creatre schema : this defines the structure of the data
const FileUploadSessionSchema = new mongoose.Schema({
  // file_session_id : {
  //   required : true ,
  //   type : String
  // } ,
  original_file_name : {
    required : true ,
    type : String
  } ,
  unique_file_name :{
    required : true ,
    type : String
  } ,
  file_size : {
    required : true ,
    type : Number
  } ,
  file_extension : String ,
  createdAt : {
    type : Date ,
    default : new Date() 
  }
  
})

// create the model : is like an instance to interact with the Schema
module.exports = mongoose.model("FileUploadSession", FileUploadSessionSchema);

const {mongoose} = require('../script') ;

//creatre schema : this defines the structure of the data
const FileDetailsSchema = new mongoose.Schema({
  unique_file_name :{
    required : true ,
    type : String
  } ,
  video_entity_id : {
    required : true ,
    type : String
  } ,
  entity_type : {   // 'VIDEO' | 'THUMBNAIL'
    required : true ,
    type : String
  } ,
  uploadIsSuccess : {
    type : Boolean ,
    default : false
  },
  link : String ,
  createdAt : {
    type : Date ,
    default : new Date() 
  }
  
})

// create the model : is like an instance to interact with the Schema
module.exports = mongoose.model("FileDetails", FileDetailsSchema);
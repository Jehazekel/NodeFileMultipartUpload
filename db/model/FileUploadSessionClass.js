

const uuidv4 = require('uuid').v4;
// Model 
const FileSessionModel = require('../schemas/FileUploadSession');
const { mongoose } = require('../script');

class FileUploadSessionClass {

  ext = ''
  uniqueFileId = ''
  fileName = ''
  fileSize = 0

  constructor() {
    // super(FileSessionModel)
    // this.model = mongoose.model<Model<Document>>(this.constructor.name, FileSessionModel);

    // Use path to get file extension
    this.ext = '.jpg' //getFileExtension(this.file.filename)
    // generate newFile name
    this.uniqueFileId = this.createUniqueFileName(this.ext);
    // get file name
    this.fileName = 'Test.jpg'
    // get file size
    this.fileSize = 10


    // model =  new FileSessionModel({
    //   'file_session_id': sessionId,
    //   'unique_file_name': uniqueFileId,
    //   'original_file_name': filename,
    //   'file_size': fileSize,
    //   'file_extension': ext
    // })
  }


  validateSessionId(uuid) {
    return;
  }


  getFileExtension(fileName) { //accepts string
    return path.extname(fileName) //returns string

  }

  createUniqueFileName(fileExtension) {
    const timeStamp = new Date().toISOString().replace(/[-:.TZ]/g, "")
    return `${uuidv4()}_${timeStamp}${fileExtension}`
  }

  async create() {
    const newSessionInfo = {
      // 'file_session_id': this.sessionId,
      original_file_name: this.fileName,
      unique_file_name: this.uniqueFileId,
      file_size: this.fileSize,
      file_extension: this.ext
    };

    console.log('Info for new session ', newSessionInfo)
    const newSession = await FileSessionModel.create(newSessionInfo)

    console.log(newSession);

    return newSession //return the session id
  }

  async findSessionFileInfo( sessionId ){ //string 
    // const query = FileSessionModel.findOne(
    //   { _id : sessionId}
    // );
    // query.select('_id unique_file_name file_extension')
    // const fileInfo = await query.exec() ;
    
    const fileInfo = FileSessionModel.findById(sessionId);

    console.log('FIle info', fileInfo) ;
    return fileInfo
  }
}


module.exports = { FileUploadSessionClass }
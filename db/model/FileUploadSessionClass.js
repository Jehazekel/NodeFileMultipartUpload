

const uuidv4 = require('uuid').v4;
const path = require('path')

// Model 
const FileSessionModel = require('../schemas/FileUploadSession');
const { mongoose } = require('../script');

class FileUploadSessionClass {

  ext = ''
  uniqueFileId = ''
  fileName = ''
  fileSize = 0

  constructor(fileName, fileSize) {
    // super(FileSessionModel)
    // this.model = mongoose.model<Model<Document>>(this.constructor.name, FileSessionModel);

    // Use path to get file extension
    this.ext = '.' + (`${fileName}`.split('.')).pop(); //'.jpg' //getFileExtension(this.file.filename)
    // generate newFile name
    this.uniqueFileId = this.createUniqueFileName(this.ext);
    // get file name
    this.fileName = fileName
    // get file size
    this.fileSize = fileSize


    // model =  new FileSessionModel(trlpblf[vrl;000000;vlb[ykh;lzdasdsesdxdxcvkgihu{
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

    if (this.fileName?.length > 0 && this.fileSize != null) {
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

    return {}
  }

  async findSessionFileInfo(sessionId) { //string 
    // const query = FileSessionModel.findOne(
    //   { _id : sessionId}
    // );
    // query.select('_id unique_file_name file_extension')
    // const fileInfo = await query.exec() ;

    const fileInfo = FileSessionModel.findById(sessionId);

    console.log('FIle info', fileInfo);
    return fileInfo
  }
}


module.exports = { FileUploadSessionClass }
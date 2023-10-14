

const uuidv4 = require('uuid').v4;
const path = require('path')

// Model 
const FileDetailsModel = require('../schemas/FileDetails');
const { mongoose } = require('../script');

class FileDetailsClass {

  videoEntityId = ''
  uniqueFileId = ''
  entityType = ''

  constructor(videoEntityId, uniqueFileId, entityType) {
    // super(FileDetailsModel)
    // this.model = mongoose.model<Model<Document>>(this.constructor.name, FileDetailsModel);

    // id for the video object
    this.videoEntityId = videoEntityId
    // generated externally 
    this.uniqueFileId = uniqueFileId
    // : 'VIDEO' | 'THUMBNAIL' 
    this.entityType = entityType

  }


  async create() {

    if (this.uniqueFileId?.length > 0 && this.videoEntityId != null) {
      const fileInfo = {
        video_entity_id: this.videoEntityId,
        unique_file_name: this.uniqueFileId,
        entity_type: this.entityType
      };

      // console.log('Info for new session ', newSessionInfo)
      const newFileDetails = await FileDetailsModel.create(fileInfo)

      console.log('Created Session info', newFileDetails);

      return newFileDetails //return the session id
    }

    return {}
  }

  async findFileDetailsInfo(fileId) { //string 
    const query = FileDetailsModel.findOne(
      { _id: fileId }
    );
    query.select('_id unique_file_name video_entity_id entity_type uploadIsSuccess awsUrl')
    const fileInfo = await query.exec();

    return fileInfo
  }

  
  async getFileDetailsByUniqueName(fileName) { //string 
    const query = FileDetailsModel.findOne(
      { unique_file_name: fileName }
    );
    query.select('_id unique_file_name video_entity_id entity_type uploadIsSuccess awsUrl')
    const fileInfo = await query.exec();

    return fileInfo
  }

  async setFileToSuccessfulUpload(fileId, awsUrl) { //string 
    const query = FileDetailsModel.updateOne(
      { unique_file_name: fileId },
      { uploadIsSuccess: true, link: awsUrl }
    );
    // query.select('_id unique_file_name video_entity_id entity_type isSuccessUpload ')
    const fileInfo = await query.exec();
    
    return await this.getFileDetailsByUniqueName(fileId);
   
  }




}


module.exports = { FileDetailsClass }
import { sendGetRequest, sendPostRequest } from "../../../services/defaultHTTPRequest"


class FileService {

  private createSessionUrl: string = 'http://localhost:3000/upload/create_session'
  private uploadPartsUrl: string = 'http://localhost:3000/upload/file_parts'
  private completeUploadPartsUrl: string = 'http://localhost:3000/upload/complete'
  private uploadEntireFileUrl: string = 'http://localhost:3000/upload'

  //private variables
  private file: File | undefined = undefined
  private chunks: Blob[] = []
  private fileName: string = ''
  private fileSize: number = 0
  private fileType: string = ''
  private fileSessionId: string = ''
  private uniqueFileName: string = '' // filename on the server

  private maxChunkSize: number = 5 * 1024 * 1024 //5242880 //5 mb  //20971520 //2Gb per chunk
  private totalSentBlockCount = 0 // to keep track of the # of chunks upload so far

  private startBlock: number = 0 // for slicing the file
  private endBlock: number = 0 // for slicing the file

  private maxConcurrentReq: number = 10 // # of simultaneousrequest allowed
  private numPendingRequest: number = 0    // # of open requests
  private failedRequest: { [key: string]: { reattempts: number } } = {} // where the key is the partNumber

  private maxRetries: number = 3
  private retries: number = 0       //number of fail file part resent
  private useMultipartUpload = false

  constructor(file: File) { //takes the 'File' type

    //set file details 
    this.fileName = file.name
    this.fileSize = file.size
    this.fileType = file.type

    if (file.size > this.maxChunkSize) { //get chunks
      this.useMultipartUpload = true

      let totalCount = Math.ceil(file.size / this.maxChunkSize)
      while (totalCount > 1000) {
        this.maxChunkSize = this.maxChunkSize * 10
        totalCount = Math.ceil(file.size / this.maxChunkSize)
      }

      this.endBlock = this.maxChunkSize;
      while (this.startBlock < file.size) {
        this.chunks.push(file.slice(this.startBlock, this.endBlock));
        this.startBlock = this.endBlock
        this.endBlock = this.startBlock + this.maxChunkSize;
      }
      console.log('New Chunks', this.chunks);
    }
    else {
      this.file = file // saves the file
      console.log('New File', this.file);
    }

  }

  // private method

  private getFileName() {

    return this.fileName;
  }

  private getFileSize() {

    return this.fileSize;
  }


  private getFileSegmentByBlockCount(fileBlockCount: number) {

    const blob = this.chunks[fileBlockCount]
    return blob
  }


  private setFileUploadSessionId(id: string) {

    return this.fileSessionId = id;
  }

  private setUniqueFileName(name: string) {

    return this.uniqueFileName = name;
  }

  private addPendingFilePartRequest() {
    if (this.numPendingRequest <= this.maxConcurrentReq)
      this.numPendingRequest += 1
  }

  private removePendingFilePartRequest() {
    if (this.numPendingRequest > -1)
      this.numPendingRequest -= 1
  }

  public async createMultiPartFileUploadSession() {
    const requestBody = {
      fileName: this.getFileName(),
      fileSize: this.getFileSize()
    };

    const resp = await sendPostRequest(this.createSessionUrl, requestBody);

    console.log(resp)
    return resp
  };

  public async uploadFile() {
    //make http request to CreateFileMultiPartsUploadSession

    if (!this.file && this?.chunks?.length === 0) {
      //return message
      console.log('No File found!', this.file)
      return;
    }

    if (this.useMultipartUpload)
      this.uploadFileInParts();
    else
      this.uploadEntireFile();

  }

  async uploadEntireFile() {
    console.log('Uploading Entire File..');
    const requestBody = {
      file: this.file
    };
    const resp = await sendPostRequest(this.uploadEntireFileUrl, requestBody);

  }

  async uploadFileInParts() {
    console.log('Uploading In Parts..');
    const resp = await this.createMultiPartFileUploadSession();
    console.log(resp);

    //if sessionId not obtain
    if (!resp?.success) {
      // return message 
      console.log('Invalid Request')
      return
    }

    //store response { fileSessionId : string }
    this.setFileUploadSessionId(resp?.fileInfo?.sessionId);
    this.setUniqueFileName(resp?.fileInfo?.uniqueFileName);
    const max = Math.min(this.maxConcurrentReq, this.chunks?.length - 1)
    console.log('Max concurrent request', max);

    //Iterate through unusedRequest, get chunk & send File Parts 
    // this.uploadFilePart(0);
    for (let i = 0; i < max; i++) {
      this.uploadFilePart(i);
      this.addPendingFilePartRequest();
      this.totalSentBlockCount += 1
    }

    // -- on success send next part ( fileBlockCount + 1)

    // if failed (resend file segmentpartNumber ) where maxRetries <= maxRetries

    // console.log('upload completed');
  }

  async uploadFilePart(partNumber: number) {
    //get block 
    const currBlock = this.getFileSegmentByBlockCount(partNumber);

    const requestBody = {
      filePart: currBlock,
      sessionId: this.fileSessionId,
      uniqueFileName: this.uniqueFileName,
      partNumber: partNumber,
      isLast: partNumber === this.chunks?.length - 1
    }
    console.log(requestBody)
    const resp = await sendPostRequest(this.uploadPartsUrl, requestBody, false);

    this.removePendingFilePartRequest();
    if (resp?.success) {
      this.uploadNextPart();
    }
    else // retry uploading chunk
      this.reuploadFilePart(partNumber);

    console.log(resp)
    return resp
  }

  uploadNextPart() {
    console.log('\n\n\nBlock Count', this.totalSentBlockCount)
    console.log('Pending Req Count', this.numPendingRequest)
    console.log('Chunks Count', this.chunks?.length)
    if (this.totalSentBlockCount  <= this.chunks?.length - 1 && this.retries <= this.maxRetries) {
      this.uploadFilePart(this.totalSentBlockCount)
      this.totalSentBlockCount += 1
      this.addPendingFilePartRequest();
    }
    else if (this.numPendingRequest === 0 && this.totalSentBlockCount === this.chunks?.length )
      this.completeUploadParts(this.totalSentBlockCount - 1)

  }

  reuploadFilePart(partNumber: number) {
    if (this.retries <= this.maxRetries) {
      this.uploadFilePart(partNumber)
      this.addPendingFilePartRequest();
      this.retries += 1
    }
    else
      console.log('MAx Retries exceed!')
  }


  async completeUploadParts(lastPartNumber: number) {
    if (lastPartNumber != this.chunks?.length - 1) {
      console.log('Can only complete after all responses are successfull');
      return { success: false, message: 'Invalid request' }
    }
    const requestBody = {
      sessionId: this.fileSessionId,
      uniqueFileName: this.uniqueFileName,
      lastPartNumber: lastPartNumber ,
      totalFileSize : this.fileSize
    }
    console.log(requestBody)
    const resp = await sendPostRequest(this.completeUploadPartsUrl, requestBody, false);

    if (resp?.success) {
      console.log('Completed Successfully!\n\n')
    }

    console.log(resp)
    return resp
  }
}


export { FileService }


class FileService {
  
  //private variables
  file 
  fileSessionId = 0
  fileName = ''
  totalFileBlocks = 0
  maxFileBlockSize = 20971520 //2Gb per chunk
  fileBlockCount = 0 // tp keep track of the # of chunks upload so far

  startBlock = 0 // for slicing the file
  endBlock = 0 // for slicing the file

  constructor( file ){ //takes the 'File' type
    this.file = file // saves the file
    this.setTotalFileBlocks();
  }

  // private method
  setTotalFileBlocks() {
    this.totalFileBlocks = ( this.file?.size / this.maxFileBlockSize) ;
  }

  async uploadFile( ){ 
    //make http request to CreateFileMultiPartsUploadSession
    
    //store response { fileSessionId : string }

    //sendParts : { fileSessionId , fileName , isLastBlock , file }
    console.log('upload completed') ;
  }

}

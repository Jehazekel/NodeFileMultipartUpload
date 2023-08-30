
const fs = require('fs') ;

class FilePartController{ 

  fileName = ''
  fileChunk 


  constructor( filePart , fileName ) {
    this.fileChunk = filePart 
    this.fileName = fileName 
     
  }


  async writeFileToStream( ){

    return await new Promise( (resolve , reject )=>{
      // console.log(' Writing file chunk', this.fileChunk);
      const blobBuffer = this.fileChunk.buffer ;
      
      const fileStream = fs.createWriteStream(
        `${__dirname}/../Uploads/${this.fileName}`,
        {
            flags: 'a'
        } 
      ) ;

      fileStream.write(blobBuffer ) 

      fileStream.on('error', (e)=>{
        console.log('error occured while writing to stream')
        reject(false);
      })

      fileStream.on('finish', () => resolve(true) ) ;
      fileStream.end() ;

    }) ;
  }



}

module.exports = {FilePartController} ;
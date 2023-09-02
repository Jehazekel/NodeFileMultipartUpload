
const fs = require('fs');
const path = require('path')

class FilePartController {

  fileName = ''
  fileChunk
  partNumber

  //for reading files
  lastPartNumber
  currSegmentNumber = 0

  constructor(filePart, fileName, partNumber) {
    this.fileChunk = filePart
    this.fileName = fileName
    this.partNumber = partNumber

  }


  // remove the extension & concat the remaining strings
  getSegmentFilePath(partNumber) {
    // remove the extension & concat the remaining strings
    const strArr = this.fileName.split('.')
    strArr.pop()
    const folderName = strArr.join('.')
    const ext = this.fileName.split('.').pop()
    const segmentsFilePath = `${path.dirname(__dirname)}\\Segments\\${folderName}\\chunk_${partNumber}.${ext}`;

    return segmentsFilePath
  }


  async ensureDirectoryExistence(filePath) {

    return await new Promise(async (resolve, reject) => {
      var dirname = path.dirname(filePath);
      // console.log('\n\n\nDir', dirname);
      if (fs.existsSync(dirname)) {
        // console.log('\n\n\nPath exists')
        resolve(true);
      }
      else {
        fs.mkdirSync(dirname);
        // await this.ensureDirectoryExistence(dirname);
        resolve(true);

      }
    });
  }

  async writeFileToStream(filePath, blobBuffer) {

    await this.ensureDirectoryExistence(filePath);

    return await new Promise((resolve, reject) => {

      const fileStream = fs.createWriteStream(
        filePath,
        {
          flags: 'a'
        }
      );

      fileStream.write(blobBuffer)

      fileStream.on('error', (e) => {
        console.log('error occured while writing to stream', e);
        reject(false);
      })

      fileStream.on('finish', () => {
        resolve(true)

      }
      );
      fileStream.end();

    });
  }

  //for saving the file chunks in a folder where the folder name is the fileName
  async saveFileChunk() {

    const segmentsFilePath = this.getSegmentFilePath(this.partNumber);

    // console.log(' Writing file chunk', this.fileChunk);
    const blobBuffer = this.fileChunk.buffer;
    // console.log('Blob', blobBuffer);

    return await this.writeFileToStream(segmentsFilePath, blobBuffer);
  }

  //used to concat a chunk to the final filepath
  async appendFileParts(blobBuffer) {
    const filePath = `${path.dirname(__dirname)}\\Uploads\\${this.fileName}`;
    console.log(' Appending file chunk', blobBuffer);

    return await this.writeFileToStream(filePath, blobBuffer);
  }

  async readFileChunks(currPartNumber) {
    const isSuccess = await new Promise((resolve, reject) => {
      console.log(' Reading Chunk ', currPartNumber)
      const onError = () => { console.log('Finished w err\n\n\n'); reject(false) }
      const onSuccess = () => { console.log('Finished\n\n\n'); resolve(true);}

      //create read stream
      const segmentsFilePath = this.getSegmentFilePath(currPartNumber);

      //create write stream to pipe to 
      const writeTofilePath = `${path.dirname(__dirname)}\\Uploads\\${this.fileName}`;
      const writeStream = fs.createWriteStream(
        writeTofilePath,
        {
          flags: 'a'
        }
      );

      const readStream = fs.createReadStream(segmentsFilePath)
      readStream.pipe(writeStream);
      console.log(`Reading from \n ${segmentsFilePath} \n to \n${writeTofilePath}\n\n`)
      // readStream.on('end', ()=>resolve(true));
      readStream.on('error', onError)

      writeStream.on('error', (e) => {
        console.log('error occured while writing to stream', e);
        reject(false);
      })

      writeStream.on('finish', onSuccess);

      //write chunk final file
      // readStream.on('data', async (chunk) => await this.appendFileParts(chunk))



    });

    if (isSuccess)
      return await this.readNextFile(currPartNumber + 1);

    else
      return false
  }

  async readNextFile(nextPartNumber) {
    let isSuccess = false
    if (nextPartNumber <= this.lastPartNumber) {
      console.log('Calling next', nextPartNumber)
      return await this.readFileChunks(nextPartNumber)
    }
    else if (nextPartNumber > this.lastPartNumber) {// complete merge
      this.deleteUploadedChunks();
      return true
    }
    else
      return false

  }

  //To remove file off the server
  deleteUploadedChunks() {

    // remove the extension & concat the remaining strings
    const strArr = this.fileName.split('.')
    strArr.pop()
    const folderName = strArr.join('.')
    const filePath = `${path.dirname(__dirname)}\\Segments\\${folderName}`;

    console.log(`\n\nSegment File Path to be deleted: ${filePath}`)
    // fs.unlink(filePath, function (err) {
    //   if (err)
    //     console.log(err);
    //   else
    //     console.log("File Segments Removed from server!")

    // })

    fs.rm(filePath, { recursive: true, force: true }, err => {
      if (err) {
        console.log('Error while deleting segments', err);
      }
    
      console.log(`${filePath} is deleted!`);
    });
  }

  async mergeFileParts(lastPartNumber) {
    this.lastPartNumber = lastPartNumber;
    //when completeMultiPart Upload is called, read all files from the folder & write to one file 

    return await this.readFileChunks(0);

  }



}

module.exports = { FilePartController };
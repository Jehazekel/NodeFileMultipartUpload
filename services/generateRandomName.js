
const uuidv4 = require('uuid').v4;
const generateRandomFileName =  async(fileName )=>{
  const fileExtension = '.' + (`${fileName}`.split('.')).pop(); //'.jpg' 
    
  const timeStamp = new Date().toISOString().replace(/[-:.TZ]/g, "")
  return Promise.resolve(`${uuidv4()}_${timeStamp}${fileExtension}`)
}

module.exports = { generateRandomFileName }
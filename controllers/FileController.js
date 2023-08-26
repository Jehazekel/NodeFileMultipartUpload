
let instance
class FileController {

  static getInstance() {
    if (instance === null) {
      instance = new FileController()
      return instance
    }

    return instance
  }

  async uploadToAws( ){

  }
}
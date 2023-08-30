## Node Server File Upload using Single File upload & Multipart Upload


### File upload 
- For Single file upload use (\upload) 

- For accepting a file in chunks 
  1. Request FileUploadSessionId ( /upload/create_session )
   ```
   - Request Params {
      fileName : string 
      fileSize : number
    }
   - Response ( on success) {
      success :  boolean 
      fileInfo: { 
        sessionId: _id, 
        uniqueFileName: unique_file_name
      }
    }
    - Response ( on error) {
      success :  boolean 
      message: string
    }
    ```
  2. Using sessionId upload file chunks as blobs ( /upload/file_parts )
   ```
   - Request Params {
      sessionId : string 
      uniqueFileName : string
      partNumber : number
      isLast : boolean
    }
   - Response ( on success) {
      success :  boolean 
      fileInfo: { 
        sessionId: _id, 
        uniqueFileName: unique_file_name
      }
    }
    - Response ( on error) {
      success :  boolean 
      message: string
    }
    ```
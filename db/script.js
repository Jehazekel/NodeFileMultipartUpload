
const mongoose = require('mongoose');
require('dotenv').config();

// const mongooseSchema = mongoose.Schema;


mongoose.connect(process.env.MONGO_DB_URL).then(
  () => {
    console.log('COnnected to MongoDb')
  }).catch(
    e => console.log(e)

  );


module.exports = { mongoose };
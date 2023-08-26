
const mongoose = require('mongoose');

// const mongooseSchema = mongoose.Schema;

mongoose.connect("mongodb://0.0.0.0:27017/Test").then(
  () => {
    console.log('COnnected to MongoDb')
  }).catch(
    e => console.log(e)

  );


module.exports = { mongoose };
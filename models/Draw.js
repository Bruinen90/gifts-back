const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DrawSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  date: {
    // type: Date,
    type: String,
    required: true
  },
  creatorsID: {
    // type: Schema.Types.ObjectId,
    type: String,
    required: true
  },
  participantsIDs: {
    // type: [Schema.Types.ObjectId]
    type: [String]
  }
});

module.exports = mongoose.model("Draw", DrawSchema);

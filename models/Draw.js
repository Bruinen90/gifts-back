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
    type: Date,
    required: true
  },
  creatorsID: {
    type: Schema.Types.ObjectId,
    required: true
  },
  participantsIDs: {
    // type: [Schema.Types.ObjectId]
    type: [String]
  }
});

module.exports = mongoose.model("Draw", DrawSchema);

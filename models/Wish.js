const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WishSchema = new Schema({
  title: { type: String, required: true },
  link: String,
  description: String,
  userID: { type: Schema.Types.ObjectId, required: true }
});

module.exports = mongoose.model("Wish", WishSchema);

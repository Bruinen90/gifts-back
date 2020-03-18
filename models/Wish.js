const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WishSchema = new Schema({
  title: { type: String, required: true },
  link: String,
  description: String
});

module.exports = mongoose.model("Wish", WishSchema);

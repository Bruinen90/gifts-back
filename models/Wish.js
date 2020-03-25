const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WishSchema = new Schema({
    title: { type: String, required: true },
    link: String,
    description: String,
    price: Number,
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true }
});

module.exports = mongoose.model("Wish", WishSchema);

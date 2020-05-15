const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const crypto = require("crypto");

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    passwordResetToken: String,
    passwordResetTokenExpDate: Date,
    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    unsubscribed: { type: Boolean, default: false },
    emailLinksToken: {
        type: String,
        default: crypto.randomBytes(20).toString("hex"),
    },
});

module.exports = mongoose.model("User", UserSchema);

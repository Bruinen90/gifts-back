const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
	friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	unsubscribed: { type: Boolean, default: false },
});

module.exports = mongoose.model('User', UserSchema);

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
	}
	// draws: {
	// 	type: [{ type: Schema.Types.ObjectId, ref: 'Draw' }],
	// },
	// wishes: {
	// 	type: [{ type: Schema.Types.ObjectId, ref: 'Wish' }],
	// },
});

module.exports = mongoose.model('User', UserSchema);

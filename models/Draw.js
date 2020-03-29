const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DrawSchema = new Schema({
	title: {
		type: String,
		required: true,
	},
	price: {
		type: Number,
		required: true,
	},
	date: {
		type: Date,
		required: true,
	},
	creator: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	participants: {
		type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	},
	status: 'pending' | 'done' | 'archived',
	results: [
		{
			giver: { type: Schema.Types.ObjectId, ref: 'User' },
			getter: { type: Schema.Types.ObjectId, ref: 'User' },
			gift: { type: Schema.Types.ObjectId, ref: 'Wish' },
		},
	],
});

module.exports = mongoose.model('Draw', DrawSchema);

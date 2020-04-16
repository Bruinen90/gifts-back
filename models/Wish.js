const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WishSchema = new Schema({
	title: { type: String, required: true },
	link: String,
	imageUrl: String,
	description: String,
	price: Number,
	creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	buyer: { type: Schema.Types.ObjectId, ref: 'User' },
	forDraw: { type: Schema.Types.ObjectId, ref: 'Draw'},
	reserved: { type: Boolean, default: false },
});

module.exports = mongoose.model('Wish', WishSchema);

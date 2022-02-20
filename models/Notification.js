const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema(
	{
		receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		type: { type: String, requried: true },
		content: { type: String, required: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);

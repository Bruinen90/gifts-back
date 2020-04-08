const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InvitationSchema = new Schema({
	sender: { required: true, type: Schema.Types.ObjectId, ref: 'User' },
	receiver: { required: true, type: Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('Invitation', InvitationSchema);

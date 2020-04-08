// Models
const Invitation = require('../../models/Invitation');

// Errors
const throwAuthError = errorMessage => {
	const error = new Error(errorMessage || 'Not authenticated');
	error.code = 401;
	throw error;
};

const throwServerError = errorMessage => {
	const error = new Error(
		errorMessage || 'Internal server error, please try again later'
	);
	error.code = 500;
	throw error;
};

module.exports = {
	sendInvitation: async ({ receiverId }, req) => {
		if (!req.userId) {
			throwAuthError();
		}
		const newInvitation = await new Invitation({
			sender: req.userId,
			receiver: receiverId,
		});
		await newInvitation.save();
		if (!newInvitation) {
			throwServerError(
				'Error during invitation creation, please try again later'
			);
		}
		return { _id: newInvitation._id };
	},
};

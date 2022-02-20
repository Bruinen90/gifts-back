// Models
const Notification = require('../../models/Notification');

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
	getUserNotifications: async (_, req) => {
		const { userId } = req;
		if (!userId) {
			console.log('No req token provided!');
			throwAuthError();
		}
		try {
			const userNotifications = await Notification.find({
				receiver: userId,
			});
			if (!userNotifications || userNotifications.length === 0) {
				return [];
			}
			return userNotifications.map(notification => ({
				type: notification.type,
				content: notification.content,
				createdAt: notification.createdAt,
			}));
		} catch (err) {
			console.log(err);
		}
	},
};

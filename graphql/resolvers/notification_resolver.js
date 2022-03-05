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
				read: notification.read,
			}));
		} catch (err) {
			console.log(err);
		}
	},
	setNotificationAsRead: async ({ notificationId }, req) => {
		const { userId } = req;
		if (!userId) {
			console.log('No req token provided!');
			throwAuthError();
		}
		try {
			const readNotification = await Notification.findById(
				notificationId
			);
			if (readNotification.receiver !== userId) {
				throwAuthError();
			}
			readNotification.read = true;
			await readNotification.save();
			return { success: true };
		} catch (err) {
			console.log(err);
			return { success: false };
		}
	},
	setAllUsetNotificationsAsRead: async (_, req) => {
		const { userId } = req;
		try {
			if (!userId) {
				console.log('No req token provided!');
				throwAuthError();
			}
			const notifications = await Notification.find({ receiver: userId });
			for (let notification of notifications) {
				notification.read = true;
				await notification.save();
			}
			return { success: true };
		} catch (err) {
			console.log(err);
		}
	},
};

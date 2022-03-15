// Models
const Invitation = require('../../models/Invitation');
const User = require('../../models/User');
const Notification = require('../../models/Notification');

// Notification generator
const notificationGenerator = require('./notification_generator');

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
		try {
			if (!req.userId) {
				throwAuthError();
			}
			const existingInvitation = await Invitation.findOne({
				sender: req.userId,
				receiver: receiverId,
			});
			if (existingInvitation) {
				const error = new Error(
					'You already invited that user, please be patient and wait for response'
				);
				error.code = 401;
				throw error;
			}
			const newInvitation = await new Invitation({
				sender: req.userId,
				receiver: receiverId,
			});
			await newInvitation.save();
			const sender = await User.findById(req.userId);
			await notificationGenerator({
				type: 'invitation',
				params: {
					username: sender.username,
				},
				receiver: receiverId,
			});
			if (!newInvitation) {
				throwServerError(
					'Error during invitation creation, please try again later'
				);
			}
			return { _id: newInvitation._id };
		} catch (err) {
			console.log(err);
		}
	},

	getUserInvitations: async (_, req) => {
		if (!req.userId) {
			throwAuthError('Please loggin and try again');
		}
		const receivedInvitations = await Invitation.find({
			receiver: req.userId,
		})
			.populate('sender')
			.exec();
		const sentInvitations = await Invitation.find({ sender: req.userId })
			.populate('receiver')
			.exec();
		return { received: receivedInvitations, sent: sentInvitations };
	},

	setInvitationResponse: async ({ response }, req) => {
		const { invitationId, decision } = response;
		if (!req.userId) {
			throwAuthError('Please loggin and try again');
		}
		try {
			if (decision === 'cancel') {
				const respondedInvitation = await Invitation.findOneAndDelete({
					_id: invitationId,
					sender: req.userId,
				});
				// Delete notification related to that invitation
				const senderUser = await User.findById(req.userId);
				await Notification.deleteOne({
					receiver: respondedInvitation.receiver,
					type: 'invitation',
					content: { $regex: senderUser.username },
				});
				if (!respondedInvitation) {
					throwAuthError(
						'There was a problem with your invitation, please try again later'
					);
				}
			} else if (decision === 'reject') {
				const respondedInvitation = await Invitation.deleteOne({
					_id: invitationId,
					receiver: req.userId,
				});
				if (!respondedInvitation) {
					throwAuthError(
						'There was a problem with your invitation, please try again later'
					);
				}
			} else if (decision === 'accept') {
				const respondedInvitation = await Invitation.findOne({
					_id: invitationId,
					receiver: req.userId,
				});
				if (!respondedInvitation) {
					throwAuthError(
						'There was a problem with your invitation, please try again later'
					);
				}
				const sender = await User.findById(respondedInvitation.sender);
				const receiver = await User.findById(
					respondedInvitation.receiver
				);
				sender.friends.push(respondedInvitation.receiver);
				await sender.save();
				receiver.friends.push(respondedInvitation.sender);
				await receiver.save();
				await notificationGenerator({
					type: 'invitationAccept',
					params: {
						username: receiver.username,
					},
					receiver: respondedInvitation.sender,
				});
				await Invitation.deleteOne({
					_id: invitationId,
					receiver: req.userId,
				});
			}
		} catch (err) {
			console.log(err);
		}
		return { success: true };
	},

	getUserFriends: async (_, req) => {
		if (!req.userId) {
			throwAuthError(
				'There was a problem with fetching friends list. Please loggin and try again'
			);
		}
		const user = await User.findById(req.userId)
			.populate('friends')
			.exec();
		return user.friends;
	},

	cancelFriendship: async ({ friendId }, req) => {
		if (!req.userId) {
			throwAuthError('Loggin and try again');
		}
		try {
			const requestor = await User.findById(req.userId);
			const friend = await User.findById(friendId);
			friend.friends = friend.friends.filter(
				contact => contact.toString() !== req.userId
			);
			requestor.friends = requestor.friends.filter(
				contact => contact.toString() !== friendId
			);
			await friend.save();
			await requestor.save();
			return { success: true };
		} catch (err) {
			console.log(err);
			return { success: false };
		}
	},
};

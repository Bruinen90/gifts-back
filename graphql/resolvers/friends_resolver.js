// Models
const Invitation = require("../../models/Invitation");
const User = require("../../models/User");

// Errors
const throwAuthError = (errorMessage) => {
    const error = new Error(errorMessage || "Not authenticated");
    error.code = 401;
    throw error;
};

const throwServerError = (errorMessage) => {
    const error = new Error(
        errorMessage || "Internal server error, please try again later"
    );
    error.code = 500;
    throw error;
};

module.exports = {
    sendInvitation: async ({ receiverId }, req) => {
        if (!req.userId) {
            throwAuthError();
        }
        const existingInvitation = await Invitation.findOne({
            sender: req.userId,
            receiver: receiverId,
        });
        if (existingInvitation) {
            const error = new Error(
                "You already invited that user, please be patient and wait for response"
            );
            error.code = 401;
            throw error;
        }
        const newInvitation = await new Invitation({
            sender: req.userId,
            receiver: receiverId,
        });
        await newInvitation.save();
        if (!newInvitation) {
            throwServerError(
                "Error during invitation creation, please try again later"
            );
        }
        return { _id: newInvitation._id };
    },

    getUserInvitations: async (_, req) => {
        if (!req.userId) {
            throwAuthError("Please loggin and try again");
        }
        const receivedInvitations = await Invitation.find({
            receiver: req.userId,
        })
            .populate("sender")
            .exec();
        const sentInvitations = await Invitation.find({ sender: req.userId })
            .populate("receiver")
            .exec();
        return { received: receivedInvitations, sent: sentInvitations };
    },

    setInvitationResponse: async ({ response }, req) => {
        const { invitationId, decision } = response;
        if (!req.userId) {
            throwAuthError("Please loggin and try again");
        }
        if (decision === "cancel") {
            const respondedInvitation = await Invitation.deleteOne({
                _id: invitationId,
                sender: req.userId,
            });
            if (!respondedInvitation) {
                throwAuthError(
                    "There was a problem with your invitation, please try again later"
                );
            }
        } else if (decision === "reject") {
            const respondedInvitation = await Invitation.deleteOne({
                _id: invitationId,
                receiver: req.userId,
            });
            if (!respondedInvitation) {
                throwAuthError(
                    "There was a problem with your invitation, please try again later"
                );
            }
        } else if (decision === "accept") {
            const respondedInvitation = await Invitation.findById(invitationId);
            const sender = await User.findById(respondedInvitation.sender);
            const receiver = await User.findById(respondedInvitation.receiver);
            sender.friends.push(respondedInvitation.receiver);
            sender.save();
            receiver.friends.push(respondedInvitation.sender);
            receiver.save();
        }
        return { success: true };
    },
};

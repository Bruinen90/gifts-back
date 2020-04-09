// Models
const Invitation = require("../../models/Invitation");

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
        console.log(sentInvitations);

        // if (!userInvitations || userInvitations.length === 0) {
        //     return null;
        // }
        return { received: receivedInvitations, sent: sentInvitations };
    },

    setInvitationResponse: async ({ invitationId, response }, req) => {
        if (!req.userId) {
            throwAuthError("Please loggin and try again");
        }
        const respondedInvitation = await Invitation.deleteOne({
            _id: invitationId,
            sender: req.userId,
        });
        if (!respondedInvitation) {
            throwAuthError(
                "There was a problem with your invitation, please try again later"
            );
        }
        return { success: true };
    },
};

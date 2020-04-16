const rp = require("request-promise");

// Models
const Draw = require("../../models/Draw");
const Wish = require("../../models/Wish");

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
    createWish: async ({ wishInput }, req) => {
        if (!req.isAuth) {
            throwAuthError();
        }
        if (wishInput.link) {
            try {
                const html = await rp(wishInput.link);
                const foundImgUrl = html.match(
                    /<meta itemprop="image" content=["'](.*?)["']/gim
                );
                console.log(foundImgUrl);
            } catch (error) {
                console.log(error);
            }
        }
        if (wishInput._id) {
            try {
                const updatedWish = await Wish.findByIdAndUpdate(
                    wishInput._id,
                    wishInput,
                    { useFindAndModify: false }
                );
                return updatedWish;
            } catch (err) {
                console.log(err);
            }
        } else {
            try {
                const wish = new Wish({ ...wishInput, creator: req.userId });
                const savedWish = await wish.save();
                return savedWish;
            } catch (error) {
                console.log(error);
            }
        }
    },

    userWishes: async ({ userId }, req) => {
        let askedUserId = userId || req.userId;
        if (!askedUserId) {
            throwAuthError(
                "No user found for wishes search! Requsted userId: ",
                askedUserId
            );
        }
        try {
            const foundWishes = await Wish.find({ creator: askedUserId });
            return foundWishes;
        } catch (error) {
            console.log("Internal server error", error);
        }
    },

    deleteWish: async ({ wishId }, req) => {
        try {
            const deletedWish = await Wish.deleteOne({
                _id: wishId,
                creator: req.userId,
            });
            if (deletedWish.deletedCount > 0) {
                return { success: true };
            } else {
                return { success: false };
            }
        } catch (err) {
            console.log(err);
        }
    },

    setReserved: async ({ reservation }, req) => {
        const { userId } = req;
        const { wishId, drawId, reserved } = reservation;
        if (!userId) {
            throwAuthError(
                'You need to be logged in to set "I will buy it status"'
            );
        }
        try {
            const desiredWish = await Wish.findById(wishId);
            if (reserved) {
                if (desiredWish.reserved) {
                    throwAuthError(
                        "You can't reserve this wish, someone else has done it before you"
                    );
                }
                desiredWish.reserved = true;
                desiredWish.buyer = userId;
                if (drawId) {
                    desiredWish.forDraw = drawId;
                }
            } else {
                if (desiredWish.buyer.toString() !== userId.toString()) {
                    throwAuthError(
                        "You can't cancel reservation of another user"
                    );
                }
                desiredWish.reserved = false;
                desiredWish.buyer = undefined;
                if (drawId) {
                    desiredWish.forDraw = undefined;
                }
            }
            await desiredWish.save();
            return { success: true };
        } catch (err) {
            console.log(err);
            return { success: false };
        }
    },

    getShoppingList: async (_, req) => {
        const { userId } = req;
        if (!userId) {
            throwAuthError("To get shopping list please loggin first");
        }
        const wishesToBuy = await Wish.find({ buyer: userId }).populate(
            "creator"
        );
        return wishesToBuy;
    },
};

// Models
const Draw = require("../../models/Draw");
const Wish = require("../../models/Wish");

// Errors
const throwAuthError = errorMessage => {
    const error = new Error(errorMessage || "Not authenticated");
    error.code = 401;
    throw error;
};

const throwServerError = errorMessage => {
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
				'No user found for wishes search! Requsted userId: ',
				askedUserId
			);
		}
		try {
			const foundWishes = await Wish.find({ creator: askedUserId });
			return foundWishes;
		} catch (error) {
			console.log('Internal server error', error);
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
			// Hacky, might be a better way!
			const desiredDraw = await Draw.findById(drawId);
			let index;
			desiredDraw.results.find((result, i) => {
				index = i;
				return result.giver.toString() === userId.toString();
			});

			if (reserved) {
				if (desiredWish.reserved) {
					throwAuthError(
						"You can't reserve this wish, someone else has done it before you"
					);
				}
				desiredWish.reserved = true;
				desiredWish.buyer = userId;
				desiredDraw.results[index].gifts.push(wishId);
			} else {
				if (desiredWish.buyer.toString() !== userId.toString()) {
					throwAuthError(
						"You can't cancel reservation of another user"
					);
				}
				desiredWish.reserved = false;
				desiredWish.buyer = undefined;
				desiredDraw.results[index].gifts = desiredDraw.results[
					index
				].gifts.filter(
					giftId => giftId.toString() !== wishId.toString()
				);
			}
			await desiredWish.save();
			await desiredDraw.save();
			return { success: true };
		} catch (err) {
			console.log(err);
			return { success: false };
		}
	},

}
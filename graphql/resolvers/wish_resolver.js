const rp = require('request-promise');

// Models
const Draw = require('../../models/Draw');
const Wish = require('../../models/Wish');

// Errors
const throwAuthError = errorMessage => {
	const error = new Error(errorMessage || 'Not authenticated');
	error.code = 401;
	throw error;
};

module.exports = {
	createWish: async ({ wishInput }, req) => {
		if (!req.isAuth) {
			throwAuthError();
		}
		try {
			let newWishData = wishInput;
			let imageUrl;
			try {
				if (wishInput.link && wishInput.link.startsWith('http')) {
					const html = await rp(wishInput.link);
					const matchesArr = [
						...html.matchAll(
							/(?:<meta (?:itemprop="(?:image|og:image)"|property="(?:image|og:image)") content=["'])(.*?)["']/gim
						),
					];
					let foundImg;
					if (
						matchesArr &&
						matchesArr[0] &&
						matchesArr[0].length > 0
					) {
						foundImg = matchesArr[0][1];
					}
					if (foundImg) {
						imageUrl = foundImg;
					}
				}
			} catch (err) {
				console.log(err);
			}
			if (imageUrl) {
				newWishData.imageUrl = imageUrl;
			}
			if (wishInput._id) {
				const updatedWish = await Wish.findByIdAndUpdate(
					wishInput._id,
					newWishData,
					{ useFindAndModify: false, new: true }
				);
				return updatedWish;
			} else {
				const wish = new Wish({ ...newWishData, creator: req.userId });
				const savedWish = await wish.save();
				return savedWish;
			}
		} catch (error) {
			console.log(error);
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
			let foundWishes = await Wish.find({
				creator: askedUserId,
			})
				.populate('buyer')
				.exec();
			// Prevent showing username for draws-related reservations
			foundWishes = foundWishes.map(wish => {
				if (wish.forDraw && wish.reserved) {
					let buyer = { ...wish.buyer._doc };
					if (req.userId !== buyer._id) {
						buyer = {
							_id: 'ho_ho_ho' + wish._doc._id,
							username: 'Święty Mikołaj',
						};
					}
					return {
						...wish._doc,
						buyer: buyer,
					};
				} else {
					return wish;
				}
			});
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
			throwAuthError('To get shopping list please loggin first');
		}
		const wishesToBuy = await Wish.find({ buyer: userId }).populate(
			'creator'
		);
		return wishesToBuy;
	},
};

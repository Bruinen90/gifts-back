const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const ENV = require('../env/env');

// Models
const User = require('../models/User');
const Draw = require('../models/Draw');
const Wish = require('../models/Wish');

const throwAuthError = () => {
	const error = new Error('Not authenticated');
	error.code = 401;
	throw error;
};

module.exports = {
	createUser: async ({ userInput }, req) => {
		const errors = [];
		if (!validator.isEmail(userInput.email)) {
			errors.push({ message: 'Invalid email' });
		}
		if (
			validator.isEmpty(userInput.password) ||
			!validator.isLength(userInput.password, { min: 5 })
		) {
			errors.push({
				message: 'Password should be at least 5 characters long',
			});
		}
		if (!validator.isLength(userInput.username, { min: 3, max: 30 })) {
			errors.push({
				message:
					'Username should be at least 3 and maximum 30 characters long',
			});
		}
		if (errors.length > 0) {
			const errorsList = errors.map(error => error.message).join('. ');
			const error = new Error('Invalid input. ' + errorsList);
			throw error;
		}
		const existingUsername = await User.findOne({
			username: userInput.username,
		});
		if (existingUsername) {
			const error = new Error('Login taken');
			throw error;
		}
		const existingEmail = await User.findOne({ email: userInput.email });
		if (existingEmail) {
			const error = new Error('Email taken');
			throw error;
		}
		const hashedPassword = await bcrypt.hash(userInput.password, 12);
		const user = new User({
			username: userInput.username,
			email: userInput.email,
			password: hashedPassword,
		});
		const createdUser = await user.save();
		return { ...createdUser._doc, _id: createdUser._id.toString() };
	},

	login: async ({ userInput }, req) => {
		let user = await User.findOne({ email: userInput.usernameOrEmail });
		if (!user) {
			user = await User.findOne({ username: userInput.usernameOrEmail });
			if (!user) {
				const error = new Error('User not found');
				error.code = 401;
				throw error;
			}
		}
		const isEqual = await bcrypt.compare(userInput.password, user.password);
		if (!isEqual) {
			const error = new Error('Invalid password');
			error.code = 401;
			throw error;
		}
		const token = jwt.sign(
			{
				userId: user._id.toString(),
				email: user.email,
				username: user.username,
			},
			ENV.jwtSecret
		);
		return {
			token: token,
			userId: user._id.toString(),
			username: user.username,
			email: user.email,
		};
	},

	createDraw: async ({ drawInput }, req) => {
		if (!req.isAuth) {
			throwAuthError();
		}
		try {
			const draw = new Draw({
				...drawInput,
				creator: req.userId,
				status: 'pending',
			});
			const savedDraw = await draw.save();
			const drawAuthor = await User.findById(req.userId);
			drawAuthor.draws.push(savedDraw._id);
			await drawAuthor.save();
			return savedDraw;
		} catch (error) {
			console.log(error);
		}
	},

	createWish: async ({ wishInput }, req) => {
		if (!req.isAuth) {
			throwAuthError();
		}
		try {
			const wish = new Wish({ ...wishInput, creator: req.userId });
			const savedWish = await wish.save();
			const wishAuthor = await User.findById(req.userId);
			if (!wishAuthor) {
				throwAuthError();
			}
			wishAuthor.wishes.push(savedWish._id);
			await wishAuthor.save();
			return savedWish;
		} catch (error) {
			console.log(error);
		}
	},

	userDraws: async (_, req) => {
		if (!req.userId) {
			console.log('No req token provided!');
			throwAuthError();
		}
		try {
			const allUserDraws = await Draw.find({
				$or: [{ creator: req.userId }, { participants: req.userId }],
			})
				.populate('participants')
				.populate('creator')
				.populate({ path: 'results.getter' })
				.exec();
			const withDrawResult = allUserDraws.map(draw => {
				if (draw.status === 'pending') {
					return draw;
				}
				const doneDraw = draw;
				const drawData = doneDraw._doc;
				const getterFullData = { ...drawData }.results.find(
					result => result.giver.toString() === req.userId.toString()
				).getter;
				return {
					...drawData,
					results: {
						_id: getterFullData._id,
						username: getterFullData.username,
						email: getterFullData.email,
					},
				};
			});
			return { drawsList: withDrawResult };
		} catch (err) {
			console.log(err);
		}
	},

	deleteDraw: async ({ drawId }, req) => {
		try {
			const deletedDraw = await Draw.deleteOne({
				_id: drawId,
				creator: req.userId,
			});
			if (deletedDraw.deletedCount > 0) {
				// console.log(deletedDraw);
				return { success: true };
			} else {
				return { success: false };
			}
		} catch (err) {
			console.log(err);
		}
	},

	findUser: async ({ searchPhrase }, req) => {
		if (!req.userId) {
			throwAuthError();
		}
		const regExp = new RegExp(searchPhrase, 'gi');
		try {
			const foundByUsername = await User.find(
				{ $or: [{ username: regExp }, { email: regExp }] },
				'_id username email'
			);
			return foundByUsername;
		} catch (err) {
			console.log(err);
		}
	},
};

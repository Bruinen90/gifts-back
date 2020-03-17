const bcrypt = require('bcryptjs');
const User = require('../models/user');
const validator = require('validator');

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
			const error = new Error('Username taken, choose another username');
			throw error;
		}
		const existingEmail = await User.findOne({ email: userInput.email });
		if (existingEmail) {
			const error = new Error('Email already exist, please login');
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
};

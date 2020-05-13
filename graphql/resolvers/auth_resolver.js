const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const ENV = require('../../env/env');
const crypto = require('crypto');

// Send grid config
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(ENV.SENDGRID_API_KEY);

// Models
const User = require('../../models/User');

// Errors
const throwAuthError = errorMessage => {
	const error = new Error(errorMessage || 'Not authenticated');
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

		// SEND EMAIL
		const domain = req.headers.origin;
		const mailOptions = {
			to: userInput.email,
			from: 'no-replay@bez-niespodzianek.webb.app',
			subject: 'Witaj w serwisie Bez Niespodzianek',
			templateId: 'd-74ea6a6c2ec74c6cb9d204f8b47efdc7',
			dynamic_template_data: {
				logoLinkTarget: domain,
				header: 'Witaj',
				username: userInput.username,
				message: `Dziękujemy za dołączenie do Bez Niespodzianek! Od teraz możesz korzystać z serwisu - tworzyć i brać udział w losowaniach, zapraszać znajomych oraz sprawdzać ich listę życzeń. Czas nietrafionych prezentów właśnie się skończył!`,
				unsubscribeLink: `${domain}/wypisz-sie`,
			},
		};

		await sgMail.send(mailOptions, (error, result) => {
			if (error) {
				console.log(error.response.body);
				return { success: false };
			}
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
			unsubscribed: user.unsubscribed,
		};
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

	sendResetPasswordEmail: async ({ email }, req) => {
		try {
			const userToReset = await User.findOne({ email: email });
			if (!userToReset) {
				return { success: false };
			}
			const token = crypto.randomBytes(20).toString('hex');
			const domain = req.headers.origin;
			const resetLink = `${domain}/utworz-haslo/?${email}#${token}`;
			const mailOptions = {
				to: email,
				from: 'reset@bez-niespodzianek.webb.app',
				subject: 'Reset hasła bez-niespodzianek',
				templateId: 'd-d575c8f9688b492ea6bcbf9b2b11e548',
				dynamic_template_data: {
					logoLinkTarget: domain,
					header: 'Reset hasła',
					message: `Witaj ${userToReset.username}. W serwisie bez niespodzianek zażądano zresetowania Twojego hasła \n
				    Jeśli nie prosiłeś o reset hasła zignorują tą wiadomość, Twoje hasło pozostanie bez zmian.
				    Aby ustawić nowe hasło kliknij w ten link lub skopiuj go do okna przeglądarki: ${resetLink} \n\n `,
					link: resetLink,
					unsubscribeLink: `${domain}/wypisz-sie`,
				},
			};

			await sgMail.send(mailOptions, (error, result) => {
				if (error) {
					console.log(error.response.body);
					return { success: false };
				}
			});
			const tokenExpDate = Date.now() + 3600000;
			userToReset.passwordResetToken = token;
			userToReset.passwordResetTokenExpDate = tokenExpDate;
			await userToReset.save();
			return { success: true };
		} catch (error) {
			console.log(error);
			return { success: false };
		}
	},

	setNewPassword: async ({ newPasswordInput }, req) => {
		const { password, email, token } = newPasswordInput;
		const userToReset = await User.findOne({ email: email });
		if (!userToReset) {
			return {
				success: false,
				message: `No user found with provided email address: ${email}`,
			};
		}
		const tokenIsOutdated =
			Date.now() > userToReset.passwordResetTokenExpDate;
		if (userToReset.passwordResetToken !== token || tokenIsOutdated) {
			return {
				success: false,
				message: 'Provided token is not valid',
			};
		}
		if (password.length < 5) {
			return {
				success: false,
				message:
					'Provided password is too short - it should be at least 5 characters',
			};
		}
		const hashedPassword = await bcrypt.hash(password, 12);
		userToReset.password = hashedPassword;
		await userToReset.save();
		return { success: true, message: 'New password properly saved' };
	},

	changePassword: async ({ changePasswordInput }, req) => {
		const { userId } = req;
		const { oldPassword, newPassword } = changePasswordInput;
		if (!validator.isLength(newPassword, { min: 5 })) {
			return {
				success: false,
				message:
					'New password is too short - it should be at least 5 charactes long',
			};
		}
		try {
			const editedUser = await User.findById(userId);
			const passwordCorrect = await bcrypt.compare(
				oldPassword,
				editedUser.password
			);
			if (!editedUser || !passwordCorrect) {
				return { success: false, message: 'Not authenticated' };
			}
			const newPasswordHashed = await bcrypt.hash(newPassword, 12);
			editedUser.password = newPasswordHashed;
			await editedUser.save();
			return { success: true };
		} catch (err) {
			console.log(err);
			return {
				success: false,
				message: 'Server error, please try again later',
			};
		}
	},

	changeEmail: async ({ changeEmailInput }, req) => {
		const { userId } = req;
		const { newEmail, unsubscribed, password } = changeEmailInput;
		if (newEmail && !validator.isEmail(newEmail)) {
			return { success: false, message: 'Invalid email address' };
		}
		try {
			const editedUser = await User.findById(userId);
			editedUser.unsubscribed = unsubscribed;
			if (newEmail) {
				const passwordCorrect = await bcrypt.compare(
					password,
					editedUser.password
				);
				const alreadyExists = await User.findOne({ email: newEmail });
				if (!editedUser || !passwordCorrect || alreadyExists) {
					return {
						success: false,
						message:
							'Invalid auth data or user with that email adress already exists',
					};
				}
				editedUser.email = newEmail;
			}
			await editedUser.save();
			return { success: true };
		} catch (err) {
			console.log(err);
			return {
				success: false,
				message: 'Server error, please try again later',
			};
		}
	},
};

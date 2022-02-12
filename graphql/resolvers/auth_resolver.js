require('dotenv').config();
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

// Send grid config
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
		try {
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
				const errorsList = errors
					.map(error => error.message)
					.join('. ');
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
			const existingEmail = await User.findOne({
				email: userInput.email,
			});
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

			// SEND EMAIL
			const domain = req.headers.origin;
			const mailOptions = {
				to: createdUser.email,
				from: 'info@bruinen.pl',
				fromname: 'Bez-niespodzianek',
				subject: 'Witaj w Bez-niespodzianek',
				templateId: 'd-6cce88f2b2c64c469f99bcc735e8e1d3',
				dynamic_template_data: {
					logoLinkTarget: domain,
					header: 'Witaj w serwisie Bez-niespodzianek',
					message: `Twoje konto zostalo utworzone i możesz korzystać ze wszystkich funkcji serwisu Bez-niespodzianek. Czas nietrafionych prezentów właśnie się skończył! Już teraz dodaj znajomych, zacznij dodawać życzenia i tworzyć losowania.`,
					unsubscribeLink: `${domain}/wypisz-sie?email=${createdUser.email}?token=${createdUser.emailLinksToken}`,
				},
			};

			await sgMail.send(mailOptions, (error, result) => {
				if (error) {
					console.log(
						'ERROR DURING SENDING REGISTER EMAIL',
						error.response.body
					);
				}
			});

			return { ...createdUser._doc, _id: createdUser._id.toString() };
		} catch (err) {
			console.log(err);
		}
	},

	login: async ({ userInput }, req) => {
		try {
			let user = await User.findOne({ email: userInput.usernameOrEmail });
			if (!user) {
				console.log('No user found');
				user = await User.findOne({
					username: userInput.usernameOrEmail,
				});
				if (!user) {
					const error = new Error(
						'User not found, please, check login'
					);
					error.code = 401;
					throw error;
				}
			}
			const isEqual = await bcrypt.compare(
				userInput.password,
				user.password
			);
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
				process.env.JWT_SECRET
			);
			return {
				token: token,
				userId: user._id.toString(),
				username: user.username,
				email: user.email,
				unsubscribed: user.unsubscribed,
			};
		} catch (err) {
			console.log(err);
		}
	},

	loginWithGoogle: async ({ googleIdToken }, req) => {
		const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
		const verify = async () => {
			const ticket = await client.verifyIdToken({
				idToken: googleIdToken.googleIdToken,
				audience: process.env.GOOGLE_CLIENT_ID,
			});
			const payload = ticket.getPayload();
			const userid = payload['sub'];
			if (payload['email_verified']) {
				return payload['email'];
			} else {
				return false;
			}
		};
		try {
			const verifiedEmail = await verify();
			if (verifiedEmail) {
				const userForGoogleEmail = await User.findOne({
					email: verifiedEmail,
				});
				if (userForGoogleEmail) {
					const token = jwt.sign(
						{
							userId: userForGoogleEmail._id.toString(),
							email: userForGoogleEmail.email,
							username: userForGoogleEmail.username,
						},
						process.env.JWT_SECRET
					);
					return {
						token: token,
						userId: userForGoogleEmail._id.toString(),
						username: userForGoogleEmail.username,
						email: userForGoogleEmail.email,
						unsubscribed: userForGoogleEmail.unsubscribed,
					};
				} else {
					const error = new Error(
						'No account found for that email adress'
					);
					error.code = 404;
					throw error;
				}
			} else {
				const error = new Error('Google auth failed');
				error.code = 404;
				throw error;
			}
		} catch (err) {
			console.log('ERROR DURING TOKEN VERIFICATION', err);
		}
	},

	verifyToken: async (_, req) => {
		if (req.isAuth && req.userId) {
			console.log('AUTH:', req.isAuth);
			try {
				const user = await User.findById(req.userId);
				const { _id, username, email, unsubscribed } = user;
				if (!user) {
					throwAuthError("Requested user doesn't exist");
				}
				return { _id, username, email, unsubscribed };
			} catch (error) {
				throwAuthError('Server error during authentication');
			}
		}
		throwAuthError('Invalid token');
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
				from: 'info@bruinen.pl',
				fromname: 'Bez-niespodzianek',
				subject: 'Reset hasła',
				templateId: 'd-c1fd7e5c2d094077864120105bb2eedd',
				dynamic_template_data: {
					logoLinkTarget: domain,
					header: 'Reset hasła',
					message: `Witaj ${userToReset.username}. W serwisie bez niespodzianek zażądano zresetowania Twojego hasła <br><br>
				    Jeśli nie prosiłeś o reset hasła zignorują tą wiadomość, Twoje hasło pozostanie bez zmian.
				    Aby ustawić nowe hasło kliknij w ten link lub skopiuj go do okna przeglądarki: ${resetLink} <br><br> `,
					link: resetLink,
					unsubscribeLink: `${domain}/wypisz-sie?email=${userToReset.email}?token=${userToReset.emailLinksToken}`,
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

	unsubscribe: async ({ unsubscribeInput }, req) => {
		const { email, token } = unsubscribeInput;
		try {
			const user = await User.findOne({ email: email });
			if (!user || user.emailLinksToken !== token) {
				throw new Error();
			}
			user.unsubscribed = true;
			await user.save();
			return { success: true, message: 'Unsubscribe successful' };
		} catch (err) {
			console.log(err);
			return {
				success: true,
				message: 'An error occured during unsubscribe',
			};
		}
	},
};

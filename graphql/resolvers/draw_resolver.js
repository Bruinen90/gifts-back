const RunDraw = require('../../scripts/RunDraw');
// const ENV = require('../../env/env');

// Send grid config
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Models
const Draw = require('../../models/Draw');

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
	createDraw: async ({ drawInput }, req) => {
		if (!req.isAuth) {
			throwAuthError();
		}
		if (drawInput._id) {
			try {
				const updatedDraw = await Draw.findByIdAndUpdate(
					drawInput._id,
					drawInput,
					{ useFindAndModify: false, new: true }
				);
				return updatedDraw;
			} catch (err) {
				console.log(err);
			}
		}
		try {
			const draw = new Draw({
				...drawInput,
				creator: req.userId,
				status: 'pending',
			});
			const savedDraw = await draw.save();
			return savedDraw;
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
				.populate({ path: 'results.gifts' })
				.exec();
			const withDrawResult = allUserDraws.map(draw => {
				if (draw.status === 'pending') {
					return draw;
				}
				const doneDraw = draw;
				const drawData = doneDraw._doc;
				const fullResults = { ...drawData }.results.find(
					result => result.giver.toString() === req.userId.toString()
				);
				const returnedData = {
					...drawData,
					results: {
						_id: fullResults.getter._id,
						username: fullResults.getter.username,
						email: fullResults.getter.email,
						gifts: fullResults.gifts,
					},
				};
				return returnedData;
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
				return { success: true };
			} else {
				return { success: false };
			}
		} catch (err) {
			console.log(err);
		}
	},

	exitDraw: async ({ drawId }, req) => {
		if (!req.userId) {
			throwAuthError('To exit draw you have to be logged in!');
		}
		try {
			const exitedDraw = await Draw.findByIdAndUpdate(drawId, {
				$pull: { participants: req.userId },
			});
			return { success: true };
		} catch (error) {
			console.log(error);
			return { success: false };
		}
	},

	runDraw: async ({ drawId }, req) => {
		if (!req.userId) {
			throwAuthError('Please login and try again');
		}
		const draw = await Draw.findById(drawId);
		if (draw.creator.toString() !== req.userId.toString()) {
			throwAuthError(
				'You are not authenticated to run draws created by other user'
			);
		}
		try {
			const drawWithResults = await RunDraw.execute(
				draw.participants,
				drawId
			);
			// SEND EMAIL TO EACH PARTICIPANT WHO DID NOT CANCEL EMAILS
			const emailsArray = drawWithResults.participants.map(
				participant => {
					const participantResult = drawWithResults.results.find(
						result =>
							result.giver.toString() ===
							participant._id.toString()
					).getter;
					return {
						username: participant.username,
						email: participant.email,
						emailToken: participant.token,
						unsubscribed: participant.unsubscribed,
						resultUsername: participantResult.username,
					};
				}
			);
			const domain = req.headers.origin;

			const generateMailOptions = (
				username,
				email,
				drawTitle,
				resultToken,
				resultUsername
			) => ({
				to: email,
				from: 'info@bruinen.pl',
				fromname: 'Bez-niespodzianek',
				subject: 'Witaj w Bez-niespodzianek',
				templateId: 'd-159d34729a634d32be97712af0fd230f ',
				dynamic_template_data: {
					logoLinkTarget: domain,
					header: 'Wyniki losowania w serwisie Bez-niespodzianek',
					message: `Losowaie <b>${drawTitle}</b> dobiegło końca, wylosowałeś użytkownika`,
					username: username,
					unsubscribeLink: `${domain}/wypisz-sie?email=${resultUsername}?token=${resultToken}`,
				},
			});

			for (const email of emailsArray) {
				if (!email.unsubscribed) {
					await sgMail.send(
						generateMailOptions(
							email.username,
							email.email,
							draw.title,
							email.emailToken,
							email.resultUsername
						),
						(error, result) => {
							if (error) {
								console.log(
									'ERROR: ',
									error.response.body.errors,
									'RESULT: ',
									result
								);
								throw new Error('Error during emails sending');
							}
						}
					);
				}
			}

			const creatorResults = drawWithResults.results.find(
				result => result.giver.toString() === req.userId.toString()
			);
			return creatorResults.getter;
		} catch (err) {
			console.log(err);
		}
	},

	archiveDraw: async ({ drawId }, req) => {
		if (!req.userId) {
			throwAuthError('Please login and try again');
		}
		try {
			const draw = await Draw.findById(drawId);
			if (draw.creator.toString() !== req.userId.toString()) {
				throwAuthError(
					'You are not authenticated to change status of draws created by other user'
				);
			}
			draw.status = 'archived';
			await draw.save();
			return { success: true };
		} catch (err) {
			console.log(err);
			return { success: false };
		}
	},
};

const Draw = require('../models/Draw');
const schedule = require('node-schedule');

module.exports.scheduleDraws = async () => {
	// Add draw status and remove already done draws!
	allDraw = await Draw.find({});
	return allDraw.map(draw =>
		schedule.scheduleJob(draw.date, () =>
			runDraw(draw.participants, draw._id)
		)
	);
};

const runDraw = async (participantsIds, drawId) => {
	const bowlWithIds = [...participantsIds];
	const boardWithPairs = [];
	participantsIds.forEach((myId, index) => {
		// Check if we are not stuck with last user who would draw her/himself
		if (index === participantsIds.length - 1 && bowlWithIds[0] === myId) {
			const penultimateParticipant =
				boardWithPairs[boardWithPairs.length - 1];
			boardWithPairs.push({
				giver: myId,
				getter: penultimateParticipant.giver,
			});
			boardWithPairs[boardWithPairs.length - 2].getter = myId;
		} else {
			let drawedIndex = Math.floor(Math.random() * bowlWithIds.length);
			while (bowlWithIds[drawedIndex] === myId) {
				drawedIndex = Math.floor(Math.random() * bowlWithIds.length);
			}
			const drawedId = bowlWithIds.splice(drawedIndex, 1);
			boardWithPairs.push({ giver: myId, getter: drawedId[0] });
		}
	});
	try {
		const doneDraw = await Draw.findById(drawId);
		doneDraw.results = boardWithPairs;
		doneDraw.status = 'done';
		const savedDraw = await doneDraw.save();
		const populateOpts = [
			{ path: 'participants' },
			{ path: 'creator' },
			{ path: 'results.getter' },
			{ path: 'results.gifts' },
		];
		return await Draw.populate(savedDraw, populateOpts);
	} catch (err) {
		console.log(err);
	}
};

module.exports.execute = runDraw;

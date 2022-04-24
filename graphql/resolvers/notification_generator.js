const Notification = require('../../models/Notification');
const io = require('../../socket');

const notificationGenerator = async ({ type, params, receiver }) => {
	let content = '';
	switch (type) {
		case 'reservation':
			content = `Użytkownik ${params.username} ${
				params.reserved ? 'zadeklarował' : 'odwołał'
			} chęć zakupu prezentu "${params.giftName}"`;
			break;
		case 'invitation':
			content = `Użytkownik ${params.username} zaprosił Cię do grona znajomych.`;
			break;
		case 'inviatationAccept':
			content = `Użytkownik ${params.username} zaakceptował Twoje zaproszenie do grona znajomych.`;
			break;
		case 'newDraw':
			content = `Zostałeś dodany jako uczestnik losowania ${params.drawName}. Poinformujemy Cię, kiedy będą znane jego wyniki.`;
			break;
		case 'drawResults':
			content = `Losowanie ${params.drawName} właśnie się zakończyło. Wylosowałeś użytkownika ${params.drawResultUsername}. Nie zapomnij zadeklarować co kupisz, aby uniknąć zdublowanych prezntów.`;
			break;
		default:
			content = 'Błąd podczas generowania powiadomienia';
	}
	const notification = new Notification({ receiver, type, content });
	await notification.save();
	// SocketIO
	io.getIO()
		.to(receiver)
		.emit('notification', {
			action: 'new',
			notification,
		});
};

module.exports = notificationGenerator;

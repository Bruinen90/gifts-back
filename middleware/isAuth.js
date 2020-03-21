const jws = require('jsonwebtoken');
const ENV = require('../env/env');

module.exports = (req, res, next) => {
	const breakMiddleware = () => {
		req.isAuth = false;
		return next();
	};
	const authHeader = req.get('Authorization');
	// console.log('authHeader: ', authHeader);
	if (!authHeader) {
		// console.log('1111');
		return breakMiddleware();
	}
	const token = authHeader;
	let decodedToken;
	try {
		decodedToken = jws.verify(token, ENV.jwtSecret);
	} catch (error) {
		// console.log('22222');
		return breakMiddleware();
	}
	if (!decodedToken) {
		// console.log('3333');
		return breakMiddleware();
	}
	req.userId = decodedToken.userId;
	req.isAuth = true;
	return next();
};

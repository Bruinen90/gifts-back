const jws = require('jsonwebtoken');
// const ENV = require('../env/env');

module.exports = (req, res, next) => {
	const breakMiddleware = () => {
		req.isAuth = false;
		return next();
	};
	const authHeader = req.get('Authorization');
	if (!authHeader) {
		return breakMiddleware();
	}
	const token = authHeader;
	let decodedToken;
	try {
		decodedToken = jws.verify(token, process.env.JWT_SECRET);
	} catch (error) {
		return breakMiddleware();
	}
	if (!decodedToken) {
		return breakMiddleware();
	}
	req.userId = decodedToken.userId;
	req.isAuth = true;
	return next();
};

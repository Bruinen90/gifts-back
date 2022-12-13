const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const isAuth = require('./middleware/isAuth');
const drawsSchedule = require('./scripts/RunDraw');

// Graphql
const graphqlHttp = require('express-graphql');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/root_resolver');

const User = require('./models/User');
const jws = require('jsonwebtoken');

require('dotenv').config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
	res.setHeader(
		'Access-Control-Allow-Origin',
		'https://bez-niespodzianek.onrender.com'
	);
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, PATCH, DELETE'
	);
	res.setHeader('Access-Control-Allow-Headers', '*');
	if (req.method === 'OPTIONS') {
		return res.sendStatus(200);
	}
	next();
});

app.use(isAuth);

app.use(
	'/graphql',
	graphqlHttp({
		schema: graphqlSchema,
		rootValue: graphqlResolver,
		graphiql: true,
	})
);
drawsSchedule.scheduleDraws();

const spinnUp = async () => {
	try {
		await mongoose.connect(
			`mongodb+srv://bruinen:${process.env.MONGO_PASSWORD}@nodecourse-wx0jk.gcp.mongodb.net/gifts`,
			{
				useNewUrlParser: true,
				useUnifiedTopology: true,
			}
		);
		const server = app.listen(process.env.PORT || 8080);
		const io = require('./socket');
		io.init(server).on('connection', async socket => {
			if (!socket.handshake.auth.token) {
				throw new Error('Socket client not authorized');
			} else {
				const authToken = socket.handshake.auth.token;
				try {
					const decodedToken = jws.verify(
						authToken,
						process.env.JWT_SECRET
					);
					const socketUser = await User.findById(decodedToken.userId);
					if (socketUser.email !== decodedToken.email) {
						throw new Error('No user found, unauthorized');
					}
					socket.userId = decodedToken.userId;
					// Create individual room for connected user
					socket.join(decodedToken.userId);
				} catch (error) {
					console.log(error);
				}
			}
		});
	} catch (error) {
		console.log(error);
	}
};

spinnUp();

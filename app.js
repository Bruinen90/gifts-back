const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const isAuth = require('./middleware/isAuth');
const drawsSchedule = require('./scripts/RunDraw');

// Graphql
const graphqlHttp = require('express-graphql');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/root_resolver');

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
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
		app.listen(process.env.PORT || 8080);
	} catch (error) {
		console.log(error);
	}
};

spinnUp();
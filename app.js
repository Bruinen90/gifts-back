const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

// Graphql
const graphqlHttp = require("express-graphql");
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolver");

const app = express();

app.use(bodyParser.json());

app.use(
  "/graphql",
  graphqlHttp({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true
  })
);

const spinnUp = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://bruinen:hRxPMYjRFhTOapq2@nodecourse-wx0jk.gcp.mongodb.net/gifts",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    );
    app.listen(8080);
  } catch (error) {
    console.log(error);
  }
};

spinnUp();

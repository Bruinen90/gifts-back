const { buildSchema } = require("graphql");

module.exports = buildSchema(`
    type Draw {
        _id: ID!
        title: String!
        date: String!
        price: Int!
        creator: User!
    }
    type User {
        _id: ID!
        username: String!
        email: String!
        password: String
        draws: [Draw!]!
    }
    input UserInputData {
        username: String!
        email: String!
        password: String!
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
    }

    type RootQuery {
        hello: String
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);

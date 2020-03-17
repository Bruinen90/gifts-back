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
    input SignUpInputData {
        username: String!
        email: String!
        password: String!
    }

    input SignInInputData {
        usernameOrEmail: String!
        password: String!
    }

    type AuthData {
        token: String!
        userId: String!
    }

    type RootMutation {
        createUser(userInput: SignUpInputData): User!
    }

    type RootQuery {
        login(userInput: SignInInputData): AuthData!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);

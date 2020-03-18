const { buildSchema } = require("graphql");

module.exports = buildSchema(`
    type Draw {
        _id: ID!
        title: String!
        date: String!
        price: String!
        creator: User!
        participants: [User!]!
    }

    type User {
        _id: ID!
        username: String!
        email: String!
        password: String
        draws: [Draw!]!
    }

    type Wish {
        _id: ID!
        title: String!
        link: String
        description: String
    }

    type AuthData {
        token: String!
        userId: String!
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

    input DrawInput {
        title: String!
        date: String!
        price: Int!
        creatorsID: String!
        participantsIDs: [String!]!
    }

    input WishInput {
        title: String!
        link: String
        description: String
    }

    type RootMutation {
        createUser(userInput: SignUpInputData): User!
        createDraw(drawInput: DrawInput): Draw!
        createWish(wishInput: WishInput): Wish!
    }

    type RootQuery {
        login(userInput: SignInInputData): AuthData!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);

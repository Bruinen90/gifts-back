const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    type DrawResults {
        _id: ID
        username: String!
        email: String
        gifts: [Wish]
    }

    type Draw {
        _id: ID!
        title: String!
        date: String!
        price: String!
        creator: User!
        participants: [User]
        results: DrawResults
        status: String
    }

    type User {
        _id: ID!
        username: String!
        email: String!
        password: String
        draws: [Draw]
    }

    type Wish {
        _id: ID!
        title: String!
        link: String
        description: String
        price: Int
        creator: ID!
        buyer: ID
        reserved: Boolean
    }

    type AuthData {
        token: String!
        userId: String!
        username: String
        email: String
    }

    type DrawsList {
        drawsList: [Draw]!
    }

    type SuccessResult {
        success: Boolean
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
        creator: ID!
        participants: [ID!]!
        _id: ID
    }

    input WishInput {
        title: String!
        link: String
        description: String
        price: Int!
        _id: ID
    }

    input Reservation {
        wishId: ID!
        drawId: ID!
        reserved: Boolean!
    }

    type RootMutation {
        createUser(userInput: SignUpInputData): User!
        createDraw(drawInput: DrawInput): Draw!
        createWish(wishInput: WishInput): Wish!
        deleteDraw(drawId: String): SuccessResult
        deleteWish(wishId: String): SuccessResult
        exitDraw(drawId: ID!): SuccessResult
        setReserved(reservation: Reservation!): SuccessResult
        runDraw(drawId: ID!): DrawResults
    }

    type RootQuery {
        login(userInput: SignInInputData): AuthData!
        userDraws: DrawsList!
        findUser(searchPhrase: String): [User]
        userWishes(userId: ID): [Wish]
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);

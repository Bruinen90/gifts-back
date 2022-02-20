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
        creator: User
        participants: [User]
        results: DrawResults
        status: String
        createdAt: String
        updatedAt: String
    }

    type User {
        _id: ID!
        username: String!
        email: String!
        password: String
        draws: [Draw]
        unsubscribed: Boolean
    }

    type Wish {
        _id: ID!
        title: String!
        link: String
        imageUrl: String
        description: String
        price: Int
        creator: ID!
        buyer: User
        reserved: Boolean
        done: Boolean
        updatedAt: String
    }

    type WishPopulated {
        _id: ID!
        title: String!
        link: String
        imageUrl: String
        description: String
        price: Int
        creator: User!
        forDraw: ID
        updatedAt: String
        done: Boolean
    }

    type Invitation {
        _id: ID!
        sender: User!
        receiver: User!
    }

    type UserInvitations {
        received: [Invitation]
        sent: [Invitation]
    }

    type AuthData {
        token: String!
        userId: String!
        username: String
        email: String
        unsubscribed: Boolean
    }

    input GoogleIdToken {
        googleIdToken: String!
    }

    type DrawsList {
        drawsList: [Draw]!
    }

    type SuccessResult {
        success: Boolean
        message: String
    }

    type CreatedId {
        _id: ID!
    }

    type ItemData {
        itemPrice: String
    }

    type Notification {
        type: String!
        content: String!
        createdAt: String!
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
        drawId: ID
        reserved: Boolean!
    }

    input InvitationResponse {
        invitationId: ID! 
        decision: String!
    }

    input NewPasswordInput {
        password: String!
        email: String!
        token: String!
    }

    input ChangePasswordInput {
        oldPassword: String!
        newPassword: String!
    }

    input ChangeEmailInput {
        newEmail: String
        unsubscribed: Boolean!
        password: String
    }

    input UnsubscribeInput {
        email: String!
        token: String!
    }

    input WishDoneInput {
        wishId: ID!
        done: Boolean!
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
        archiveDraw(drawId: ID!): SuccessResult
        sendInvitation(receiverId: ID!): CreatedId
        getUserInvitations: UserInvitations
        setInvitationResponse(response: InvitationResponse!): SuccessResult
        cancelFriendship(friendId: String): SuccessResult
        sendResetPasswordEmail(email: String!): SuccessResult
        setNewPassword(newPasswordInput: NewPasswordInput!): SuccessResult
        changePassword(changePasswordInput: ChangePasswordInput!): SuccessResult
        changeEmail(changeEmailInput: ChangeEmailInput!): SuccessResult
        unsubscribe(unsubscribeInput: UnsubscribeInput): SuccessResult
        setWishDone(input: WishDoneInput): SuccessResult
    }

    type RootQuery {
        login(userInput: SignInInputData): AuthData!
        loginWithGoogle(googleIdToken: GoogleIdToken): AuthData
        userDraws: DrawsList!
        findUser(searchPhrase: String): [User]
        userWishes(userId: ID): [Wish]
        getUserFriends: [User]
        getShoppingList: [WishPopulated]
        verifyToken(token: String!): User!
        getAllegroItemData(itemId: String!): ItemData
        getUserNotifications: [Notification]
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);

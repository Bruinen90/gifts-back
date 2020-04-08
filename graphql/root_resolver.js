// Resolvers
const AuthResolver = require("./resolvers/auth_resolver");
const DrawResolver = require("./resolvers/draw_resolver");
const WishResolver = require("./resolvers/wish_resolver");
const FriendsResolver = require("./resolvers/friends_resolver");

module.exports = {
    ...AuthResolver,
    ...DrawResolver,
    ...WishResolver,
    ...FriendsResolver
};

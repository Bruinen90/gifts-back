const bcrypt = require("bcryptjs");
const User = require("../models/user");

module.exports = {
  createUser: async ({ userInput }, req) => {
    const existingUsername = await User.findOne({
      username: userInput.username
    });
    if (existingUsername) {
      const error = new Error("Username taken");
      throw error;
    }
    const existingEmail = await User.findOne({ email: userInput.email });
    if (existingEmail) {
      const error = new Error("Username taken");
      throw error;
    }
    const hashedPassword = await bcrypt.hash(userInput.password, 12);
    const user = new User({
      username: userInput.username,
      email: userInput.email,
      password: hashedPassword
    });
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  }
};

const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const ENV = require("../../env/env");
const crypto = require("crypto");

// Send grid config
const sgMail = require("@sendgrid/mail");
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgMail.setApiKey(
    "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"
);

// Models
const User = require("../../models/User");

// Errors
const throwAuthError = (errorMessage) => {
    const error = new Error(errorMessage || "Not authenticated");
    error.code = 401;
    throw error;
};

const throwServerError = (errorMessage) => {
    const error = new Error(
        errorMessage || "Internal server error, please try again later"
    );
    error.code = 500;
    throw error;
};

module.exports = {
    createUser: async ({ userInput }, req) => {
        const errors = [];
        if (!validator.isEmail(userInput.email)) {
            errors.push({ message: "Invalid email" });
        }
        if (
            validator.isEmpty(userInput.password) ||
            !validator.isLength(userInput.password, { min: 5 })
        ) {
            errors.push({
                message: "Password should be at least 5 characters long",
            });
        }
        if (!validator.isLength(userInput.username, { min: 3, max: 30 })) {
            errors.push({
                message:
                    "Username should be at least 3 and maximum 30 characters long",
            });
        }
        if (errors.length > 0) {
            const errorsList = errors.map((error) => error.message).join(". ");
            const error = new Error("Invalid input. " + errorsList);
            throw error;
        }
        const existingUsername = await User.findOne({
            username: userInput.username,
        });
        if (existingUsername) {
            const error = new Error("Login taken");
            throw error;
        }
        const existingEmail = await User.findOne({ email: userInput.email });
        if (existingEmail) {
            const error = new Error("Email taken");
            throw error;
        }
        const hashedPassword = await bcrypt.hash(userInput.password, 12);
        const user = new User({
            username: userInput.username,
            email: userInput.email,
            password: hashedPassword,
        });
        const createdUser = await user.save();
        return { ...createdUser._doc, _id: createdUser._id.toString() };
    },

    login: async ({ userInput }, req) => {
        let user = await User.findOne({ email: userInput.usernameOrEmail });
        if (!user) {
            user = await User.findOne({ username: userInput.usernameOrEmail });
            if (!user) {
                const error = new Error("User not found");
                error.code = 401;
                throw error;
            }
        }
        const isEqual = await bcrypt.compare(userInput.password, user.password);
        if (!isEqual) {
            const error = new Error("Invalid password");
            error.code = 401;
            throw error;
        }
        const token = jwt.sign(
            {
                userId: user._id.toString(),
                email: user.email,
                username: user.username,
            },
            ENV.jwtSecret
        );
        return {
            token: token,
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
        };
    },

    findUser: async ({ searchPhrase }, req) => {
        if (!req.userId) {
            throwAuthError();
        }
        const regExp = new RegExp(searchPhrase, "gi");
        try {
            const foundByUsername = await User.find(
                { $or: [{ username: regExp }, { email: regExp }] },
                "_id username email"
            );
            return foundByUsername;
        } catch (err) {
            console.log(err);
        }
    },

    sendResetPasswordEmail: async ({ email }, req) => {
        try {
            const userToReset = await User.findOne({ email: email });
            if (!userToReset) {
                return { success: false };
            }
            const token = crypto.randomBytes(20).toString("hex");
            const resetLink = `${req.headers.origin}/utworz-haslo/?${email}#${token}`;
            const mailOptions = {
                to: email,
                from: "reset@bez-niespodzianek.pl",
                subject: "Reset hasła bez-niespodzianek",
                text: `Witaj ${userToReset.username}. W serwisie bez niespodzianek zażądano zresetowania Twojego hasła \n 
            Jeśli nie prosiłeś o reset hasła zignorują tą wiadomość, Twoje hasło pozostanie bez zmian.
            Aby ustawić nowe hasło kliknij w ten link lub skopiuj go do okna przeglądarki: ${resetLink} \n\n `,
            };

            await sgMail.send(mailOptions, (error, result) => {
                if (error) return { success: false };
            });
            // Saving token to DB
            const tokenExpDate = Date.now() + 3600000;
            userToReset.passwordResetToken = token;
            userToReset.passwordResetTokenExpDate = tokenExpDate;
            await userToReset.save();
            return { success: true };
        } catch (error) {
            console.log(error);
            return { success: false };
        }
    },

    setNewPassword: async ({ newPasswordInput }, req) => {
        const { password, email, token } = newPasswordInput;
        const userToReset = await User.findOne({ email: email });
        if (!userToReset) {
            return {
                success: false,
                message: `No user found with provided email address: ${email}`,
            };
        }
        const tokenIsOutdated =
            Date.now() > userToReset.passwordResetTokenExpDate;
        if (userToReset.passwordResetToken !== token || tokenIsOutdated) {
            return {
                success: false,
                message: "Provided token is not valid",
            };
        }
        if (password.length < 5) {
            return {
                success: false,
                message:
                    "Provided password is too short - it should be at least 5 characters",
            };
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        userToReset.password = hashedPassword;
        await userToReset.save();
        return { success: true, message: "New password properly saved" };
    },
};

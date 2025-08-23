const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
};

// REGISTER
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // role defaults to "customer" in userModel.js
        const user = await User.create({ name, email, password });

        res.status(201).json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            token: generateToken(user._id, user.role),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// LOGIN
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("Login attempt:", email);  // log the email trying to login

        const user = await User.findOne({ email });
        console.log("User found:", user); // log the user document

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const isMatch = await user.matchPassword(password);
        console.log("Password match:", isMatch); // log if password comparison succeeded

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        res.json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            token: generateToken(user._id, user.role),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// GUEST TOKEN
exports.generateGuestToken = (req, res) => {
    try {
        const guestId = "guest_" + Date.now();
        const role = "guest";

        const token = jwt.sign({ id: guestId, role }, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });

        res.json({
            user: {
                _id: guestId,
                role,
            },
            token,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

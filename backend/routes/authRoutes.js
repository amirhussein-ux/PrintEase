const express = require("express");
const { registerUser, loginUser, generateGuestToken } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// Guest token route
router.post("/guest", generateGuestToken);

// Protected route
router.get("/profile", protect, (req, res) => {
    res.json(req.user);
});

// One-time admin creation route (remove after use)
router.post("/create-admin", async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: "admin"
        });

        res.status(201).json({
            _id: admin._id,
            firstName: admin.firstName,
            lastName: admin.lastName,
            email: admin.email,
            role: admin.role,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

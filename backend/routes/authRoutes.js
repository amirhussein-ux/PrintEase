const express = require("express");
const { registerUser, loginUser, generateGuestToken, updateProfile, getAvatarById } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// Guest token route
router.post("/guest", generateGuestToken);

// Protected route
router.get("/profile", protect, (req, res) => {
    res.json(req.user);
});

// Update profile (with optional avatar)
router.put('/profile', protect, upload.single('avatar'), updateProfile);

// Get avatar by id
router.get('/avatar/:id', getAvatarById);

// One-time owner creation route (remove after use)
router.post("/create-owner", async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const owner = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: "owner"
        });

        res.status(201).json({
            _id: owner._id,
            firstName: owner.firstName,
            lastName: owner.lastName,
            email: owner.email,
            role: owner.role,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

const express = require("express");
const { registerUser, loginUser, generateGuestToken } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// Guest token route
router.post("/guest", generateGuestToken);

// Protected route
router.get("/profile", protect, (req, res) => {
    res.json(req.user);
});

module.exports = router;

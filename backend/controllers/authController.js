const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Helper: format Mongoose ValidationError into a concise message
const capitalize = (s) => (typeof s === 'string' && s.length) ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const formatValidationError = (err) => {
  if (!err || err.name !== 'ValidationError') return err.message || 'Validation error';

  const messages = Object.values(err.errors).map((e) => {
    const path = e.path || (e.properties && e.properties.path) || '';
    const kind = e.kind || (e.properties && e.properties.kind) || '';

    if (kind === 'required') return `${capitalize(path)} is required`;
    if (kind === 'minlength') {
      const min = (e.properties && e.properties.minlength) || (e.options && e.options.minlength) || '';
      return `${capitalize(path)} must be at least ${min} characters`;
    }

    // fallback to the original message if available
    if (e.message) return e.message;
    return `${capitalize(path)} is invalid`;
  });

  return messages.join('; ');
};

// REGISTER
exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, role } = req.body;

    // Check required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Default role is "customer" if not provided
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || "customer",
    });

    res.status(201).json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    // Simplify Mongoose validation errors and return 400
    if (error && error.name === 'ValidationError') {
      const message = formatValidationError(error);
      return res.status(400).json({ message });
    }

    // Handle duplicate key (unique) errors more nicely if they appear
    if (error && error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0];
      const pretty = field ? `${capitalize(field)} already exists` : 'Duplicate value';
      return res.status(400).json({ message: pretty });
    }

    res.status(500).json({ message: error.message });
  }
};

// LOGIN
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", email);

    const user = await User.findOne({ email });
    console.log("User found:", user);

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.matchPassword(password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
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
        firstName: "Guest",
        lastName: "User",
        email: null,
        role,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

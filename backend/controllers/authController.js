const User = require("../models/userModel");
const Employee = require('../models/employeeModel');
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');

// Generate JWT
const generateToken = ({ id, role, kind = 'user', store, expiresIn = '7d' }) => {
  const payload = { id, role, kind };
  if (store) payload.store = store;
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
  });
};

// Format Mongoose ValidationError into concise message
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

    if (e.message) return e.message;
    return `${capitalize(path)} is invalid`;
  });

  return messages.join('; ');
};

// Register new user
exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, role } = req.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

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
      token: generateToken({ id: user._id, role: user.role }),
    });
  } catch (error) {
    if (error && error.name === 'ValidationError') {
      const message = formatValidationError(error);
      return res.status(400).json({ message });
    }

    if (error && error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0];
      const pretty = field ? `${capitalize(field)} already exists` : 'Duplicate value';
      return res.status(400).json({ message: pretty });
    }

    res.status(500).json({ message: error.message });
  }
};

// Login user or employee
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    console.log("Login attempt:", normalizedEmail);

    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const isMatch = await user.matchPassword(password);
      console.log("Password match (user):", isMatch);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      return res.json({
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
        token: generateToken({ id: user._id, role: user.role }),
      });
    }

    const employee = await Employee.findOne({ email: normalizedEmail, active: true }).select('+passwordHash');
    if (!employee) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const employeeMatch = await employee.matchPassword(password);
    console.log("Password match (employee):", employeeMatch);
    if (!employeeMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const [firstName, ...rest] = employee.fullName.split(' ').filter(Boolean);
    const lastName = rest.join(' ');

    res.json({
      user: {
        _id: employee._id,
        firstName: firstName || employee.fullName,
        lastName,
        email: employee.email,
        role: 'employee',
        store: employee.store,
        storeId: employee.store,
        phone: employee.phone || '',
        avatar: employee.avatar || null,
        fullName: employee.fullName,
        employeeRole: employee.role,
      },
      token: generateToken({ id: employee._id, role: 'employee', kind: 'employee', store: employee.store }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate guest token for temporary access
exports.generateGuestToken = (req, res) => {
  try {
    const guestId = "guest_" + Date.now();
    const role = "guest";

    const token = generateToken({ id: guestId, role, expiresIn: '1d' });

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

// Update user profile with optional avatar
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { firstName, lastName, address, phone } = req.body;

    const updates = {};
    if (typeof firstName === 'string') updates.firstName = firstName;
    if (typeof lastName === 'string') updates.lastName = lastName;
    if (typeof address === 'string') updates.address = address;
    if (typeof phone === 'string') updates.phone = phone;

    if (req.file && req.file.buffer) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      const uploadStream = bucket.openUploadStream(`${userId}-avatar`, { contentType: req.file.mimetype });
      uploadStream.end(req.file.buffer);

      await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve());
        uploadStream.on('error', reject);
      });

      updates.avatarFileId = uploadStream.id;
      updates.avatarMime = req.file.mimetype;
    }

    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'avatar') && req.body.avatar === '') {
      updates.avatarFileId = undefined;
      updates.avatarMime = undefined;
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        address: user.address || '',
        phone: user.phone || '',
        avatarFileId: user.avatarFileId || null,
        avatarMime: user.avatarMime || null,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user avatar by ID
exports.getAvatarById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const _id = new mongoose.Types.ObjectId(id);

    try {
      const files = await bucket.find({ _id }).toArray();
      if (files && files[0] && files[0].contentType) {
        res.setHeader('Content-Type', files[0].contentType);
      }
    } catch {}

    bucket.openDownloadStream(_id).on('error', () => res.status(404).end()).pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Logout user
exports.logoutUser = async (req, res) => {
  try {
    res.json({ 
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
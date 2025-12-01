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

      // Include avatar information if present
      const avatarUrl = user.avatarFileId ? `${req.protocol}://${req.get('host')}/api/auth/avatar/${user.avatarFileId}` : null;
      return res.json({
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatarFileId: user.avatarFileId || null,
          avatarMime: user.avatarMime || null,
          avatarUrl,
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

    // Basic request logging for debugging upload/deletion issues
    console.log('updateProfile called for userId=', userId, 'hasFile=', !!req.file, 'bodyKeys=', Object.keys(req.body || {}));

    const { firstName, lastName, address, phone } = req.body;

    // Load existing user to know if an avatar file exists (for cleanup)
    const existingUser = await User.findById(userId).select('avatarFileId');

    const updates = {};
    if (typeof firstName === 'string') updates.firstName = firstName;
    if (typeof lastName === 'string') updates.lastName = lastName;
    if (typeof address === 'string') updates.address = address;
    if (typeof phone === 'string') updates.phone = phone;

    // If avatar uploaded, store to GridFS. After successful upload, delete previous avatar file if present.
    if (req.file && req.file.buffer) {
      console.log('Uploading new avatar for user', userId, 'mimetype=', req.file.mimetype, 'size=', req.file.size);
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      const uploadStream = bucket.openUploadStream(`${userId}-avatar`, { contentType: req.file.mimetype });
      uploadStream.end(req.file.buffer);

      await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve());
        uploadStream.on('error', reject);
      });

      // Set new avatar info
      updates.avatarFileId = uploadStream.id;
      updates.avatarMime = req.file.mimetype;

      // Clean up previous avatar file if it exists and is different
      try {
        if (existingUser && existingUser.avatarFileId && existingUser.avatarFileId.toString() !== uploadStream.id.toString()) {
          const prevId = existingUser.avatarFileId;
          console.log('Deleting previous avatar for user', userId, 'fileId=', prevId.toString());
          try {
            // Check file exists first to avoid GridFSBucket.delete throwing when file not found
            const _id = (prevId && typeof prevId === 'object' && prevId._bsontype) ? prevId : new mongoose.Types.ObjectId(prevId);
            const files = await bucket.find({ _id }).toArray();
            if (files && files.length) {
              await new Promise((resolve, reject) => {
                bucket.delete(_id, (err) => (err ? reject(err) : resolve()));
              });
            } else {
              console.log('Previous avatar file not found in GridFS, skipping delete for', prevId.toString());
            }
          } catch (innerErr) {
            console.warn('Error while attempting to delete previous avatar file:', innerErr && innerErr.message ? innerErr.message : innerErr);
          }
        }
      } catch (e) {
        // Log but don't fail the request on cleanup errors
        console.warn('Failed deleting previous avatar file (outer):', e && e.message ? e.message : e);
      }
    }

    // if client passes avatar as empty string, treat as delete avatar and remove existing file
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'avatar') && req.body.avatar === '') {
      // delete existing file if present
      if (existingUser && existingUser.avatarFileId) {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
        try {
          const prevId = existingUser.avatarFileId;
          console.log('Deleting avatar per user request for', userId, 'fileId=', prevId.toString());
          try {
            const _id = (prevId && typeof prevId === 'object' && prevId._bsontype) ? prevId : new mongoose.Types.ObjectId(prevId);
            const files = await bucket.find({ _id }).toArray();
            if (files && files.length) {
              await new Promise((resolve, reject) => {
                bucket.delete(_id, (err) => (err ? reject(err) : resolve()));
              });
            } else {
              console.log('Avatar file not found in GridFS during removal request, skipping delete for', prevId.toString());
            }
          } catch (innerErr) {
            console.warn('Failed deleting avatar during removal request (inner):', innerErr && innerErr.message ? innerErr.message : innerErr);
          }
        } catch (e) {
          console.warn('Failed deleting avatar during removal request (outer):', e && e.message ? e.message : e);
        }
      }
      updates.avatarFileId = undefined;
      updates.avatarMime = undefined;
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Build a convenient avatar URL for the client if an avatar file exists
    const avatarUrl = user.avatarFileId
      ? `${req.protocol}://${req.get('host')}/api/auth/avatar/${user.avatarFileId}`
      : null;

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
        avatarUrl,
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

    // Look up file metadata first. If file doesn't exist, return an SVG with initials.
    let files = [];
    try {
      files = await bucket.find({ _id }).toArray();
    } catch (e) {
      files = [];
    }

    if (!files || files.length === 0) {
      // Try to find a user that references this avatarFileId to get names for initials
      let initials = 'CU';
      try {
        const user = await User.findOne({ avatarFileId: _id }).select('firstName lastName');
        if (user) {
          const fn = (user.firstName || '').trim();
          const ln = (user.lastName || '').trim();
          const a = fn ? fn.charAt(0).toUpperCase() : '';
          const b = ln ? ln.charAt(0).toUpperCase() : (fn ? (fn.length > 1 ? fn.charAt(1).toUpperCase() : '') : 'U');
          initials = (a || 'C') + (b || 'U');
        }
      } catch (e) {
        // ignore and fall through to default initials
      }

      // Generate a simple SVG avatar with initials. Use inline SVG so it can be returned as an image.
      const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'>` +
        `<rect width='100%' height='100%' fill='#4b5563'/>` +
        `<text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='96' fill='#ffffff'>${initials}</text>` +
        `</svg>`;

      res.setHeader('Content-Type', 'image/svg+xml');
      return res.status(200).send(svg);
    }

    // If file exists, set content type from metadata and stream it
    try {
      if (files[0] && files[0].contentType) {
        res.setHeader('Content-Type', files[0].contentType);
      }
    } catch (e) {}

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
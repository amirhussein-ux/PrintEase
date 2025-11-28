const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const auditLogger = require('../middleware/auditLogger');
const User = require('../models/userModel');

// Get user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user profile
router.put('/profile', protect, auditLogger('update', 'Profile'), async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, email, phone },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user by id (public minimal info) - used by owner chat when conversations are not populated
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('firstName lastName email fullName name');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
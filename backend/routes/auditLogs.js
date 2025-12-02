const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/authMiddleware');

// Get audit logs for current user's store
router.get('/mine', protect, async (req, res) => {
  try {
    const storeId = req.user.storeId || req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // If user is owner, show all logs from their store
    // If you want owners to see ALL logs (including customers), remove the storeId filter
    const query = req.user.role === 'owner' ? {} : { storeId };
    
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get specific audit log by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const storeId = req.user.storeId || req.user._id;
    const log = await AuditLog.findOne({ 
      _id: req.params.id, 
      storeId 
    });

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error('Failed to fetch audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

module.exports = router;
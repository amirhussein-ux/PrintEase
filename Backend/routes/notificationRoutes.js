const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// POST /api/notifications
router.post('/', notificationController.createNotification);
// GET /api/notifications?recipient=...
router.get('/', notificationController.getNotifications);
// GET /api/notifications/all (for admin/debug)
router.get('/all', notificationController.getAllNotifications);
// PATCH /api/notifications/:id/read
router.patch('/:id/read', notificationController.markAsRead);
// DELETE /api/notifications/:id
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;

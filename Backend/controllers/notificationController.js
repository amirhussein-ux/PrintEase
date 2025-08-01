const fs = require('fs');
const path = require('path');
const NOTIF_FILE = path.join(__dirname, '../../notifications.json');
let notifications = [];

// Load notifications from file on startup
if (fs.existsSync(NOTIF_FILE)) {
    try {
        notifications = JSON.parse(fs.readFileSync(NOTIF_FILE, 'utf-8'));
    } catch (e) {
        notifications = [];
    }
}

function saveNotifications() {
    fs.writeFileSync(NOTIF_FILE, JSON.stringify(notifications, null, 2));
}

// Create notification
exports.createNotification = (req, res) => {
    const { title, message, orderId, userType, type, time, recipient } = req.body;
    if (!title || !message || !recipient) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    const notification = {
        id: Date.now().toString(),
        title,
        message,
        orderId,
        userType,
        type,
        time: time || new Date().toISOString(),
        recipient,
        read: false
    };
    notifications.unshift(notification);
    saveNotifications();
    res.status(201).json({ success: true, notification });
};

// Get notifications for a recipient, filter out those with deleted orders
const Order = require('../models/Order');
exports.getNotifications = async (req, res) => {
    const { recipient } = req.query;
    if (!recipient) {
        return res.status(400).json({ error: 'Recipient required.' });
    }
    let userNotifications = notifications.filter(n => n.recipient === recipient);
    // Only filter if notification has orderId
    const orderIds = userNotifications.map(n => n.orderId).filter(Boolean);
    let existingOrders = [];
    if (orderIds.length > 0) {
        existingOrders = await Order.find({ orderId: { $in: orderIds } }).select('orderId');
        existingOrders = existingOrders.map(o => o.orderId);
    }
    userNotifications = userNotifications.filter(n => {
        if (!n.orderId) return true; // keep notifications not tied to an order
        return existingOrders.includes(n.orderId);
    });
    res.json(userNotifications);
};

// Get all notifications (for debugging/admin)
exports.getAllNotifications = (req, res) => {
    res.json(notifications);
};

// Mark notification as read
exports.markAsRead = (req, res) => {
    const { id } = req.params;
    const notif = notifications.find(n => n.id === id);
    if (!notif) {
        return res.status(404).json({ error: 'Notification not found.' });
    }
    notif.read = true;
    saveNotifications();
    res.json({ success: true, notification: notif });
};

// Delete notification
exports.deleteNotification = (req, res) => {
    const { id } = req.params;
    const idx = notifications.findIndex(n => n.id === id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Notification not found.' });
    }
    notifications.splice(idx, 1);
    saveNotifications();
    res.json({ success: true });
};

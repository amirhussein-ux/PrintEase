const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Notification = require("../models/notificationModel");
const { protect } = require("../middleware/authMiddleware");

// --- Get all notifications for a user ---
router.get("/", protect, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const role = req.user.role; // assuming your auth middleware adds `role` to req.user
    const notifications = await Notification.find({ user: userId, type: role })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// --- Delete all notifications for the authenticated user ---
router.delete("/delete-all", protect, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    await Notification.deleteMany({ user: userId });
    res.json({ message: "All notifications deleted" });
  } catch (err) {
    console.error("Failed to delete all notifications:", err);
    res.status(500).json({ message: "Failed to delete all notifications" });
  }
});

// --- Mark a single notification as read ---
router.put("/:id/read", protect, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const notification = await Notification.findOne({ _id: req.params.id, user: userId });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;
    await notification.save();

    res.json(notification);
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// --- Mark all notifications as read ---
router.put("/read-all", protect, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
    res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

// --- Delete a single notification ---
router.delete("/:id", protect, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const result = await Notification.deleteOne({ _id: id, user: userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("Failed to delete notification:", err);
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

module.exports = router;

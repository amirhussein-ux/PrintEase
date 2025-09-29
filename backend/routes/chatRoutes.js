// backend/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const { Conversation, Message } = require("../models/chatModel");

// --- Get conversations for owner using query param ---
router.get("/conversations", async (req, res) => {
  const ownerId = req.query.ownerId;
  if (!ownerId) return res.status(400).json({ error: "Missing ownerId query parameter" });

  try {
    const conversations = await Conversation.find({
      participants: ownerId,
    }).populate("participants", "firstName lastName");

    const result = conversations.map((c) => ({
      _id: c._id,
      participants: c.participants.map((p) => p._id.toString()),
      lastMessage: c.lastMessage,
      customerName:
        c.participants.find((p) => p._id.toString() !== ownerId)?.firstName || "Customer",
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Get messages in a conversation ---
router.get("/messages/:conversationId", async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

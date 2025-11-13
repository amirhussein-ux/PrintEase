// backend/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const { Conversation, Message } = require("../models/chatModel");
const mongoose = require("mongoose");

// --- Get or create conversation ---
router.post("/conversation", async (req, res) => {
  const { customerId, ownerId } = req.body;

  if (!customerId || !ownerId) {
    return res.status(400).json({ error: "Missing customerId or ownerId" });
  }

  try {
    const customerObjectId = new mongoose.Types.ObjectId(customerId);
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

    let conversation = await Conversation.findOne({
      participants: { $all: [customerObjectId, ownerObjectId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [customerObjectId, ownerObjectId],
        lastMessage: "Conversation started",
      });
    }

    res.json({
      _id: conversation._id,
      participants: conversation.participants.map(p => p.toString()),
      lastMessage: conversation.lastMessage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    }).sort({ createdAt: 1 }); // Sort by oldest first

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Create message (REST fallback) ---
router.post("/messages", async (req, res) => {
  const { conversationId, senderId, text, fileUrl, fileName } = req.body;

  if (!conversationId || !senderId) {
    return res.status(400).json({ error: "Missing conversationId or senderId" });
  }

  try {
    const message = await Message.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      senderId: new mongoose.Types.ObjectId(senderId),
      text: text || "",
      fileUrl: fileUrl || null,
      fileName: fileName || null,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text || fileName || "File",
      updatedAt: new Date(),
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
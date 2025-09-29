const { Conversation, Message } = require("../models/chatModel");
const mongoose = require("mongoose");

// Create or get a conversation
const getOrCreateConversation = async (req, res) => {
  const { customerId, ownerId } = req.body;

  if (!customerId || !ownerId) {
    return res.status(400).json({ message: "Missing customerId or ownerId" });
  }

  try {
    // Ensure IDs are ObjectId
    const customerObjectId = new mongoose.Types.ObjectId(customerId);
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

    let conversation = await Conversation.findOne({
      participants: { $all: [customerObjectId, ownerObjectId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [customerObjectId, ownerObjectId],
      });
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error("❌ getOrCreateConversation error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Send message
const sendMessage = async (req, res) => {
  const { conversationId, senderId, text, fileUrl, fileName } = req.body;

  if (!conversationId || !senderId) {
    return res.status(400).json({ message: "Missing required fields" });
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
    console.error("❌ sendMessage error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get messages by conversation
const getMessages = async (req, res) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(400).json({ message: "Missing conversationId" });
  }

  try {
    const messages = await Message.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    console.error("❌ getMessages error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get all conversations for owner
const getConversations = async (req, res) => {
  const { ownerId } = req.query;

  if (!ownerId) {
    return res.status(400).json({ message: "Missing ownerId" });
  }

  try {
    const conversations = await Conversation.find({
      participants: new mongoose.Types.ObjectId(ownerId),
    })
      .populate("participants", "firstName lastName email")
      .sort({ updatedAt: -1 });

    res.status(200).json(conversations);
  } catch (err) {
    console.error("❌ getConversations error:", err);
    res.status(500).json({ message: err.message });
  }
};

console.log("✅ chatController functions loaded");

module.exports = {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  getConversations,
};

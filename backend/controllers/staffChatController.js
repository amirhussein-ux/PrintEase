const mongoose = require("mongoose");
const StaffChat = require("../models/staffChatModel");
const User = require("../models/userModel");

const buildKey = (ids) => ids.map((id) => id.toString()).sort().join("-");

// POST /api/staff-chat/create
exports.getOrCreateStaffChat = async (req, res) => {
  try {
    const { userAId, userBId } = req.body;
    if (!userAId || !userBId) return res.status(400).json({ message: "userAId and userBId required" });
    const aId = new mongoose.Types.ObjectId(userAId);
    const bId = new mongoose.Types.ObjectId(userBId);
    const key = buildKey([aId, bId]);
    let chat = await StaffChat.findOne({ participantsKey: key });
    if (!chat) {
      try {
        chat = await StaffChat.create({ participants: [aId, bId] });
      } catch (err) {
        if (err.code === 11000) {
          chat = await StaffChat.findOne({ participantsKey: key });
        } else throw err;
      }
    }
    return res.json(formatStaffChatSummary(chat));
  } catch (err) {
    console.error("getOrCreateStaffChat error", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/staff-chat/list?userId=...
exports.listStaffChatsForUser = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId query required" });
    const uId = new mongoose.Types.ObjectId(userId);
    const chats = await StaffChat.find({ participants: uId }).sort({ updatedAt: -1 }).lean();
    const ids = new Set();
    chats.forEach((c) => c.participants.forEach((p) => ids.add(p.toString())));
    const users = await User.find({ _id: { $in: [...ids] } }).select("firstName lastName email role").lean();
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
    return res.json(chats.map((c) => formatStaffChatSummary(c, userMap)));
  } catch (err) {
    console.error("listStaffChatsForUser error", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/staff-chat/:chatId/messages
exports.getStaffChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!chatId) return res.status(400).json({ message: "chatId required" });
    const chat = await StaffChat.findById(chatId).lean();
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    const sorted = [...(chat.messages || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return res.json(sorted);
  } catch (err) {
    console.error("getStaffChatMessages error", err);
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/staff-chat/:chatId/messages
exports.addStaffChatMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { senderId, text, fileUrl, fileName } = req.body;
    if (!chatId || !senderId) return res.status(400).json({ message: "chatId and senderId required" });
    const chat = await StaffChat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    const message = await chat.appendMessage({ senderId, text: text || "", fileUrl: fileUrl || null, fileName: fileName || null });
    return res.status(201).json(message);
  } catch (err) {
    console.error("addStaffChatMessage error", err);
    return res.status(500).json({ message: err.message });
  }
};

function formatStaffChatSummary(chatDoc, userMap) {
  const participants = chatDoc.participants.map((p) => p.toString());
  return {
    _id: chatDoc._id.toString(),
    participants,
    lastMessage: chatDoc.lastMessage || null,
    updatedAt: chatDoc.updatedAt,
    hasMessages: (chatDoc.messages || []).length > 0,
    participantDetails: userMap
      ? participants.map((id) => {
          const u = userMap[id];
          return u
            ? {
                _id: id,
                name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || "User",
                email: u.email,
                role: u.role,
              }
            : { _id: id };
        })
      : undefined,
  };
}

const mongoose = require("mongoose");
const CustomerChat = require("../models/customerChatModel");
const User = require("../models/userModel");
const { findOrMigrateCustomerChat } = require("../utils/customerChatHelper");
const AuditLog = require('../models/AuditLog');

// Helper for audit logging
const logAudit = async (req, store, action, resource, resourceId, details = {}) => {
  try {
    await AuditLog.create({
      action,
      resource,
      resourceId,
      user: req.user?.email || req.user?.username || 'System',
      userRole: req.user?.role || 'unknown',
      storeId: store._id,
      details,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    console.log(`✅ ${action} audit log created for ${resource}: ${resourceId}`);
  } catch (auditErr) {
    console.error(`❌ Failed to create ${action} audit log:`, auditErr.message);
  }
};

const getCustomerIdFromChat = (chatDoc) => {
  const storeIdStr = chatDoc.storeId ? chatDoc.storeId.toString() : null;
  const participants = (chatDoc.participants || []).map((p) => p.toString());
  if (storeIdStr) return participants.find((p) => p !== storeIdStr) || null;
  return participants[0] || null;
};

// POST /api/customer-chat/create
exports.getOrCreateCustomerChat = async (req, res) => {
  try {
    const { customerId, storeId } = req.body;
    if (!customerId || !storeId) {
      return res.status(400).json({ message: "customerId and storeId are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ message: "Invalid customerId or storeId" });
    }
    const cId = new mongoose.Types.ObjectId(customerId);
    const sId = new mongoose.Types.ObjectId(storeId);
    let chat = await findOrMigrateCustomerChat({ customerId: cId, storeId: sId });
    if (!chat) {
      try {
        chat = await CustomerChat.create({ participants: [cId, sId], storeId: sId });

        // AUDIT LOG: Customer Chat Created
        await logAudit(req, { _id: sId }, 'create', 'chat', chat._id, { // Note: store object
          chatId: chat._id,
          customerId: customerId,
          storeId: storeId,
          createdBy: req.user?.email || req.user?.username || 'System'
        });

      } catch (err) {
        // Handle race condition duplicate key
        if (err.code === 11000) {
          chat = await findOrMigrateCustomerChat({ customerId: cId, storeId: sId });
        } else throw err;
      }
    }
    return res.json(formatChatSummary(chat));
  } catch (err) {
    console.error("getOrCreateCustomerChat error", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/customer-chat/store/:storeId
exports.listCustomerChatsForStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    if (!storeId) return res.status(400).json({ message: 'storeId param required' });
    const sId = new mongoose.Types.ObjectId(storeId);
    const chats = await CustomerChat.find({ storeId: sId }).sort({ updatedAt: -1 }).lean();
    const userIds = new Set();
    chats.forEach(c => {
      const customerId = getCustomerIdFromChat(c);
      if (customerId) userIds.add(customerId);
    });
    const users = await User.find({ _id: { $in: [...userIds] } }).select('firstName lastName email').lean();
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));
    return res.json(chats.map(c => formatChatSummary(c, userMap)));
  } catch (err) {
    console.error('listCustomerChatsForStore error', err);
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/customer-chat/:chatId/messages
exports.getCustomerChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!chatId) return res.status(400).json({ message: "chatId required" });
    const chat = await CustomerChat.findById(chatId).lean();
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    console.log(`[getCustomerChatMessages] chatId=${chatId} messages=${(chat.messages||[]).length}`);
    const sorted = [...(chat.messages || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return res.json(sorted);
  } catch (err) {
    console.error("getCustomerChatMessages error", err);
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/customer-chat/:chatId/messages
exports.addCustomerChatMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { senderId, text, fileUrl, fileName, payloadType, payload } = req.body;
    if (!chatId || !senderId) return res.status(400).json({ message: "chatId and senderId required" });
    const chat = await CustomerChat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    const message = await chat.appendMessage({
      senderId,
      text: text || "",
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      payloadType: payloadType || undefined,
      payload: payload || undefined,
    });

    // AUDIT LOG: Chat Message Sent
    await logAudit(req, { _id: chat.storeId }, 'message', 'chat', chatId, {
      chatId: chatId,
      messageId: message._id,
      senderId: senderId,
      hasFile: !!fileUrl,
      sentBy: req.user?.email || req.user?.username || 'System'
    });
    
    return res.status(201).json(message);
  } catch (err) {
    console.error("addCustomerChatMessage error", err);
    return res.status(500).json({ message: err.message });
  }
};

function formatChatSummary(chatDoc, userMap) {
  const customerId = getCustomerIdFromChat(chatDoc);
  const customerUser = userMap ? userMap[customerId] : null;
  return {
    _id: chatDoc._id.toString(),
    participants: chatDoc.participants.map((p) => p.toString()),
    customerId,
    customerName: customerUser ? `${customerUser.firstName || ""} ${customerUser.lastName || ""}`.trim() || "Customer" : undefined,
    lastMessage: chatDoc.lastMessage || null,
    updatedAt: chatDoc.updatedAt,
    hasMessages: (chatDoc.messages || []).length > 0,
    storeId: chatDoc.storeId ? chatDoc.storeId.toString() : null,
  };
}

const mongoose = require("mongoose");
const CustomerChat = require("../models/customerChatModel");
const User = require("../models/userModel");
const FAQ = require("../models/faqModel"); // NEW: Import FAQ model
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

// NEW: Auto-reply logic
const getAutoReplyForMessage = async (storeId, message) => {
  try {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Check if customer wants human agent
    const humanTriggers = ['human', 'agent', 'representative', 'real person', 'talk to admin', 'speak to someone', 'admin', 'manager'];
    const wantsHuman = humanTriggers.some(trigger => normalizedMessage.includes(trigger));
    
    if (wantsHuman) {
      return {
        type: 'escalation',
        text: "I'll connect you with a store representative. Please hold on...",
        escalateToHuman: true,
        isAutoReply: true
      };
    }
    
    // Check for FAQ matches
    const storeFAQs = await FAQ.find({ storeId, isActive: true });
    
    // First check exact triggers
    const exactMatch = storeFAQs.find(faq => 
      faq.triggers && faq.triggers.some(trigger => 
        trigger.toLowerCase() === normalizedMessage
      )
    );
    
    if (exactMatch) {
      return {
        type: 'faq',
        text: exactMatch.answer,
        faqId: exactMatch._id,
        question: exactMatch.question,
        category: exactMatch.category,
        isAutoReply: true
      };
    }
    
    // Check keyword matches
    const keywordMatches = storeFAQs.filter(faq => 
      faq.keywords && faq.keywords.some(keyword => 
        normalizedMessage.includes(keyword.toLowerCase())
      )
    );
    
    if (keywordMatches.length > 0) {
      // Find best match (most keyword matches)
      const bestMatch = keywordMatches.reduce((best, current) => {
        const currentMatches = current.keywords.filter(keyword => 
          normalizedMessage.includes(keyword.toLowerCase())
        ).length;
        const bestMatches = best.keywords.filter(keyword => 
          normalizedMessage.includes(keyword.toLowerCase())
        ).length;
        return currentMatches > bestMatches ? current : best;
      });
      
      return {
        type: 'faq',
        text: bestMatch.answer,
        faqId: bestMatch._id,
        question: bestMatch.question,
        category: bestMatch.category,
        isAutoReply: true
      };
    }
    
    // Default response for no match
    return {
      type: 'no_match',
      text: "I'm not sure I understand. Could you please rephrase your question? Or you can ask about:\n• Order cancellation\n• Design editing\n• Payment issues\n• Delivery tracking\n\nOr type 'human' to speak with a store representative.",
      isAutoReply: true
    };
    
  } catch (error) {
    console.error("Auto-reply error:", error);
    return null;
  }
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
        await logAudit(req, { _id: sId }, 'create', 'chat', chat._id, {
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
    
    // Check if this is a customer message (not store/auto-reply)
    const isCustomerMessage = !chat.participants.includes(senderId) || 
                              chat.storeId.toString() !== senderId;
    
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
      isAutoReply: false,
      sentBy: req.user?.email || req.user?.username || 'System'
    });
    
    return res.status(201).json(message);
  } catch (err) {
    console.error("addCustomerChatMessage error", err);
    return res.status(500).json({ message: err.message });
  }
};

// NEW: Add auto-reply message endpoint
exports.addAutoReplyMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text, faqId, question, category, escalateToHuman } = req.body;
    
    if (!chatId || !text) {
      return res.status(400).json({ message: "chatId and text required" });
    }
    
    const chat = await CustomerChat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    
    // Use storeId as sender for auto-reply
    const senderId = chat.storeId;
    
    const message = await chat.appendMessage({
      senderId,
      text,
      payloadType: 'faq_response',
      payload: {
        faqId: faqId || null,
        question: question || null,
        category: category || null,
        isAutoReply: true,
        escalateToHuman: escalateToHuman || false
      },
      isAutoReply: true
    });

    // AUDIT LOG: Auto-Reply Sent
    await logAudit(req, { _id: chat.storeId }, 'auto_reply', 'chat', chatId, {
      chatId: chatId,
      messageId: message._id,
      faqId: faqId,
      question: question,
      category: category
    });
    
    return res.status(201).json(message);
  } catch (err) {
    console.error("addAutoReplyMessage error", err);
    return res.status(500).json({ message: err.message });
  }
};

// NEW: Check for auto-reply
exports.checkAutoReply = async (req, res) => {
  try {
    const { storeId, message } = req.body;
    
    if (!storeId || !message) {
      return res.status(400).json({ message: "storeId and message required" });
    }
    
    const autoReply = await getAutoReplyForMessage(storeId, message);
    
    if (!autoReply) {
      return res.status(200).json({ hasReply: false });
    }
    
    return res.status(200).json({
      hasReply: true,
      ...autoReply
    });
  } catch (err) {
    console.error("checkAutoReply error", err);
    return res.status(500).json({ message: err.message });
  }
};

// NEW: Mark chat as escalated to human
exports.escalateToHuman = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await CustomerChat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });
    
    chat.isEscalated = true;
    chat.escalatedAt = new Date();
    await chat.save();

    // AUDIT LOG: Chat Escalated
    await logAudit(req, { _id: chat.storeId }, 'escalate', 'chat', chatId, {
      chatId: chatId,
      escalatedAt: chat.escalatedAt
    });
    
    return res.status(200).json({ 
      success: true, 
      message: "Chat escalated to human agent",
      escalatedAt: chat.escalatedAt 
    });
  } catch (err) {
    console.error("escalateToHuman error", err);
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
    isEscalated: chatDoc.isEscalated || false,
    escalatedAt: chatDoc.escalatedAt || null
  };
}
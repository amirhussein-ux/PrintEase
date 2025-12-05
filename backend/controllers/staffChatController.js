const mongoose = require("mongoose");
const StaffChat = require("../models/staffChatModel");
const User = require("../models/userModel");
const Employee = require("../models/employeeModel");
const getStoreAuditModel = require('../models/StoreAuditLog');

// Helper for audit logging
const logAudit = async (req, store, action, resource, resourceId, details = {}) => {
  try {
    // ✅ Staff chat is for employees/owners only, but add safety check
    const userRole = req.user?.role;
    
    // Skip logging if it's a customer or guest (shouldn't happen in staff chat)
    if (userRole === 'customer' || userRole === 'guest') {
      return; // Don't log customer/guest actions
    }
    
    // Only log for employees/owners/system
    const StoreAudit = getStoreAuditModel(store._id);
    
    await StoreAudit.create({
      action,
      resource,
      resourceId,
      user: req.user?.email || req.user?.username || 'System',
      userRole: userRole || 'unknown',
      details,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    console.log(`✅ [Store ${store._id}] ${action} ${resource}:${resourceId}`);
  } catch (auditErr) {
    console.error(`❌ Failed audit log for store ${store._id}:`, auditErr.message);
  }
};

// Helper to get storeId from participants
const getStoreIdFromParticipants = async (participantIds) => {
  try {
    // Try to get store from employees first
    const employees = await Employee.find({ 
      _id: { $in: participantIds } 
    }).select('store').limit(1);
    
    if (employees.length > 0 && employees[0].store) {
      return employees[0].store;
    }
    
    // If not employees, try users (owners)
    const users = await User.find({
      _id: { $in: participantIds },
      role: 'owner'
    }).select('storeId').limit(1);
    
    if (users.length > 0 && users[0].storeId) {
      return users[0].storeId;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting storeId from participants:', error);
    return null;
  }
};

const buildKey = (ids) => ids.map((id) => id.toString()).sort().join("-");

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.toString === "function") return value.toString();
  return String(value);
};

async function buildParticipantProfileMap(ids = []) {
  const unique = [...new Set(ids.map((id) => toIdString(id)).filter(Boolean))];
  if (!unique.length) return new Map();
  const objectIds = unique.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
  if (!objectIds.length) return new Map();
  const [users, employees] = await Promise.all([
    User.find({ _id: { $in: objectIds } }).select("firstName lastName email role").lean(),
    Employee.find({ _id: { $in: objectIds } }).select("fullName email role active").lean(),
  ]);

  const map = new Map();
  users.forEach((u) => {
    map.set(u._id.toString(), {
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || "User",
      email: u.email || undefined,
      role: u.role || "owner",
      kind: "user",
    });
  });
  employees.forEach((emp) => {
    map.set(emp._id.toString(), {
      name: emp.fullName || "Employee",
      email: emp.email || undefined,
      role: emp.role || "employee",
      kind: "employee",
    });
  });
  return map;
}

const hasMissingParticipants = (chatDoc, profileMap, skipId) => {
  const skip = skipId ? toIdString(skipId) : null;
  return chatDoc.participants.some((participant) => {
    const id = toIdString(participant);
    if (skip && id === skip) return false;
    return !profileMap.has(id);
  });
};

// POST /api/staff-chat/create
exports.getOrCreateStaffChat = async (req, res) => {
  try {
    const { userAId, userBId } = req.body;
    if (!userAId || !userBId) return res.status(400).json({ message: "userAId and userBId required" });
    const aId = new mongoose.Types.ObjectId(userAId);
    const bId = new mongoose.Types.ObjectId(userBId);
    const key = buildKey([aId, bId]);
    const profileMap = await buildParticipantProfileMap([aId, bId]);
    if (!profileMap.has(aId.toString()) || !profileMap.has(bId.toString())) {
      return res.status(404).json({ message: "One or more participants are unavailable" });
    }
    let chat = await StaffChat.findOne({ participantsKey: key });
    if (!chat) {
      try {
        chat = await StaffChat.create({ participants: [aId, bId] });
        
        // Get storeId from participants
        const storeId = await getStoreIdFromParticipants([aId, bId]);
        
        // AUDIT LOG: Staff Chat Created
        if (storeId) {
          await logAudit(req, { _id: storeId }, 'create', 'chat', chat._id, {
            chatId: chat._id,
            participantA: userAId,
            participantB: userBId,
            chatType: 'staff',
            createdBy: req.user?.email || req.user?.username || 'System'
          });
        }
        
      } catch (err) {
        if (err.code === 11000) {
          chat = await StaffChat.findOne({ participantsKey: key });
        } else throw err;
      }
    }
    return res.json(formatStaffChatSummary(chat, profileMap));
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
    const profileMap = await buildParticipantProfileMap([...ids]);
    const filtered = chats.filter((chat) => !hasMissingParticipants(chat, profileMap, uId));
    return res.json(filtered.map((c) => formatStaffChatSummary(c, profileMap)));
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
    const profileMap = await buildParticipantProfileMap(chat.participants || []);
    if (hasMissingParticipants(chat, profileMap)) {
      return res.status(404).json({ message: "Chat is unavailable" });
    }
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
    const profileMap = await buildParticipantProfileMap(chat.participants || []);
    if (hasMissingParticipants(chat, profileMap)) {
      return res.status(404).json({ message: "Chat is unavailable" });
    }
    const message = await chat.appendMessage({ senderId, text: text || "", fileUrl: fileUrl || null, fileName: fileName || null });
    
    // Get storeId from chat participants
    const storeId = await getStoreIdFromParticipants(chat.participants);
    
    // AUDIT LOG: Staff Chat Message Sent
    if (storeId) {
      await logAudit(req, { _id: storeId }, 'message', 'chat', chatId, {
        chatId: chatId,
        messageId: message._id,
        senderId: senderId,
        chatType: 'staff',
        hasFile: !!fileUrl,
        sentBy: req.user?.email || req.user?.username || 'System'
      });
    }

    return res.status(201).json(message);
  } catch (err) {
    console.error("addStaffChatMessage error", err);
    return res.status(500).json({ message: err.message });
  }
};

function formatStaffChatSummary(chatDoc, profileMap) {
  const participants = chatDoc.participants.map((p) => p.toString());
  return {
    _id: chatDoc._id.toString(),
    participants,
    lastMessage: chatDoc.lastMessage || null,
    updatedAt: chatDoc.updatedAt,
    hasMessages: (chatDoc.messages || []).length > 0,
    participantDetails: profileMap
      ? participants.map((id) => {
          const profile = typeof profileMap.get === "function" ? profileMap.get(id) : profileMap[id];
          return profile
            ? {
                _id: id,
                name: profile.name,
                email: profile.email,
                role: profile.role,
              }
            : { _id: id };
        })
      : undefined,
  };
}

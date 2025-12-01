require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose"); 

const app = express();
const connectDB = require("./config/db");

// New chat collections
const CustomerChat = require("./models/customerChatModel");
const StaffChat = require("./models/staffChatModel");
const User = require("./models/userModel");

// --- Import routes ---
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const printStoreRoutes = require("./routes/printStoreRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const orderRoutes = require("./routes/orderRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const customerChatRoutes = require("./routes/customerChatRoutes");
const staffChatRoutes = require("./routes/staffChatRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const Service = require("./models/serviceModel");
const PrintStore = require("./models/printStoreModel");
const Employee = require("./models/employeeModel");
const { findOrMigrateCustomerChat } = require("./utils/customerChatHelper");
const auditLogRoutes = require('./routes/auditLogs');

const PORT = process.env.PORT || 8000;

// --- DB connection ---
connectDB()
  .then(() => console.log("🔹 DB connected"))
  .catch((err) => console.error("🔹 DB connection error:", err.message));

// --- Middleware ---
app.use(express.json());

// --- CORS ---
const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));

// --- Test route ---
app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/print-store", printStoreRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/customer-chat", customerChatRoutes);
app.use("/api/staff-chat", staffChatRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// --- Test Audit Logs Route ---
const AuditLog = require('./models/AuditLog'); // Add this import at the top with other imports
app.get("/test-audit", async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({timestamp: -1}).limit(10);
    console.log('Recent audit logs:', logs);
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// --- Server setup ---
const server = http.createServer(app);

// --- Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

let onlineUsers = {}; // track online users

const getCustomerIdFromChat = (chatDoc) => {
  const storeIdStr = chatDoc.storeId ? chatDoc.storeId.toString() : null;
  const participants = (chatDoc.participants || []).map((p) => p.toString());
  if (storeIdStr) return participants.find((p) => p !== storeIdStr) || null;
  return participants[0] || null;
};

const getStoreRecipients = async (storeId) => {
  if (!storeId) return { ownerId: null, employeeIds: [], memberIds: [] };
  const store = await PrintStore.findById(storeId).select('owner').lean();
  if (!store) return { ownerId: null, employeeIds: [], memberIds: [] };
  const employees = await Employee.find({ store: storeId, active: true }).select('_id').lean();
  const ownerId = store.owner ? store.owner.toString() : null;
  const employeeIds = employees.map((e) => e._id.toString());
  const memberIds = [ownerId, ...employeeIds].filter(Boolean);
  return { ownerId, employeeIds, memberIds };
};

const emitToUserIds = (ioInstance, ids, event, payload, excludeId) => {
  if (!Array.isArray(ids) || !ids.length) return;
  const delivered = new Set();
  ids.forEach((id) => {
    if (!id || delivered.has(id) || (excludeId && excludeId === id)) return;
    delivered.add(id);
    const target = onlineUsers[id];
    if (target) ioInstance.to(target.socketId).emit(event, payload);
  });
};

io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  // --- REGISTER ---
  socket.on("register", ({ userId, role }) => {
    if (!userId) return socket.emit("error", { message: "No userId provided" });

    onlineUsers[userId] = { socketId: socket.id, role };
    console.log(`✅ Registered ${role}: ${userId}`);
    socket.emit("registered", { success: true });
    io.emit("userOnline", { userId, online: true });
  });

  // --- CHECK EXISTING CUSTOMER CHAT ---
  socket.on("checkCustomerChat", async ({ customerId, storeId }) => {
    console.log("🔍 Checking customer chat between customer", customerId, "and store", storeId);
    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(storeId)) {
      return socket.emit("error", { message: "Invalid customerId or storeId" });
    }
    try {
      const chat = await findOrMigrateCustomerChat({ customerId, storeId });
      if (chat) {
        const resolvedStoreId = chat.storeId ? chat.storeId.toString() : storeId;
        const { memberIds } = await getStoreRecipients(resolvedStoreId);
        socket.emit("customerChatExists", {
          chatId: chat._id.toString(),
          customerId,
          storeId: resolvedStoreId,
          storeMemberIds: memberIds,
        });
      }
    } catch (err) {
      console.error("❌ Error checking customer chat:", err);
      socket.emit("error", { message: "Failed to check customer chat" });
    }
  });

  // --- START CUSTOMER CHAT ---
  socket.on("startCustomerChat", async ({ customerId, storeId, firstMessage, firstFile }) => {
    console.log("🆕 Starting customer chat for store", storeId);
    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(storeId)) {
      return socket.emit("error", { message: "Invalid customerId or storeId" });
    }
    try {
      const customerObjectId = new mongoose.Types.ObjectId(customerId);
      const storeObjectId = new mongoose.Types.ObjectId(storeId);
      let chat = await findOrMigrateCustomerChat({ customerId: customerObjectId, storeId: storeObjectId });
      if (!chat) {
        chat = await CustomerChat.create({ participants: [customerObjectId, storeObjectId], storeId: storeObjectId });
        console.log("🆕 Created customer chat", chat._id.toString());
      }
      if (firstMessage || firstFile) {
        await chat.appendMessage({ senderId: customerObjectId, text: firstMessage || "", fileName: firstFile || null });
      }
      const resolvedStoreId = chat.storeId ? chat.storeId.toString() : storeId;
      const { memberIds } = await getStoreRecipients(resolvedStoreId);
      socket.emit("customerChatCreated", {
        chatId: chat._id.toString(),
        customerId,
        storeId: resolvedStoreId,
        storeMemberIds: memberIds,
      });
      if (memberIds.length) {
        const customer = await User.findById(customerObjectId).select("firstName lastName").lean();
        const notifyPayload = {
          customerId,
          chatId: chat._id.toString(),
          lastMessage: firstMessage || firstFile || chat.lastMessage || "New chat",
          customerName: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
          storeId: resolvedStoreId,
        };
        emitToUserIds(io, memberIds, "newCustomerChat", notifyPayload);
        console.log(`📢 Emitted newCustomerChat to store ${resolvedStoreId} member(s)`);
      }
    } catch (err) {
      console.error("❌ startCustomerChat error", err);
      socket.emit("error", { message: "Failed to start customer chat" });
    }
  });

  // --- SEND CUSTOMER MESSAGE ---
  socket.on("sendCustomerMessage", async ({ chatId, senderId, receiverId, text, fileUrl, fileName }) => {
    console.log("📨 Customer message -> chat:", chatId);
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(senderId)) {
      return socket.emit("error", { message: "Invalid IDs" });
    }
    try {
      const chat = await CustomerChat.findById(chatId);
      if (!chat) return socket.emit("error", { message: "Chat not found" });
      const message = await chat.appendMessage({ senderId, text: text || "", fileUrl: fileUrl || null, fileName: fileName || null });
      const msgPayload = {
        _id: message._id.toString(),
        chatId,
        senderId,
        text: message.text,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        createdAt: message.createdAt,
        storeId: chat.storeId ? chat.storeId.toString() : null,
      };
      const customerId = getCustomerIdFromChat(chat);
      const senderIdStr = senderId.toString();
      const isCustomerSender = customerId && senderIdStr === customerId;
      let storeMemberIds = [];
      if (chat.storeId) {
        const recipients = await getStoreRecipients(chat.storeId);
        storeMemberIds = recipients.memberIds;
      }
      if (isCustomerSender) {
        emitToUserIds(io, storeMemberIds, "receiveCustomerMessage", msgPayload);
      } else {
        const targetId = receiverId || customerId;
        if (targetId && onlineUsers[targetId]) {
          io.to(onlineUsers[targetId].socketId).emit("receiveCustomerMessage", msgPayload);
        }
        emitToUserIds(io, storeMemberIds, "receiveCustomerMessage", msgPayload, senderIdStr);
      }
      socket.emit("customerMessageSent", msgPayload);
    } catch (err) {
      console.error("❌ sendCustomerMessage error", err);
      socket.emit("error", { message: "Failed to send customer message" });
    }
  });

  // --- STAFF GET/CREATE CHAT ---
  socket.on("staffGetOrCreateChat", async ({ userAId, userBId }) => {
    if (!mongoose.Types.ObjectId.isValid(userAId) || !mongoose.Types.ObjectId.isValid(userBId)) return socket.emit("error", { message: "Invalid user IDs" });
    try {
      const aId = new mongoose.Types.ObjectId(userAId);
      const bId = new mongoose.Types.ObjectId(userBId);
      let chat = await StaffChat.findOne({ participants: { $all: [aId, bId] } });
      if (!chat) chat = await StaffChat.create({ participants: [aId, bId] });
      socket.emit("staffChatReady", { chatId: chat._id.toString(), participants: chat.participants.map((p) => p.toString()) });
    } catch (err) {
      console.error("staffGetOrCreateChat error", err);
      socket.emit("error", { message: "Failed staff chat init" });
    }
  });

  // --- STAFF SEND MESSAGE ---
  socket.on("staffSendMessage", async ({ chatId, senderId, receiverId, text, fileUrl, fileName }) => {
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(senderId)) return socket.emit("error", { message: "Invalid IDs" });
    try {
      const chat = await StaffChat.findById(chatId);
      if (!chat) return socket.emit("error", { message: "Staff chat not found" });
      const message = await chat.appendMessage({ senderId, text: text || "", fileUrl: fileUrl || null, fileName: fileName || null });
      const payload = { _id: message._id.toString(), chatId, senderId, text: message.text, fileUrl: message.fileUrl, fileName: message.fileName, createdAt: message.createdAt };
      if (receiverId && onlineUsers[receiverId]) io.to(onlineUsers[receiverId].socketId).emit("staffReceiveMessage", payload);
      socket.emit("staffMessageSent", payload);
    } catch (err) {
      console.error("staffSendMessage error", err);
      socket.emit("error", { message: "Failed to send staff message" });
    }
  });

  // --- TYPING INDICATOR ---
  socket.on("typing", ({ conversationId, isTyping, userId }) => {
    if (!conversationId) return;
    console.log(`⌨️ Typing: ${isTyping} by ${userId} in ${conversationId}`);
    socket.to(conversationId).emit("userTyping", {
      conversationId,
      isTyping,
      userId,
    });
  });

  // --- JOIN CONVERSATION ROOM ---
  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
    console.log(`👥 User joined chat room: ${chatId}`);
  });

  // --- DISCONNECT ---
  socket.on("disconnect", () => {
    console.log("⚡ Client disconnected:", socket.id);
    for (const userId in onlineUsers) {
      if (onlineUsers[userId].socketId === socket.id) {
        delete onlineUsers[userId];
        io.emit("userOnline", { userId, online: false });
        console.log(`🗑️ Removed user ${userId}`);
        break;
      }
    }
  });
});

app.set("io", io);
app.set("onlineUsers", onlineUsers);

// --- Start server ---
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// --- Purge soft-deleted services older than 30 days ---
async function purgeDeletedServices() {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const old = await Service.find({ deletedAt: { $ne: null, $lte: cutoff } });
    if (!old.length) return;
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    for (const svc of old) {
      if (svc.imageFileId) {
        try { await bucket.delete(svc.imageFileId); } catch (_) { /* ignore missing */ }
      }
      await Service.deleteOne({ _id: svc._id });
    }
    console.log(`🧹 Purged ${old.length} service(s) older than 30 days`);
  } catch (err) {
    console.error('Failed purging deleted services:', err?.message || err);
  }
}

// Run on startup and every 24 hours
setTimeout(purgeDeletedServices, 10_000);
setInterval(purgeDeletedServices, 24 * 60 * 60 * 1000);
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose"); 

const app = express();
const connectDB = require("./config/db");
const { Conversation, Message } = require("./models/chatModel");
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
const chatRoutes = require("./routes/chatRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const Service = require("./models/serviceModel");

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
app.use("/api/chat", chatRoutes);
app.use("/api/analytics", analyticsRoutes);

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

  // --- CHECK EXISTING CONVERSATION ---
  socket.on("checkConversation", async ({ customerId, ownerId }) => {
    console.log("🔍 Checking existing conversation between:", customerId, ownerId);
    
    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(ownerId)) {
      return socket.emit("error", { message: "Invalid user IDs" });
    }

    try {
      const customerObjectId = new mongoose.Types.ObjectId(customerId);
      const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

      const conversation = await Conversation.findOne({
        participants: { $all: [customerObjectId, ownerObjectId] },
      });

      if (conversation) {
        console.log(`✅ Found existing conversation: ${conversation._id}`);
        socket.emit("conversationExists", { 
          conversationId: conversation._id.toString(),
          customerId: customerId 
        });
      } else {
        console.log("❌ No existing conversation found");
        // Don't emit anything - wait for first message to create conversation
      }
    } catch (err) {
      console.error("❌ Error checking conversation:", err);
      socket.emit("error", { message: "Failed to check conversation" });
    }
  });

  // --- START CONVERSATION ---
  socket.on("startConversation", async ({ customerId, ownerId, firstMessage, firstFile }) => {
    console.log("🆕 Starting conversation with first message:", firstMessage || firstFile);
    
    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(ownerId)) {
      return socket.emit("error", { message: "Invalid user IDs" });
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
          lastMessage: firstMessage || firstFile || "New conversation started",
        });
        console.log(`🆕 Created conversation: ${conversation._id}`);
      } else {
        console.log(`✅ Using existing conversation: ${conversation._id}`);
      }

      // If there's a first message, create it
      if (firstMessage || firstFile) {
        const message = await Message.create({
          conversationId: conversation._id,
          senderId: customerObjectId,
          text: firstMessage || "",
          fileName: firstFile || null,
          createdAt: new Date(),
        });

        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: firstMessage || firstFile || "File",
          updatedAt: new Date(),
        });

        // Send the created message back
        socket.emit("messageSent", {
          _id: message._id.toString(),
          conversationId: conversation._id.toString(),
          senderId: customerId,
          text: message.text,
          fileName: message.fileName,
          createdAt: message.createdAt,
        });
      }

      socket.emit("conversationCreated", { 
        conversationId: conversation._id.toString(),
        customerId: customerId 
      });

      // Notify owner about new conversation/message
      if (onlineUsers[ownerId]) {
        const customer = await User.findById(customerObjectId).select("firstName lastName").lean();
        const customerName = customer ? `${customer.firstName} ${customer.lastName}` : "Unknown Customer";

        io.to(onlineUsers[ownerId].socketId).emit("newConversation", {
          customerId: customerId,
          customerName: customerName,
          conversationId: conversation._id.toString(),
          lastMessage: firstMessage || firstFile || "New conversation",
        });
        console.log(`📢 Notified owner ${ownerId} about new conversation`);
      }
    } catch (err) {
      console.error("❌ Error starting conversation:", err);
      socket.emit("error", { message: "Failed to start conversation" });
    }
  });

  // --- SEND MESSAGE ---
  socket.on("sendMessage", async ({ conversationId, senderId, receiverId, text, fileUrl, fileName }) => {
    console.log("📨 Sending message to conversation:", conversationId);
    
    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(senderId)) {
      return socket.emit("error", { message: "Invalid IDs" });
    }

    try {
      const conversationObjectId = new mongoose.Types.ObjectId(conversationId);
      const senderObjectId = new mongoose.Types.ObjectId(senderId);

      const message = await Message.create({
        conversationId: conversationObjectId,
        senderId: senderObjectId,
        text: text || "",
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        createdAt: new Date(),
      });

      await Conversation.findByIdAndUpdate(conversationObjectId, {
        lastMessage: text || fileName || "File",
        updatedAt: new Date(),
      });

      const messageData = {
        _id: message._id.toString(),
        conversationId: conversationId,
        senderId: senderId,
        text: message.text,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        createdAt: message.createdAt,
      };

      // Emit to receiver
      if (receiverId && onlineUsers[receiverId]) {
        io.to(onlineUsers[receiverId].socketId).emit("receiveMessage", messageData);
        console.log(`✅ Sent message to receiver ${receiverId}`);
      }

      // Echo to sender
      socket.emit("messageSent", messageData);
      console.log(`✅ Confirmed message sent to sender ${senderId}`);
    } catch (err) {
      console.error("❌ Error sending message:", err);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // --- TYPING INDICATOR ---
  socket.on("typing", ({ conversationId, isTyping, userId }) => {
    console.log(`⌨️ Typing: ${isTyping} by ${userId}`);
    
    // Broadcast typing status to other participants in the conversation
    socket.to(conversationId).emit("userTyping", { 
      isTyping, 
      userId 
    });
  });

  // --- JOIN CONVERSATION ROOM ---
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`👥 User joined conversation: ${conversationId}`);
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
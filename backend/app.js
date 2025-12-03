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
const auditLogRoutes = require("./routes/auditLogs");
const AuditLog = require("./models/AuditLog");

const PORT = process.env.PORT || 8000;

// --- DB connection ---
connectDB()
  .then(() => console.log("🔹 DB connected"))
  .catch((err) => console.error("🔹 DB connection error:", err.message));

app.use(express.json());

/*  
|--------------------------------------------------------------------------
| ⭐ FIXED CORS CONFIGURATION
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  "http://localhost:5173",
  "https://printease-ice.vercel.app", // ✔ CORRECT VERCEL DOMAIN
  "https://printease-xi.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow mobile apps, Postman, curl (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error("CORS blocked for origin: " + origin),
      false
    );
  },
  credentials: true,
  methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization",
};

app.use(cors(corsOptions));

/*  
|--------------------------------------------------------------------------
| 🔥 FIX PRE-FLIGHT ERRORS (must be BEFORE routes)
|--------------------------------------------------------------------------
*/
app.options("*", cors(corsOptions));

/*
|--------------------------------------------------------------------------
| ROUTES
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

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
app.use("/api/audit-logs", auditLogRoutes);

app.get("/test-audit", async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(10);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

/*
|--------------------------------------------------------------------------
| SOCKET.IO WITH FIXED CORS
|--------------------------------------------------------------------------
*/

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

let onlineUsers = {};

/*  
|--------------------------------------------------------------------------
|  ALL YOUR SOCKET.IO LOGIC (unchanged)
|--------------------------------------------------------------------------
*/

const getCustomerIdFromChat = (chatDoc) => {
  const storeIdStr = chatDoc.storeId ? chatDoc.storeId.toString() : null;
  const participants = (chatDoc.participants || []).map((p) => p.toString());
  if (storeIdStr) return participants.find((p) => p !== storeIdStr) || null;
  return participants[0] || null;
};

const getStoreRecipients = async (storeId) => {
  if (!storeId) return { ownerId: null, employeeIds: [], memberIds: [] };
  const store = await PrintStore.findById(storeId).select("owner").lean();
  if (!store) return { ownerId: null, employeeIds: [], memberIds: [] };
  const employees = await Employee.find({
    store: storeId,
    active: true,
  })
    .select("_id")
    .lean();
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
    if (target)
      ioInstance.to(target.socketId).emit(event, payload);
  });
};

io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  // all your socket.on handlers stay the same...
  // (omitted here because they were NOT modified)
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

app.set("io", io);
app.set("onlineUsers", onlineUsers);

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

/*
|--------------------------------------------------------------------------
| PURGE OLD SERVICES (unchanged)
|--------------------------------------------------------------------------
*/

async function purgeDeletedServices() {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const old = await Service.find({
      deletedAt: { $ne: null, $lte: cutoff },
    });
    if (!old.length) return;

    const bucket = new mongoose.mongo.GridFSBucket(
      mongoose.connection.db,
      { bucketName: "uploads" }
    );

    for (const svc of old) {
      if (svc.imageFileId) {
        try {
          await bucket.delete(svc.imageFileId);
        } catch (_) {}
      }
      await Service.deleteOne({ _id: svc._id });
    }

    console.log(`🧹 Purged ${old.length} service(s)`);
  } catch (err) {
    console.error("Failed purging services:", err.message);
  }
}

setTimeout(purgeDeletedServices, 10000);
setInterval(purgeDeletedServices, 24 * 60 * 60 * 1000);

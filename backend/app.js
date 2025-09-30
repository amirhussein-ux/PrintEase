require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const printStoreRoutes = require("./routes/printStoreRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const orderRoutes = require("./routes/orderRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const PORT = process.env.PORT || 8000;

console.log("🔹 Starting server...");

// --- Middleware ---
// Parse JSON
app.use(express.json());

// --- CORS setup (with PATCH support) ---
const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));

// --- DB connection ---
connectDB()
  .then(() => console.log("🔹 DB connected"))
  .catch((err) => console.error("🔹 DB connection error:", err.message));

// --- Test endpoint ---
app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

// --- API routes ---
app.use("/api/auth", authRoutes);
app.use("/api/print-store", printStoreRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);

// --- Server setup ---
const server = http.createServer(app);

// --- Socket.IO setup ---
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

// Store online users: userId -> socketId
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);

  // Register user for notifications
  socket.on("register", ({ userId, role }) => {
    onlineUsers[userId] = { socketId: socket.id, role }; // store role too
    console.log(`✅ Registered user ${userId} (${role}) with socket ${socket.id}`);
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
    for (const userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
        console.log(`🗑️ Removed user ${userId} from online list`);
        break;
      }
    }
  });
});

function sendNotification(userId, role, message) {
  const io = app.get("io");
  const onlineUsers = app.get("onlineUsers");

  const user = onlineUsers[userId];
  if (user && user.role === role) {
    io.to(user.socketId).emit("notification", { userId, message });
    console.log(`📣 Sent notification to ${role} ${userId}: ${message}`);
  }
}

// Make io and onlineUsers available in routes
app.set("io", io);
app.set("onlineUsers", onlineUsers);

// --- Keep-alive settings ---
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
server.setTimeout(120000);

// --- Start server ---
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

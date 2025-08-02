require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
connectDB()
  .then(() => console.log('✅ MongoDB connected successfully.'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Adjust if frontend port differs
  credentials: true
}));
app.use(express.json());

// Ensure 'uploads' directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('📁 Created uploads directory at', uploadsDir);
}

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

// Mount routes
app.use('/api/auth', authRoutes);               // ✅ Auth endpoints
app.use('/api/orders', orderRoutes);            // 🛒 Order endpoints
app.use('/api/notifications', notificationRoutes); // 🔔 Notification endpoints

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

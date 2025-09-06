require('dotenv').config();
const express = require('express');
const cors = require('cors');   // ⬅️ add this
const app = express();
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const printStoreRoutes = require('./routes/printStoreRoutes');

const PORT = process.env.PORT || 8000;

console.log("🔹 Starting server...");

// middleware
app.use(express.json());

// ✅ CORS setup
app.use(cors({
    origin: "http://localhost:5173", 
    credentials: true,               
}));

// db connect
connectDB().then(() => {
    console.log("🔹 DB connection attempted");
}).catch(err => {
    console.error("🔹 DB connection error:", err.message);
});

app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api/print-store", printStoreRoutes);

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});

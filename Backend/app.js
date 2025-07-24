require('dotenv').config();
const express = require('express');
const app = express();
const connectDB = require('./config/db');
const fs = require('fs');
const path = require('path');

// Enable CORS for frontend requests
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000', // Adjust to your frontend port if different
  credentials: true
}));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('Created uploads directory at', uploadsDir);
}

// Import order routes
const orderRoutes = require('./routes/orderRoutes');

const PORT = process.env.PORT || 8000;
connectDB()
    .then(() => console.log('MongoDB connected successfully.'))
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

app.use(express.json()); // Middleware to parse JSON

app.get("/", (req, res) => {
    res.json({message : "Server is running"});
});

// Mount order routes
app.use('/api/orders', orderRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
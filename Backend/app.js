require('dotenv').config();
const express = require('express');
const app = express();
const connectDB = require('./config/db');

const PORT = process.env.PORT;
connectDB();

app.get("/", (req, res) => {
    res.json({message : "Server is running"});
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

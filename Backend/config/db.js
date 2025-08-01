const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (error) {
        // MongoDB connection failed
        process.exit(1);  
    }
}

module.exports = connectDB;
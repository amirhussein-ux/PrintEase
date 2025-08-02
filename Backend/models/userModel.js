const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: { type: String, required: true },
  contactNumber: String,
  address: String,
  role: {
    type: String,
    enum: ['admin', 'customer'],
    default: 'customer'
  }
});

module.exports = mongoose.model('User', userSchema);

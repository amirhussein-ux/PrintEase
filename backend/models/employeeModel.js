const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'PrintStore', required: true },
    fullName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    phone: { type: String, trim: true },
    active: { type: Boolean, default: true },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String },
  },
  { timestamps: true }
);

employeeSchema.index({ store: 1, fullName: 1 }, { unique: true });
employeeSchema.index({ store: 1, email: 1 }, { unique: true });

employeeSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('Employee', employeeSchema);

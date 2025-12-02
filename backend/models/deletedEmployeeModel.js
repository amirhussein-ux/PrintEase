const mongoose = require('mongoose');

const deletedEmployeeSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'PrintStore', required: true },
    originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fullName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: Date.now },
    passwordHash: { type: String, select: false },
    avatar: { type: String },
  },
  { timestamps: false }
);

deletedEmployeeSchema.index({ store: 1, originalId: 1 }, { unique: true });

module.exports = mongoose.model('DeletedEmployee', deletedEmployeeSchema);

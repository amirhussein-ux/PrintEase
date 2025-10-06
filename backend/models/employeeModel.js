const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'PrintStore', required: true },
    fullName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

employeeSchema.index({ store: 1, fullName: 1 }, { unique: true });

module.exports = mongoose.model('Employee', employeeSchema);

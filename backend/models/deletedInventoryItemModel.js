const mongoose = require('mongoose');

const deletedInventoryItemSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'PrintStore', required: true },
    originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    amount: { type: Number, default: 0, min: 0 },
    minAmount: { type: Number, default: 0, min: 0 },
    entryPrice: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'JPY', 'PHP'], default: 'PHP' },
    deletedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

deletedInventoryItemSchema.index({ store: 1, originalId: 1 }, { unique: true });

module.exports = mongoose.model('DeletedInventoryItem', deletedInventoryItemSchema);

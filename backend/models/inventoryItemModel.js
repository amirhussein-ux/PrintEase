const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'PrintStore', required: true },
    name: { type: String, required: true, trim: true },
  category: { type: String, trim: true },
    amount: { type: Number, default: 0, min: 0 },
    minAmount: { type: Number, default: 0, min: 0 },
    entryPrice: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'JPY', 'PHP'], default: 'PHP' },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ store: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);

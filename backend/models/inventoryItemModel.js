const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'PrintStore', required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    
    // Current stock
    amount: { type: Number, default: 0, min: 0 },
    minAmount: { type: Number, default: 0, min: 0 },
    
    // NEW FIELDS:
    initialStock: { type: Number, default: 0, min: 0 }, // First stock added
    maxStock: { type: Number, default: 0, min: 0 }, // Highest ever reached
    unit: { type: String, default: 'units' }, // pieces, kg, rolls, etc.
    
    // Price
    entryPrice: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'JPY', 'PHP'], default: 'PHP' },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ store: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
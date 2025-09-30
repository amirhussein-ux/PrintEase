const mongoose = require('mongoose');

const variantOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priceDelta: { type: Number, default: 0 },
  },
  { _id: false }
);

const serviceVariantSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    options: { type: [variantOptionSchema], default: [] },
  },
  { _id: false }
);

const serviceSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'PrintStore', required: true },
    name: { type: String, required: true },
    description: { type: String },
    basePrice: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['per page', 'per sq ft', 'per item'], required: true },
  currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'JPY', 'PHP'], default: 'PHP' },
    active: { type: Boolean, default: true },
    variants: { type: [serviceVariantSchema], default: [] },
  // optional image stored in GridFS
  imageFileId: { type: mongoose.Schema.Types.ObjectId },
  imageMime: { type: String },
  // inventory requirements
  requiredInventory: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  inventoryQuantityPerUnit: { type: Number, default: 1, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);

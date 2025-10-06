const mongoose = require('mongoose');

const selectedOptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    optionIndex: { type: Number },
    optionName: { type: String },
    priceDelta: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    serviceName: { type: String },
    unit: { type: String },
    currency: { type: String, default: 'PHP' },
    quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 }, // server-side
    selectedOptions: { type: [selectedOptionSchema], default: [] },
    totalPrice: { type: Number, required: true, min: 0 }, // unitPrice * quantity
  // snapshot of inventory requirement at time of ordering (if any)
  requiredInventory: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  inventoryQuantityPerUnit: { type: Number, min: 0 },
  },
  { _id: false }
);

const fileRefSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    filename: { type: String },
    mimeType: { type: String },
    size: { type: Number },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional for guest
    guestId: { type: String }, // for guest orders (non-persistent user)
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'PrintStore', required: true },
    items: { type: [orderItemSchema], default: [] },
    notes: { type: String },
    files: { type: [fileRefSchema], default: [] },
    status: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'completed', 'cancelled'],
      default: 'pending',
    },
    subtotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PHP' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  // QR pickup
  pickupToken: { type: String },
  pickupTokenExpires: { type: Date },
  pickupVerifiedAt: { type: Date },
  // ensure inventory only deducted once
  inventoryDeducted: { type: Boolean, default: false },
  // time estimates for each stage
  timeEstimates: {
    processing: { type: Number, default: 2 }, // hours
    ready: { type: Number, default: 4 }, // hours
    completed: { type: Number, default: 6 }, // hours
  },
  // actual timestamps for each stage
  stageTimestamps: {
    pending: { type: Date, default: Date.now },
    processing: { type: Date },
    ready: { type: Date },
    completed: { type: Date },
  },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

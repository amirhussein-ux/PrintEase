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
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

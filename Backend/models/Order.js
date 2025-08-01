const mongoose = require('mongoose');



const OrderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true }, // Custom order number
    customerName: { type: String, required: true },
    customerEmail: { type: String }, // Optional for guests
    guestToken: { type: String }, // For guest session tracking
    productType: { type: String, required: true },
    quantity: { type: Number, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});



OrderSchema.index({ customerEmail: 1 });
OrderSchema.index({ guestToken: 1 });
OrderSchema.index({ productType: 1 });
module.exports = mongoose.model('Order', OrderSchema);
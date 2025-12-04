const mongoose = require("mongoose");

const embeddedMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String },
  fileUrl: { type: String },
  fileName: { type: String },
  payloadType: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

const customerChatSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, required: true }], // [customerId, storeId]
    participantsKey: { type: String, index: true, unique: true }, // sorted IDs for uniqueness
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "PrintStore" }, // allow employees to query by store
    messages: [embeddedMessageSchema],
    lastMessage: { type: String },
  },
  { timestamps: true }
);

customerChatSchema.pre("validate", function (next) {
  if (this.participants && this.participants.length) {
    const sorted = this.participants.map(id => id.toString()).sort();
    this.participantsKey = sorted.join("-");
  }
  next();
});

customerChatSchema.methods.appendMessage = async function (messageData) {
  const nextMessage = {
    ...messageData,
    payload: messageData.payload ?? undefined,
    payloadType: messageData.payloadType ?? undefined,
  };
  this.messages.push(nextMessage);
  if (messageData.payloadType === 'return_request' && !messageData.text) {
    this.lastMessage = 'Return / Refund request shared';
  } else {
    this.lastMessage = messageData.text || messageData.fileName || 'File';
  }
  this.updatedAt = new Date();
  await this.save();
  return this.messages[this.messages.length - 1];
};

const CustomerChat = mongoose.model("CustomerChat", customerChatSchema);
module.exports = CustomerChat;

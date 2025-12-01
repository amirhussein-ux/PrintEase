const mongoose = require("mongoose");

const embeddedMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // owner or employee
  text: { type: String },
  fileUrl: { type: String },
  fileName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const staffChatSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }], // owner + employee OR employee + employee
    participantsKey: { type: String, index: true, unique: true },
    messages: [embeddedMessageSchema],
    lastMessage: { type: String },
  },
  { timestamps: true }
);

staffChatSchema.pre("validate", function (next) {
  if (this.participants && this.participants.length) {
    const sorted = this.participants.map(id => id.toString()).sort();
    this.participantsKey = sorted.join("-");
  }
  next();
});

staffChatSchema.methods.appendMessage = async function (messageData) {
  this.messages.push(messageData);
  this.lastMessage = messageData.text || messageData.fileName || "File";
  this.updatedAt = new Date();
  await this.save();
  return this.messages[this.messages.length - 1];
};

const StaffChat = mongoose.model("StaffChat", staffChatSchema);
module.exports = StaffChat;

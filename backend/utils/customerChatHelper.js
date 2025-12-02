const mongoose = require('mongoose');
const CustomerChat = require('../models/customerChatModel');
const PrintStore = require('../models/printStoreModel');

const buildParticipantsKey = (ids) => ids.map((id) => id.toString()).sort().join('-');

const toObjectId = (value) => (
  value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value)
);

const findOrMigrateCustomerChat = async ({ customerId, storeId }) => {
  if (!customerId || !storeId) return null;
  const customerObjectId = toObjectId(customerId);
  const storeObjectId = toObjectId(storeId);

  let chat = await CustomerChat.findOne({ participantsKey: buildParticipantsKey([customerObjectId, storeObjectId]) });
  if (chat) return chat;

  const store = await PrintStore.findById(storeObjectId).select('owner').lean();
  if (!store?.owner) return null;
  const legacyKey = buildParticipantsKey([customerObjectId, store.owner]);
  chat = await CustomerChat.findOne({ participantsKey: legacyKey });
  if (!chat) return null;

  chat.participants = [customerObjectId, storeObjectId];
  chat.storeId = storeObjectId;
  await chat.save();
  return chat;
};

module.exports = {
  buildParticipantsKey,
  findOrMigrateCustomerChat,
};

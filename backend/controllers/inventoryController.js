const InventoryItem = require('../models/inventoryItemModel');
const PrintStore = require('../models/printStoreModel');

async function getOwnerStore(userId) {
  return PrintStore.findOne({ owner: userId });
}

exports.listMyInventory = async (req, res) => {
  try {
    const store = await getOwnerStore(req.user.id);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const items = await InventoryItem.find({ store: store._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createItem = async (req, res) => {
  try {
    const store = await getOwnerStore(req.user.id);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { name, amount = 0, minAmount = 0, entryPrice = 0, price = 0, currency = 'PHP' } = req.body;
    const doc = await InventoryItem.create({
      store: store._id,
      name: (name || '').trim(),
      amount: Number(amount) || 0,
      minAmount: Number(minAmount) || 0,
      entryPrice: Number(entryPrice) || 0,
      price: Number(price) || 0,
      currency,
    });
    res.status(201).json(doc);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Item with this name already exists' });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const store = await getOwnerStore(req.user.id);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { id } = req.params;
    const item = await InventoryItem.findOne({ _id: id, store: store._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const { name, amount, minAmount, entryPrice, price, currency } = req.body;
    if (name !== undefined) item.name = String(name).trim();
    if (amount !== undefined) item.amount = Number(amount) || 0;
    if (minAmount !== undefined) item.minAmount = Number(minAmount) || 0;
    if (entryPrice !== undefined) item.entryPrice = Number(entryPrice) || 0;
    if (price !== undefined) item.price = Number(price) || 0;
    if (currency !== undefined) item.currency = currency;

    await item.save();
    res.json(item);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Item with this name already exists' });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const store = await getOwnerStore(req.user.id);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { id } = req.params;
    const deleted = await InventoryItem.findOneAndDelete({ _id: id, store: store._id });
    if (!deleted) return res.status(404).json({ message: 'Item not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const list = await InventoryItem.find({ store: storeId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

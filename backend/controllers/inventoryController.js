const InventoryItem = require('../models/inventoryItemModel');
const DeletedInventoryItem = require('../models/deletedInventoryItemModel'); 
const { getManagedStore, AccessError } = require('../utils/storeAccess');

const STORE_STAFF_ROLES = ['Operations Manager', 'Front Desk', 'Inventory & Supplies', 'Printer Operator'];

// Helper for error handling
const handleError = (res, err) => {
  if (err instanceof AccessError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  res.status(500).json({ message: err.message });
};

exports.listMyInventory = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const items = await InventoryItem.find({ store: store._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    handleError(res, err);
  }
};

exports.createItem = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const { name, amount = 0, minAmount = 0, entryPrice = 0, price = 0, currency = 'PHP', category } = req.body;
    
    const doc = await InventoryItem.create({
      store: store._id,
      name: (name || '').trim(),
      amount: Number(amount) || 0,
      minAmount: Number(minAmount) || 0,
      entryPrice: Number(entryPrice) || 0,
      price: Number(price) || 0,
      currency,
      category: category ? String(category).trim() : undefined,
    });
    res.status(201).json(doc);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Item with this name already exists' });
    }
    handleError(res, err);
  }
};

exports.updateItem = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const { id } = req.params;
    const item = await InventoryItem.findOne({ _id: id, store: store._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const { name, amount, minAmount, entryPrice, price, currency, category } = req.body;
    
    if (name !== undefined) item.name = String(name).trim();
    if (amount !== undefined) item.amount = Number(amount) || 0;
    if (minAmount !== undefined) item.minAmount = Number(minAmount) || 0;
    if (entryPrice !== undefined) item.entryPrice = Number(entryPrice) || 0;
    if (price !== undefined) item.price = Number(price) || 0;
    if (currency !== undefined) item.currency = currency;
    if (category !== undefined) item.category = String(category).trim() || undefined;

    await item.save();
    res.json(item);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Item with this name already exists' });
    }
    handleError(res, err);
  }
};

// --- ARCHIVE ITEM (Renamed from deleteItem) ---
exports.archiveItem = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const { id } = req.params;
    const item = await InventoryItem.findOne({ _id: id, store: store._id });
    
    if (!item) return res.status(404).json({ message: 'Item not found' });

    // 1. Create Archive Payload
    const archivedPayload = {
      store: store._id,
      originalId: item._id, // Save old ID
      name: item.name,
      category: item.category,
      amount: item.amount,
      minAmount: item.minAmount,
      entryPrice: item.entryPrice,
      price: item.price,
      currency: item.currency,
      deletedAt: new Date(),
    };

    // 2. Save to "DeletedInventoryItem" collection
    const archived = await DeletedInventoryItem.findOneAndUpdate(
      { store: store._id, originalId: item._id },
      archivedPayload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Remove from Active collection
    await item.deleteOne();

    res.json({ success: true, message: 'Item archived successfully', archived });
  } catch (err) {
    handleError(res, err);
  }
};

exports.listArchivedItems = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const items = await DeletedInventoryItem.find({ store: store._id }).sort({ deletedAt: -1 });
    res.json(items);
  } catch (err) {
    handleError(res, err);
  }
};

exports.restoreArchivedItem = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const { deletedId } = req.params;
    
    const archived = await DeletedInventoryItem.findOne({ _id: deletedId, store: store._id });
    if (!archived) return res.status(404).json({ message: 'Archived inventory item not found' });

    const payload = {
      _id: archived.originalId, // Attempt to restore with original ID
      store: store._id,
      name: archived.name,
      category: archived.category,
      amount: archived.amount,
      minAmount: archived.minAmount,
      entryPrice: archived.entryPrice,
      price: archived.price,
      currency: archived.currency,
    };

    let restored;
    try {
      restored = await InventoryItem.create(payload);
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ message: `Cannot restore: An active item with the name "${archived.name}" already exists.` });
      }
      throw err;
    }

    await archived.deleteOne();

    res.json(restored);
  } catch (err) {
    handleError(res, err);
  }
};

exports.purgeArchivedItem = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const { deletedId } = req.params;
    
    const archived = await DeletedInventoryItem.findOneAndDelete({ _id: deletedId, store: store._id });
    
    if (!archived) return res.status(404).json({ message: 'Archived inventory item not found' });
    res.json({ success: true, message: 'Item permanently deleted' });
  } catch (err) {
    handleError(res, err);
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
 const PrintStore = require('../models/printStoreModel');
const User = require('../models/userModel');

// Create print store
exports.createPrintStore = async (req, res) => {
  try {
  const { name, tin, birCertUrl, mobile, address } = req.body;
    const userId = req.user.id;

  // only admin
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can create a print store' });
    }

  // check existing store
    const existing = await PrintStore.findOne({ owner: userId });
    if (existing) {
      return res.status(400).json({ message: 'Admin already has a print store' });
    }

  // location
    let addressPayload = address || {};
    if (addressPayload.location) {
      const lat = parseFloat(addressPayload.location.lat);
      const lng = parseFloat(addressPayload.location.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        addressPayload.location = { lat, lng };
      } else {
        delete addressPayload.location;
      }
    }

    const store = await PrintStore.create({
      name,
      tin,
      birCertUrl,
      mobile,
      address: addressPayload,
      owner: userId,
    });

    // create shop collection (sanitized name)
    const mongoose = require('mongoose');
    const collectionName = name.toLowerCase().replace(/\s+/g, '_');
    // dummy schema
    const shopSchema = new mongoose.Schema({ any: {} }, { strict: false });
    try {
      mongoose.model(collectionName);
    } catch (e) {
      mongoose.model(collectionName, shopSchema);
    }
    // ensure collection exists
    await mongoose.connection.createCollection(collectionName);

    res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get admin's store
exports.getMyPrintStore = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await PrintStore.findOne({ owner: userId });
    if (!store) return res.status(404).json({ message: 'No print store found' });
    res.json(store);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all stores (public)
exports.getAllPrintStores = async (req, res) => {
  try {
  // select basic fields
  const stores = await PrintStore.find({}, 'name mobile address tin createdAt');
    res.json(stores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dev-only: create test store (enabled via env)
exports.createPrintStoreTest = async (req, res) => {
  try {
    if (process.env.ALLOW_TEST_STORE_CREATION !== 'true') {
      return res.status(403).json({ message: 'Test store creation not allowed' });
    }

    const { name, tin, birCertUrl, mobile, owner } = req.body;
    const ownerId = owner || ('test_admin_' + Date.now());

  // owner id fallback
    const store = await PrintStore.create({
      name: name || 'Test Store',
      tin: tin || '000-000-000',
      birCertUrl: birCertUrl || '',
      mobile: mobile || '09000000000',
      owner: ownerId,
    });

    // create shop collection (test)
    const mongoose = require('mongoose');
    const collectionName = (name || 'test_store').toLowerCase().replace(/\s+/g, '_');
    const shopSchema = new mongoose.Schema({ any: {} }, { strict: false });
    try {
      mongoose.model(collectionName);
    } catch (e) {
      mongoose.model(collectionName, shopSchema);
    }
    await mongoose.connection.createCollection(collectionName);
+
    res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

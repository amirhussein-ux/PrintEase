 const PrintStore = require('../models/printStoreModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { getManagedStore, AccessError } = require('../utils/storeAccess');
const EMPLOYEE_ROLES = ['Operations Manager', 'Front Desk', 'Inventory & Supplies', 'Printer Operator'];

// Create print store
exports.createPrintStore = async (req, res) => {
  try {
  const { name, mobile, address } = req.body;
    // If address was sent as a JSON string (multipart/form-data), parse it
    let parsedAddress = address;
    if (typeof address === 'string') {
      try {
        parsedAddress = JSON.parse(address);
      } catch (e) {
        parsedAddress = address;
      }
    }
    const userId = req.user.id;

  // only owner
    const user = await User.findById(userId);
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ message: 'Only owner can create a print store' });
    }

  // check existing store
    const existing = await PrintStore.findOne({ owner: userId });
    if (existing) {
      return res.status(400).json({ message: 'Owner already has a print store' });
    }

  // location
  let addressPayload = parsedAddress || {};
    if (addressPayload.location) {
      const lat = parseFloat(addressPayload.location.lat);
      const lng = parseFloat(addressPayload.location.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        addressPayload.location = { lat, lng };
      } else {
        delete addressPayload.location;
      }
    }

    const storeData = {
      name,
      mobile,
      address: addressPayload,
      owner: userId,
    };

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

    // if a logo was uploaded
    if (req.files && req.files.logo && req.files.logo[0] && req.files.logo[0].buffer) {
      const logoFile = req.files.logo[0];
      const uploadStream = bucket.openUploadStream(logoFile.originalname, {
        contentType: logoFile.mimetype,
      });
      uploadStream.end(logoFile.buffer);
      const fileId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });
      storeData.logoFileId = fileId;
      storeData.logoMime = logoFile.mimetype;
    }

    // if a business permit was uploaded
    if (req.files && req.files.businessPermit && req.files.businessPermit[0] && req.files.businessPermit[0].buffer) {
      const permitFile = req.files.businessPermit[0];
      const uploadStream = bucket.openUploadStream(permitFile.originalname, {
        contentType: permitFile.mimetype,
      });
      uploadStream.end(permitFile.buffer);
      const fileId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });
      storeData.businessPermitFileId = fileId;
      storeData.businessPermitMime = permitFile.mimetype;
      storeData.businessPermitFilename = permitFile.originalname;
    }

  const store = await PrintStore.create(storeData);

  res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get owner's store
exports.getMyPrintStore = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: EMPLOYEE_ROLES });
    res.json(store);
  } catch (error) {
    if (error instanceof AccessError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

// Update owner's store
exports.updateMyPrintStore = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await PrintStore.findOne({ owner: userId });
    if (!store) return res.status(404).json({ message: 'No print store found' });

    let { name, mobile, address, removeLogo } = req.body || {};
    // parse address if string (multipart)
    if (typeof address === 'string') {
      try { address = JSON.parse(address); } catch { /* keep raw */ }
    }
    if (address && typeof address === 'object') {
      if (address.location) {
        const lat = parseFloat(address.location.lat);
        const lng = parseFloat(address.location.lng);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          address.location = { lat, lng };
        } else {
          delete address.location;
        }
      }
    }

    // apply updates
    if (typeof name === 'string') store.name = name;
    if (typeof mobile === 'string') store.mobile = mobile;
    if (address && typeof address === 'object') store.address = { ...store.address?.toObject?.(), ...address };

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const removeLogoFlag = typeof removeLogo === 'string' ? (removeLogo === 'true' || removeLogo === '1') : !!removeLogo;

    // remove logo
    if (removeLogoFlag && store.logoFileId) {
      try { await bucket.delete(store.logoFileId); } catch (_) {}
      store.logoFileId = undefined;
      store.logoMime = undefined;
    }
    // replace logo if new file present
    if (req.files && req.files.logo && req.files.logo[0] && req.files.logo[0].buffer) {
      if (store.logoFileId) {
        try { await bucket.delete(store.logoFileId); } catch (_) {}
      }
      const logoFile = req.files.logo[0];
      const uploadStream = bucket.openUploadStream(logoFile.originalname, { contentType: logoFile.mimetype });
      uploadStream.end(logoFile.buffer);
      const fileId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });
      store.logoFileId = fileId;
      store.logoMime = logoFile.mimetype;
    }

    // handle business permit
    if (req.files && req.files.businessPermit && req.files.businessPermit[0] && req.files.businessPermit[0].buffer) {
      if (store.businessPermitFileId) {
        try { await bucket.delete(store.businessPermitFileId); } catch (_) {}
      }
      const permitFile = req.files.businessPermit[0];
      const uploadStream = bucket.openUploadStream(permitFile.originalname, { contentType: permitFile.mimetype });
      uploadStream.end(permitFile.buffer);
      const fileId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });
      store.businessPermitFileId = fileId;
      store.businessPermitMime = permitFile.mimetype;
      store.businessPermitFilename = permitFile.originalname;
    }

    await store.save();
    res.json(store);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all stores (public)
exports.getAllPrintStores = async (req, res) => {
  try {
  // select basic fields
  const stores = await PrintStore.find({}, 'name mobile address createdAt logoFileId');
    res.json(stores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Stream logo from GridFS by id
exports.getLogoById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).send('Invalid id');
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const _id = new ObjectId(id);
    const files = await bucket.find({ _id }).toArray();
    if (!files || files.length === 0) return res.status(404).send('Not found');
    const file = files[0];
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    const download = bucket.openDownloadStream(_id);
    download.pipe(res);
    download.on('error', () => res.status(500).end());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Dev-only: create test store (enabled via env)
exports.createPrintStoreTest = async (req, res) => {
  try {
    if (process.env.ALLOW_TEST_STORE_CREATION !== 'true') {
      return res.status(403).json({ message: 'Test store creation not allowed' });
    }

    const { name, mobile, owner } = req.body;
    const ownerId = owner || ('test_admin_' + Date.now());

  // owner id fallback
    const store = await PrintStore.create({
      name: name || 'Test Store',
      mobile: mobile || '09000000000',
      owner: ownerId,
    });

    res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

 const PrintStore = require('../models/printStoreModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { getManagedStore, AccessError } = require('../utils/storeAccess');
const EMPLOYEE_ROLES = ['Operations Manager', 'Front Desk', 'Inventory & Supplies', 'Printer Operator'];

// Create print store
exports.createPrintStore = async (req, res) => {
  try {
  const { name, tin, birCertUrl, mobile, address } = req.body;
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
      tin,
      birCertUrl,
      mobile,
      address: addressPayload,
      owner: userId,
    };

    // if a file was uploaded in memory via multer, store it to GridFS
    if (req.file && req.file.buffer) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      uploadStream.end(req.file.buffer);
      // wait for finish and capture the stream id (GridFS file id)
      const fileId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });
      // attach GridFS file id and mime to store
      storeData.logoFileId = fileId;
      storeData.logoMime = req.file.mimetype;
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

    let { name, tin, birCertUrl, mobile, address, removeLogo } = req.body || {};
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
    if (typeof tin === 'string') store.tin = tin;
    if (typeof birCertUrl === 'string') store.birCertUrl = birCertUrl;
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
    if (req.file && req.file.buffer) {
      if (store.logoFileId) {
        try { await bucket.delete(store.logoFileId); } catch (_) {}
      }
      const uploadStream = bucket.openUploadStream(req.file.originalname, { contentType: req.file.mimetype });
      uploadStream.end(req.file.buffer);
      const fileId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });
      store.logoFileId = fileId;
      store.logoMime = req.file.mimetype;
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
  const stores = await PrintStore.find({}, 'name mobile address tin createdAt logoFileId');
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

    res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

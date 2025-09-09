const Service = require('../models/serviceModel');
const PrintStore = require('../models/printStoreModel');
const mongoose = require('mongoose');

// Helper: get store for current owner
async function getOwnerStore(userId) {
  const store = await PrintStore.findOne({ owner: userId });
  return store;
}

// Create service for owner’s store
exports.createService = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await getOwnerStore(userId);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });

    let { name, description, basePrice, unit, active = true, variants = [] } = req.body;
    // type coercion for multipart fields
    const basePriceNum = typeof basePrice === 'string' ? parseFloat(basePrice) : basePrice;
    const activeBool = typeof active === 'string' ? active === 'true' || active === '1' : !!active;
    let variantsArr = variants;
    if (typeof variants === 'string') {
      try { variantsArr = JSON.parse(variants); } catch { variantsArr = []; }
    }
    const doc = {
      store: store._id,
      name,
      description,
      basePrice: Number.isFinite(basePriceNum) ? basePriceNum : 0,
      unit,
      active: activeBool,
      variants: Array.isArray(variantsArr) ? variantsArr : [],
    };
    // image file
    if (req.file && req.file.buffer) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      uploadStream.end(req.file.buffer);
      const fileId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });
      doc.imageFileId = fileId;
      doc.imageMime = req.file.mimetype;
    }
    const svc = await Service.create(doc);
    res.status(201).json(svc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update service (owner only, must belong to owner’s store)
exports.updateService = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await getOwnerStore(userId);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { id } = req.params;
    const svc = await Service.findOne({ _id: id, store: store._id });
    if (!svc) return res.status(404).json({ message: 'Service not found' });

  let updates = req.body || {};
    // coerce fields
    if (updates.basePrice !== undefined) {
      const n = typeof updates.basePrice === 'string' ? parseFloat(updates.basePrice) : updates.basePrice;
      updates.basePrice = Number.isFinite(n) ? n : svc.basePrice;
    }
    if (updates.active !== undefined) {
      updates.active = typeof updates.active === 'string' ? (updates.active === 'true' || updates.active === '1') : !!updates.active;
    }
    if (updates.variants !== undefined) {
      if (typeof updates.variants === 'string') {
        try { updates.variants = JSON.parse(updates.variants); } catch { updates.variants = svc.variants; }
      }
      if (!Array.isArray(updates.variants)) updates.variants = svc.variants;
    }
    Object.assign(svc, updates);
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    // handle remove image flag
    const removeImageFlag = typeof updates.removeImage === 'string' ? (updates.removeImage === 'true' || updates.removeImage === '1') : !!updates.removeImage;
    if (removeImageFlag && svc.imageFileId) {
      try {
        await bucket.delete(svc.imageFileId);
      } catch (_) { /* ignore if already missing */ }
      svc.imageFileId = undefined;
      svc.imageMime = undefined;
    }
    // replace image if new file provided; delete old if exists
    if (req.file && req.file.buffer) {
      if (svc.imageFileId) {
        try { await bucket.delete(svc.imageFileId); } catch (_) {}
      }
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      uploadStream.end(req.file.buffer);
      const fileId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });
      svc.imageFileId = fileId;
      svc.imageMime = req.file.mimetype;
    }
    await svc.save();
    res.json(svc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete service (owner only)
exports.deleteService = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await getOwnerStore(userId);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { id } = req.params;
    const svc = await Service.findOneAndDelete({ _id: id, store: store._id });
    if (!svc) return res.status(404).json({ message: 'Service not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List services for current owner
exports.listMyServices = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await getOwnerStore(userId);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const list = await Service.find({ store: store._id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Public: list by store id
exports.listByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const list = await Service.find({ store: storeId, active: true }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Stream service image by id
exports.getServiceImage = async (req, res) => {
  try {
    const { id } = req.params;
    const svc = await Service.findById(id);
    if (!svc || !svc.imageFileId) return res.status(404).send('No image');
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    res.set('Content-Type', svc.imageMime || 'application/octet-stream');
    const download = bucket.openDownloadStream(svc.imageFileId);
    download.pipe(res);
    download.on('error', () => res.status(500).end());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

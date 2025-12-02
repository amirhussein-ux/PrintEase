const mongoose = require('mongoose');

const printStoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tin: { type: String, required: true },
  birCertUrl: { type: String },
  // address
  address: {
    addressLine: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    postal: { type: String },
    // location (lat/lng)
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  mobile: { type: String, required: true },
  // reference to logo stored in GridFS
  logoFileId: { type: mongoose.Schema.Types.ObjectId },
  logoMime: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('PrintStore', printStoreSchema);

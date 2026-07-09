const mongoose = require('mongoose');

const adminDataSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: 'site',
    },
    rooms: { type: Array, default: [] },
    gallery: { type: Array, default: [] },
    notifications: { type: Array, default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model('AdminData', adminDataSchema, 'adminData');

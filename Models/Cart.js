// models/UserDeal.js
const mongoose = require('mongoose');

const UserDealSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: false,
    index: true
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },

  dealPrice: {
    type: Number,
    required: false,
    default: 0
  },

  originalPrice: {
    type: Number,
    required: false,
    default: 0
  },

  discount: {
    type: Number,
    required: false,
    default: 0
  },

  quantity: {
    type: Number,
    default: 1,
    min: 1
  },

  status: {
    type: String,
    enum: ['viewed', 'claimed', 'purchased', 'expired'],
    default: 'claimed'
  },

  claimedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// make unique index sparse so documents missing dealId/productId won't conflict
UserDealSchema.index({ userId: 1, dealId: 1, productId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('UserDeal', UserDealSchema);

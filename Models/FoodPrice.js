const mongoose = require('mongoose');

const FoodPriceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    name: { type: String, required: true },
    sku: { type: String, index: true },
    unit: { type: String, default: 'unit' },
    basePrice: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },

    // tax and discounts
    taxRate: { type: Number, default: 0 }, // percent (e.g., 7.5)
    discount: {
      type: {
        type: String,
        enum: ['percent', 'fixed', 'none'],
        default: 'none',
      },
      value: { type: Number, default: 0 },
    },

    // seasonal or temporary adjustments
    seasonal: {
      percent: { type: Number, default: 0 },
      startsAt: Date,
      endsAt: Date,
    },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FoodPrice', FoodPriceSchema);

const HistorySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
});

const FoodItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        required: true,
        trim: true
    },
    oldPrice: {
        type: Number,
        required: true
    },
    newPrice: {
        type: Number,
        required: true
    },
    change: {
        type: String,
        enum: ['UP', 'DOWN', 'STABLE'],
        required: true
    },
    volatility: {
        type: String,
        enum: ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    history: {
        type: [HistorySchema],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('FoodItem', FoodItemSchema);

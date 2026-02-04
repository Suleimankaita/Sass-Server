// // const mongoose = require('mongoose');

// // const FoodPriceSchema = new mongoose.Schema(
// //   {
// //     companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
// //     name: { type: String, required: true },
// //     sku: { type: String, index: true },
// //     unit: { type: String, default: 'unit' },
// //     basePrice: { type: Number, required: true },
// //     currency: { type: String, default: 'NGN' },

// //     // tax and discounts
// //     taxRate: { type: Number, default: 0 }, // percent (e.g., 7.5)
// //     discount: {
// //       type: {
// //         type: String,
// //         enum: ['percent', 'fixed', 'none'],
// //         default: 'none',
// //       },
// //       value: { type: Number, default: 0 },
// //     },

// //     // seasonal or temporary adjustments
// //     seasonal: {
// //       percent: { type: Number, default: 0 },
// //       startsAt: Date,
// //       endsAt: Date,
// //     },

// //     active: { type: Boolean, default: true },
// //   },
// //   { timestamps: true }
// // );

// // module.exports = mongoose.model('FoodPrice', FoodPriceSchema);

// // const HistorySchema = new mongoose.Schema({
// //     date: {
// //         type: Date,
// //         required: true
// //     },
// //     price: {
// //         type: Number,
// //         required: true
// //     }
// // });

// // const FoodItemSchema = new mongoose.Schema({
// //     name: {
// //         type: String,
// //         // required: true,
// //         trim: true
// //     },
// //     category: {
// //         type: String,
// //         // required: true,
// //         trim: true
// //     },
// //     imageUrl: {
// //         type: String,
// //         // required: true,
// //         trim: true
// //     },
// //     oldPrice: {
// //         type: Number,
// //         // required: true
// //     },
// //     newPrice: {
// //         type: Number,
// //         // required: true
// //     },
// //     change: {
// //         type: String,
// //         enum: ['UP', 'DOWN', 'STABLE'],
// //         // required: true
// //     },
// //     volatility: {
// //         type: String,
// //         enum: ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
// //         // required: true
// //     },
// //     description: {
// //         type: String,
// //         // required: true
// //     },
// //     history: {
// //         type: [HistorySchema],
// //         default: []
// //     }
// // }, { timestamps: true });

// // module.exports = mongoose.model('FoodItem', FoodItemSchema);

// const mongoose = require('mongoose');

// const FoodPriceSchema = new mongoose.Schema(
//   {
//     companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
//     name: { type: String, required: true },
//     sku: { type: String, index: true },
//     image: { type: String }, // Added to store the uploaded image path
//     unit: { type: String, default: 'unit' },
//     basePrice: { type: Number, required: true },
//     currency: { type: String, default: 'NGN' },
//     taxRate: { type: Number, default: 0 },
//     discount: {
//       type: { type: String, enum: ['percent', 'fixed', 'none'], default: 'none' },
//       value: { type: Number, default: 0 },
//     },
//     seasonal: {
//       percent: { type: Number, default: 0 },
//       startsAt: Date,
//       endsAt: Date,
//     },
//     active: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model('FoodPrice', FoodPriceSchema);

const mongoose = require('mongoose');

const FoodPriceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    required: true, 
    // enum: ['Grains', 'Oils', 'Produce', 'Protein', 'Tubers', 'Dairy', 'Condiments', 'Baked Goods'] 
  },
  imageUrl: { type: String },
  currentPrice: { type: Number, required: true },
  previousPrice: { type: Number, default: 0 },
  
  // Computed by Backend Logic
  change: { type: String, enum: ['UP', 'DOWN', 'STABLE'], default: 'STABLE' },
  volatility: { 
    type: String, 
    enum: ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'], 
    default: 'MEDIUM' 
  },
  
  description: { type: String },
  active: { type: Boolean, default: true }, // Add this line
  // For the Chart.js Sparklines
  history: [{
    date: { type: Date, default: Date.now },
    price: { type: Number, required: true }
  }]
}, { timestamps: true });

// Auto-calculate "Change" direction before saving
FoodPriceSchema.pre('save', function(next) {
  if (this.isModified('currentPrice')) {
    this.change = this.currentPrice > this.previousPrice ? 'UP' : 
                  this.currentPrice < this.previousPrice ? 'DOWN' : 'STABLE';
    
    // Push to history array automatically
    this.history.push({ price: this.currentPrice, date: new Date() });
  }
  next();
});

module.exports = mongoose.model('FoodPrice', FoodPriceSchema);
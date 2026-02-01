const mongoose = require('mongoose');

const ShareholderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shares: { type: Number, min: 0, max: 100, required: true },
  type: { type: String, enum: ['Company', 'User', 'Fund', 'Other'], required: true },
  email: { type: String },
  contact: { type: String },
  equityClass: { type: String, enum: ['Common', 'Preferred', 'Option'], default: 'Common' },
  vestingSchedule: { type: String },
  joinDate: { type: Date, default: Date.now },
  
  // Financial details
  investment: { type: Number },
  valuationCap: { type: Number },
  dividendRate: { type: Number, default: 0 },
  
  // Status
  active: { type: Boolean, default: true },
  notes: { type: String },
  
  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure total shares don't exceed 100%
ShareholderSchema.pre('save', async function(next) {
  if (this.isModified('shares')) {
    const totalShares = await this.constructor.aggregate([
      { $match: { _id: { $ne: this._id }, active: true } },
      { $group: { _id: null, total: { $sum: '$shares' } } }
    ]);
    
    const currentTotal = totalShares[0]?.total || 0;
    if (currentTotal + this.shares > 100) {
      next(new Error('Total shares cannot exceed 100%'));
      return;
    }
  }
  next();
});

module.exports = mongoose.model('Shareholder', ShareholderSchema);
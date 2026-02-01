const ShareholderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shares: { type: Number, min: 0, max: 100, required: true },
  type: { type: String, enum: ['Company', 'User', 'Fund', 'Other'], required: true },
  email: { type: String },
  contact: { type: String },
  equityClass: { type: String, enum: ['Common', 'Preferred', 'Option'], default: 'Common' },
  
  // Status
  active: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ShareholderSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
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

const Shareholder = mongoose.model('Shareholder', ShareholderSchema);

// 3. Integration Schema
const IntegrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Payments', 'Email', 'SMS', 'Analytics', 'Logistics', 'Other'], required: true },
  provider: { type: String, required: true },
  status: { type: String, enum: ['Connected', 'Active', 'Online', 'Offline', 'Error'], default: 'Offline' },
  enabled: { type: Boolean, default: true },
  
  // Configuration
  apiKey: { type: String, select: false },
  endpoint: { type: String },
  
  // Metrics
  lastSync: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Integration = mongoose.model('Integration', IntegrationSchema);

// 4. Node Schema
const NodeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  region: { type: String, required: true },
  status: { type: String, enum: ['online', 'offline', 'maintenance', 'degraded'], default: 'offline' },
  
  // Resources
  cpu: { type: Number, min: 0, max: 100 },
  memory: { type: Number, min: 0, max: 100 },
  
  // Network
  latency: { type: Number },
  
  // Health
  lastPing: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports= mongoose.model('Node', NodeSchema);
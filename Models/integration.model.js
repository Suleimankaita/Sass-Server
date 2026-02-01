const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  region: { type: String, required: true },
  zone: { type: String },
  status: { type: String, enum: ['online', 'offline', 'maintenance', 'degraded'], default: 'offline' },
  
  // Resources
  cpu: { type: Number, min: 0, max: 100 },
  memory: { type: Number, min: 0, max: 100 },
  storage: { type: Number, min: 0, max: 100 },
  
  // Network
  ip: { type: String },
  latency: { type: Number },
  throughput: { type: Number },
  
  // Health
  lastPing: { type: Date },
  uptime: { type: Number, default: 0 },
  errors: [{ timestamp: Date, message: String }],
  
  // Configuration
  shardId: { type: Number },
  version: { type: String },
  tags: [String],
  
  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Node', NodeSchema);
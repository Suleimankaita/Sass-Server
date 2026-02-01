const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema({
  name: { type: String, required: true, default: "Titan Enterprise Pro" },
  currency: { type: String, enum: ['USD', 'NGN', 'EUR', 'GBP'], default: 'USD' },
  env: { type: String, enum: ['Production', 'Staging', 'Maintenance', 'Development'], default: 'Production' },
  lang: { type: String, default: 'English' },
  tax: { type: Number, min: 0, max: 100, default: 7.5 },
  
  // Security settings
  twoFactor: { type: Boolean, default: true },
  session: { type: Number, min: 15, max: 1440, default: 30 },
  ipWhitelist: [{ type: String }],
//   sslMode: { type: String, enum: ['RSA-2048', 'RSA-4096', 'ECC'], default: 'RSA-4096-AES' },
  
  // Billing settings
  globalFee: { type: Number, min: 0, max: 50, default: 12.5 },
  posFee: { type: Number, default: 0.50 },
  ecomFee: { type: Number, default: 1.0 },
  
  // Feature flags
  ecomEnabled: { type: Boolean, default: true },
  posEnabled: { type: Boolean, default: true },
  aiInsights: { type: Boolean, default: true },
  beta: { type: Boolean, default: false },
  
  // Integration settings
  smtp: { type: String, default: 'SendGrid' },
  sms: { type: String, default: 'Twilio' },
  paymentGateway: { type: String, default: 'Monnify' },
  
  // System metrics
  latency: { type: Number, default: 14 },
  version: { type: String, default: '5.0.0' },
  lastDeployed: { type: Date, default: Date.now },
  
  // Audit trail
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SystemConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);
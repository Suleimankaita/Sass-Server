// models/SecurityCompliance.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const SecurityComplianceSchema = new mongoose.Schema({
  // --- SESSION DATA ---
  SessionType: {
    type: String,
    enum: ['active_session', 'terminated_session', 'expired_session'],
    default: 'active_session'
  },
  Username: {
    type: String,
    // required: true
  },
  Device: String,
  IpAddress: String,
  Location: String,
  UserAgent: String,
  SessionToken: String,
  LastActivity: {
    type: Date,
    default: Date.now
  },
  ExpiresAt: Date,
  IsSessionActive: {
    type: Boolean,
    default: true
  },
  
  // --- IP MANAGEMENT DATA ---
  IpRuleType: {
    type: String,
    enum: ['whitelist', 'blacklist', null],
    default: null
  },
  IpAddressRule: String, // Store IP for rules
  IpNote: String,
  IpIsActive: {
    type: Boolean,
    default: true
  },
  
  // --- API KEY DATA ---
  ApiKeyName: String,
  ApiKeyValue: String,
  ApiKeyPrefix: {
    type: String,
    default: 'sk_live'
  },
  ApiPermissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin', 'user_management', 'data_export']
  }],
  ApiLastUsed: Date,
  ApiUsageCount: {
    type: Number,
    default: 0
  },
  IsApiKeyActive: {
    type: Boolean,
    default: true
  },
  ApiKeyExpiresAt: Date,
  
  // --- SECURITY SETTINGS ---
  SettingName: String,
  SettingValue: mongoose.Schema.Types.Mixed,
  SettingDescription: String,
  SettingCategory: {
    type: String,
    enum: ['authentication', 'password', 'session', 'network', 'api', 'compliance', 'general']
  },
  IsSettingEnabled: {
    type: Boolean,
    default: true
  },
  
  // --- SECURITY LOGS ---
  ActivityType: {
    type: String,
    enum: ['session_terminated', 'session_created', 'ip_added', 'ip_removed', 
           'api_key_generated', 'api_key_revoked', 'setting_changed', 
           'global_logout', 'failed_login', 'suspicious_activity', 
           'access_denied', 'password_changed', '2fa_enabled', 
        'global_force_logout', 
      'selective_force_logout', 
      'individual_force_logout',   '2fa_disabled', 'user_locked', 'user_unlocked',
        ],
    default: 'session_created'
  },
  ActionTarget: String,
  ActionDetails: String,
  Severity: {
    type: String,
    enum: ['info', 'warning', 'danger', 'critical'],
    default: 'info'
  },
  Status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  
  // --- METADATA ---
  DataType: {
    type: String,
    enum: ['session', 'ip_rule', 'api_key', 'setting', 'log'],
    // required: true
  },
  CreatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // --- COMPLIANCE DATA ---
  ComplianceStandard: {
    type: String,
    enum: ['GDPR', 'HIPAA', 'PCI_DSS', 'ISO_27001', 'SOC_2', 'CUSTOM']
  },
  ComplianceStatus: {
    type: String,
    enum: ['compliant', 'non_compliant', 'in_review', 'exempt']
  },
  LastAuditDate: Date,
  NextAuditDate: Date
}, {
  timestamps: true,
  collection: 'security_compliance'
});

// Indexes for efficient queries
SecurityComplianceSchema.index({ DataType: 1, IsSessionActive: 1 });
SecurityComplianceSchema.index({ DataType: 1, IpRuleType: 1 });
SecurityComplianceSchema.index({ DataType: 1, IsApiKeyActive: 1 });
SecurityComplianceSchema.index({ DataType: 1, ActivityType: 1 });
SecurityComplianceSchema.index({ Username: 1, DataType: 1 });
SecurityComplianceSchema.index({ ExpiresAt: 1 }, { expireAfterSeconds: 0 });
SecurityComplianceSchema.index({ ApiKeyExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware for API key generation
SecurityComplianceSchema.pre('save', function(next) {
  if (this.isNew && this.DataType === 'api_key') {
    const secret = crypto.randomBytes(32).toString('hex');
    this.ApiKeyValue = `${this.ApiKeyPrefix || 'sk_live'}_${secret}`;
  }
  next();
});

// Static method to generate API key
SecurityComplianceSchema.statics.generateApiKey = function(prefix = 'sk_live') {
  const secret = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${secret}`;
};

// Static method to get active sessions
SecurityComplianceSchema.statics.getActiveSessions = function() {
  return this.find({
    DataType: 'session',
    IsSessionActive: true,
    ExpiresAt: { $gt: new Date() }
  }).sort({ LastActivity: -1 });
};

// Static method to get IP rules
SecurityComplianceSchema.statics.getIpRules = function(type = null) {
  const query = { DataType: 'ip_rule', IpIsActive: true };
  if (type) {
    query.IpRuleType = type;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to get API keys
SecurityComplianceSchema.statics.getApiKeys = function(userId = null) {
  const query = { DataType: 'api_key', IsApiKeyActive: true };
  if (userId) {
    query.CreatedBy = userId;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to get security settings
SecurityComplianceSchema.statics.getSecuritySettings = function(category = null) {
  const query = { DataType: 'setting', IsSettingEnabled: true };
  if (category) {
    query.SettingCategory = category;
  }
  return this.find(query);
};

// Static method to get security logs
SecurityComplianceSchema.statics.getSecurityLogs = function(filters = {}) {
  const query = { DataType: 'log' };
  
  // Apply filters
  if (filters.severity) query.Severity = filters.severity;
  if (filters.activityType) query.ActivityType = filters.activityType;
  if (filters.username) query.Username = filters.username;
  if (filters.startDate) query.createdAt = { $gte: filters.startDate };
  if (filters.endDate) query.createdAt = { $lte: filters.endDate };
  
  return this.find(query).sort({ createdAt: -1 }).limit(filters.limit || 100);
};

// Instance method to terminate session
SecurityComplianceSchema.methods.terminateSession = async function(reason = 'Manual termination') {
  if (this.DataType === 'session') {
    this.IsSessionActive = false;
    this.SessionType = 'terminated_session';
    
    // Log the termination
    await this.model('SecurityCompliance').create({
      DataType: 'log',
      ActivityType: 'session_terminated',
      Username: this.Username,
      IpAddress: this.IpAddress,
      ActionTarget: this._id.toString(),
      ActionDetails: reason,
      Severity: 'info',
      Status: 'success'
    });
    
    return this.save();
  }
  throw new Error('Cannot terminate non-session document');
};

// Instance method to revoke API key
SecurityComplianceSchema.methods.revokeApiKey = async function(reason = 'Manual revocation') {
  if (this.DataType === 'api_key') {
    this.IsApiKeyActive = false;
    
    // Log the revocation
    await this.model('SecurityCompliance').create({
      DataType: 'log',
      ActivityType: 'api_key_revoked',
      Username: this.ApiKeyName,
      ActionTarget: this._id.toString(),
      ActionDetails: reason,
      Severity: 'warning',
      Status: 'success'
    });
    
    return this.save();
  }
  throw new Error('Cannot revoke non-api-key document');
};

// Instance method to update setting
SecurityComplianceSchema.methods.updateSetting = async function(newValue, modifiedBy, reason = 'Setting updated') {
  if (this.DataType === 'setting') {
    const oldValue = this.SettingValue;
    this.SettingValue = newValue;
    this.ModifiedBy = modifiedBy;
    
    // Log the change
    await this.model('SecurityCompliance').create({
      DataType: 'log',
      ActivityType: 'setting_changed',
      Username: 'System',
      ActionTarget: this.SettingName,
      ActionDetails: `${reason}: Changed from ${oldValue} to ${newValue}`,
      Severity: 'info',
      Status: 'success'
    });
    
    return this.save();
  }
  throw new Error('Cannot update non-setting document');
};

module.exports = mongoose.model('SecurityCompliance', SecurityComplianceSchema);
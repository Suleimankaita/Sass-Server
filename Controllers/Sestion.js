// controllers/securityController.js
const SecurityCompliance = require('../models/SecurityCompliance');
const mongoose = require('mongoose');

class SecurityController {
  
  // ============ INITIAL DATA SETUP ============
  static initializeDefaultData = async () => {
    try {
      // Default security settings if not exist
      const defaultSettings = [
        {
          DataType: 'setting',
          SettingName: 'two_factor_auth',
          SettingValue: true,
          SettingDescription: 'Require two-factor authentication for all users',
          SettingCategory: 'authentication',
          IsSettingEnabled: true
        },
        {
          DataType: 'setting',
          SettingName: 'password_min_length',
          SettingValue: 12,
          SettingDescription: 'Minimum password length requirement',
          SettingCategory: 'password',
          IsSettingEnabled: true
        },
        {
          DataType: 'setting',
          SettingName: 'require_special_chars',
          SettingValue: true,
          SettingDescription: 'Require special characters in passwords',
          SettingCategory: 'password',
          IsSettingEnabled: true
        },
        {
          DataType: 'setting',
          SettingName: 'session_timeout',
          SettingValue: 3600,
          SettingDescription: 'Session timeout in seconds',
          SettingCategory: 'session',
          IsSettingEnabled: true
        },
        {
          DataType: 'setting',
          SettingName: 'max_login_attempts',
          SettingValue: 5,
          SettingDescription: 'Maximum failed login attempts before lockout',
          SettingCategory: 'authentication',
          IsSettingEnabled: true
        }
      ];

      for (const setting of defaultSettings) {
        await SecurityCompliance.findOneAndUpdate(
          { DataType: 'setting', SettingName: setting.SettingName },
          setting,
          { upsert: true, new: true }
        );
      }

      console.log('Security default data initialized');
    } catch (error) {
      console.error('Error initializing security data:', error);
    }
  };

  // ============ DASHBOARD OVERVIEW ============
  static getDashboardOverview = async (req, res) => {
    try {
      const [
        activeSessions,
        whitelistIps,
        blacklistIps,
        activeApiKeys,
        recentLogs,
        securitySettings
      ] = await Promise.all([
        // Active sessions
        SecurityCompliance.find({
          DataType: 'session',
          IsSessionActive: true,
          ExpiresAt: { $gt: new Date() }
        }).sort({ LastActivity: -1 }).limit(10),
        
        // Whitelist IPs
        SecurityCompliance.find({
          DataType: 'ip_rule',
          IpRuleType: 'whitelist',
          IpIsActive: true
        }).sort({ createdAt: -1 }),
        
        // Blacklist IPs
        SecurityCompliance.find({
          DataType: 'ip_rule',
          IpRuleType: 'blacklist',
          IpIsActive: true
        }).sort({ createdAt: -1 }),
        
        // Active API keys
        SecurityCompliance.find({
          DataType: 'api_key',
          IsApiKeyActive: true
        }).sort({ createdAt: -1 }),
        
        // Recent security logs
        SecurityCompliance.find({
          DataType: 'log'
        }).sort({ createdAt: -1 }).limit(20),
        
        // Security settings
        SecurityCompliance.find({
          DataType: 'setting',
          IsSettingEnabled: true
        })
      ]);

      // Statistics
      const stats = {
        activeSessions: activeSessions.length,
        whitelistIps: whitelistIps.length,
        blacklistIps: blacklistIps.length,
        activeApiKeys: activeApiKeys.length,
        recentActivities: recentLogs.length,
        enabledSettings: securitySettings.filter(s => s.SettingValue === true || s.SettingValue > 0).length
      };

      // Transform data for frontend
      const transformedData = {
        sessions: activeSessions.map(session => ({
          id: session._id,
          user: session.Username,
          device: session.Device || 'Unknown Device',
          ip: session.IpAddress || 'Unknown IP',
          location: session.Location || 'Unknown',
          lastActivity: session.LastActivity,
          expiresAt: session.ExpiresAt
        })),
        
        ipRules: [...whitelistIps, ...blacklistIps].map(ip => ({
          id: ip._id,
          type: ip.IpRuleType,
          address: ip.IpAddressRule,
          note: ip.IpNote || '',
          createdAt: ip.createdAt
        })),
        
        apiKeys: activeApiKeys.map(key => ({
          id: key._id,
          name: key.ApiKeyName,
          key: key.ApiKeyValue,
          prefix: key.ApiKeyPrefix,
          lastUsed: key.ApiLastUsed,
          permissions: key.ApiPermissions || []
        })),
        
        settings: securitySettings.map(setting => ({
          id: setting._id,
          name: setting.SettingName,
          value: setting.SettingValue,
          description: setting.SettingDescription,
          category: setting.SettingCategory,
          enabled: setting.IsSettingEnabled
        })),
        
        logs: recentLogs.map(log => ({
          id: log._id,
          type: log.ActivityType,
          user: log.Username,
          details: log.ActionDetails,
          severity: log.Severity,
          status: log.Status,
          timestamp: log.createdAt
        })),
        
        stats
      };

      res.json({
        success: true,
        data: transformedData
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data'
      });
    }
  };

  // ============ SESSION MANAGEMENT ============
  static getActiveSessions = async (req, res) => {
    try {
      const { page = 1, limit = 20, username } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const filter = {
        DataType: 'session',
        IsSessionActive: true,
        ExpiresAt: { $gt: new Date() }
      };

      if (username) {
        filter.Username = { $regex: username, $options: 'i' };
      }

      const [sessions, total] = await Promise.all([
        SecurityCompliance.find(filter)
          .sort({ LastActivity: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        SecurityCompliance.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: sessions.map(session => ({
          id: session._id,
          user: session.Username,
          device: session.Device || 'Unknown',
          ip: session.IpAddress,
          location: session.Location || 'Unknown',
          lastActivity: session.LastActivity,
          expiresAt: session.ExpiresAt,
          userAgent: session.UserAgent
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active sessions'
      });
    }
  };

  static terminateSession = async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { reason = 'Manual termination by admin' } = req.body;

      const session = await SecurityCompliance.findOne({
        _id: sessionId,
        DataType: 'session'
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Terminate the session
      session.IsSessionActive = false;
      session.SessionType = 'terminated_session';
      await session.save();

      // Log the action
      await SecurityCompliance.create({
        DataType: 'log',
        ActivityType: 'session_terminated',
        Username: req.user?.username || 'System',
        IpAddress: req.ip,
        ActionTarget: session.Username,
        ActionDetails: reason,
        Severity: 'warning',
        Status: 'success',
        CreatedBy: req.user?.id
      });

      res.json({
        success: true,
        message: 'Session terminated successfully'
      });
    } catch (error) {
      console.error('Error terminating session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to terminate session'
      });
    }
  };

  static terminateAllSessions = async (req, res) => {
    try {
      const { excludeCurrent = true, reason = 'Global logout initiated by admin' } = req.body;

      const filter = {
        DataType: 'session',
        IsSessionActive: true
      };

      // Exclude current session if requested
      if (excludeCurrent && req.session?.sessionId) {
        filter._id = { $ne: req.session.sessionId };
      }

      const result = await SecurityCompliance.updateMany(
        filter,
        {
          $set: {
            IsSessionActive: false,
            SessionType: 'terminated_session'
          }
        }
      );

      // Log the global logout
      await SecurityCompliance.create({
        DataType: 'log',
        ActivityType: 'global_logout',
        Username: req.user?.username || 'System',
        IpAddress: req.ip,
        ActionTarget: 'ALL_USERS',
        ActionDetails: `${reason}. Terminated ${result.modifiedCount} sessions`,
        Severity: 'danger',
        Status: 'success',
        CreatedBy: req.user?.id
      });

      res.json({
        success: true,
        message: `Terminated ${result.modifiedCount} active sessions`,
        count: result.modifiedCount
      });
    } catch (error) {
      console.error('Error terminating all sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to terminate all sessions'
      });
    }
  };

  // ============ IP ADDRESS MANAGEMENT ============
  static getIpRules = async (req, res) => {
    try {
      const { type, page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const filter = {
        DataType: 'ip_rule',
        IpIsActive: true
      };

      if (type && ['whitelist', 'blacklist'].includes(type)) {
        filter.IpRuleType = type;
      }

      const [ipRules, total] = await Promise.all([
        SecurityCompliance.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        SecurityCompliance.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: ipRules.map(ip => ({
          id: ip._id,
          type: ip.IpRuleType,
          address: ip.IpAddressRule,
          note: ip.IpNote || '',
          createdAt: ip.createdAt,
          createdBy: ip.CreatedBy
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching IP rules:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch IP rules'
      });
    }
  };

  static addIpRule = async (req, res) => {
    try {
      const { type, address, note = '' } = req.body;

      if (!['whitelist', 'blacklist'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid IP rule type. Must be "whitelist" or "blacklist"'
        });
      }

      // Validate IP address format
      const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(address)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid IP address format'
        });
      }

      // Check if IP already exists
      const existingIp = await SecurityCompliance.findOne({
        DataType: 'ip_rule',
        IpAddressRule: address,
        IpIsActive: true
      });

      if (existingIp) {
        return res.status(409).json({
          success: false,
          message: `IP address ${address} already exists in ${existingIp.IpRuleType}`
        });
      }

      const ipRule = await SecurityCompliance.create({
        DataType: 'ip_rule',
        IpRuleType: type,
        IpAddressRule: address,
        IpNote: note,
        CreatedBy: req.user?.id
      });

      // Log the action
      await SecurityCompliance.create({
        DataType: 'log',
        ActivityType: 'ip_added',
        Username: req.user?.username || 'System',
        IpAddress: req.ip,
        ActionTarget: address,
        ActionDetails: `Added to ${type}: ${note}`,
        Severity: 'info',
        Status: 'success',
        CreatedBy: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: {
          id: ipRule._id,
          type: ipRule.IpRuleType,
          address: ipRule.IpAddressRule,
          note: ipRule.IpNote,
          createdAt: ipRule.createdAt
        },
        message: `IP address ${address} added to ${type}`
      });
    } catch (error) {
      console.error('Error adding IP rule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add IP rule'
      });
    }
  };

  static removeIpRule = async (req, res) => {
    try {
      const { ipId } = req.params;
      const { reason = 'Manual removal' } = req.body;

      const ipRule = await SecurityCompliance.findOne({
        _id: ipId,
        DataType: 'ip_rule'
      });

      if (!ipRule) {
        return res.status(404).json({
          success: false,
          message: 'IP rule not found'
        });
      }

      ipRule.IpIsActive = false;
      await ipRule.save();

      // Log the action
      await SecurityCompliance.create({
        DataType: 'log',
        ActivityType: 'ip_removed',
        Username: req.user?.username || 'System',
        IpAddress: req.ip,
        ActionTarget: ipRule.IpAddressRule,
        ActionDetails: `${reason}. Type: ${ipRule.IpRuleType}`,
        Severity: 'warning',
        Status: 'success',
        CreatedBy: req.user?.id
      });

      res.json({
        success: true,
        message: `IP rule ${ipRule.IpAddressRule} removed successfully`
      });
    } catch (error) {
      console.error('Error removing IP rule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove IP rule'
      });
    }
  };

  // ============ API KEY MANAGEMENT ============
  static getApiKeys = async (req, res) => {
    try {
      const { showHidden = false, page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const filter = {
        DataType: 'api_key'
      };

      if (!showHidden) {
        filter.IsApiKeyActive = true;
      }

      const [apiKeys, total] = await Promise.all([
        SecurityCompliance.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        SecurityCompliance.countDocuments(filter)
      ]);

      // Mask API keys for response
      const maskedKeys = apiKeys.map(key => ({
        id: key._id,
        name: key.ApiKeyName,
        key: key.ApiKeyValue ? `${key.ApiKeyValue.substring(0, 20)}...` : '***',
        fullKey: showHidden ? key.ApiKeyValue : undefined,
        prefix: key.ApiKeyPrefix,
        permissions: key.ApiPermissions || [],
        lastUsed: key.ApiLastUsed,
        usageCount: key.ApiUsageCount,
        isActive: key.IsApiKeyActive,
        expiresAt: key.ApiKeyExpiresAt,
        createdAt: key.createdAt,
        createdBy: key.CreatedBy
      }));

      res.json({
        success: true,
        data: maskedKeys,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch API keys'
      });
    }
  };

  static generateApiKey = async (req, res) => {
    try {
      const { name, permissions = ['read'], prefix = 'sk_live', expiresInDays = 365 } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'API key name is required'
        });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const apiKey = await SecurityCompliance.create({
        DataType: 'api_key',
        ApiKeyName: name,
        ApiKeyPrefix: prefix,
        ApiPermissions: permissions,
        IsApiKeyActive: true,
        ApiKeyExpiresAt: expiresAt,
        CreatedBy: req.user?.id
      });

      // Log the action
      await SecurityCompliance.create({
        DataType: 'log',
        ActivityType: 'api_key_generated',
        Username: req.user?.username || 'System',
        IpAddress: req.ip,
        ActionTarget: name,
        ActionDetails: `Generated API key with permissions: ${permissions.join(', ')}`,
        Severity: 'info',
        Status: 'success',
        CreatedBy: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: {
          id: apiKey._id,
          name: apiKey.ApiKeyName,
          key: apiKey.ApiKeyValue, // Full key only shown once
          prefix: apiKey.ApiKeyPrefix,
          permissions: apiKey.ApiPermissions,
          expiresAt: apiKey.ApiKeyExpiresAt,
          createdAt: apiKey.createdAt
        },
        message: 'API key generated successfully'
      });
    } catch (error) {
      console.error('Error generating API key:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate API key'
      });
    }
  };

  static revokeApiKey = async (req, res) => {
    try {
      const { keyId } = req.params;
      const { reason = 'Manual revocation' } = req.body;

      const apiKey = await SecurityCompliance.findOne({
        _id: keyId,
        DataType: 'api_key'
      });

      if (!apiKey) {
        return res.status(404).json({
          success: false,
          message: 'API key not found'
        });
      }

      apiKey.IsApiKeyActive = false;
      await apiKey.save();

      // Log the action
      await SecurityCompliance.create({
        DataType: 'log',
        ActivityType: 'api_key_revoked',
        Username: req.user?.username || 'System',
        IpAddress: req.ip,
        ActionTarget: apiKey.ApiKeyName,
        ActionDetails: reason,
        Severity: 'warning',
        Status: 'success',
        CreatedBy: req.user?.id
      });

      res.json({
        success: true,
        message: `API key ${apiKey.ApiKeyName} revoked successfully`
      });
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke API key'
      });
    }
  };

  // ============ SECURITY SETTINGS ============
  static getSecuritySettings = async (req, res) => {
    try {
      const { category } = req.query;

      const filter = {
        DataType: 'setting',
        IsSettingEnabled: true
      };

      if (category) {
        filter.SettingCategory = category;
      }

      const settings = await SecurityCompliance.find(filter);

      res.json({
        success: true,
        data: settings.map(setting => ({
          id: setting._id,
          name: setting.SettingName,
          value: setting.SettingValue,
          description: setting.SettingDescription,
          category: setting.SettingCategory,
          enabled: setting.IsSettingEnabled,
          createdAt: setting.createdAt,
          updatedAt: setting.updatedAt
        }))
      });
    } catch (error) {
      console.error('Error fetching security settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch security settings'
      });
    }
  };

  static updateSecuritySetting = async (req, res) => {
    try {
      const { settingId } = req.params;
      const { value, reason = 'Setting updated' } = req.body;

      const setting = await SecurityCompliance.findOne({
        _id: settingId,
        DataType: 'setting'
      });

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'Security setting not found'
        });
      }

      const oldValue = setting.SettingValue;
      setting.SettingValue = value;
      setting.ModifiedBy = req.user?.id;
      await setting.save();

      // Log the action
      await SecurityCompliance.create({
        DataType: 'log',
        ActivityType: 'setting_changed',
        Username: req.user?.username || 'System',
        IpAddress: req.ip,
        ActionTarget: setting.SettingName,
        ActionDetails: `${reason}. Changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(value)}`,
        Severity: 'info',
        Status: 'success',
        CreatedBy: req.user?.id
      });

      res.json({
        success: true,
        data: {
          id: setting._id,
          name: setting.SettingName,
          value: setting.SettingValue,
          oldValue: oldValue
        },
        message: 'Security setting updated successfully'
      });
    } catch (error) {
      console.error('Error updating security setting:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update security setting'
      });
    }
  };

  // ============ SECURITY LOGS ============
  static getSecurityLogs = async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        severity, 
        activityType, 
        username,
        startDate, 
        endDate 
      } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const filter = {
        DataType: 'log'
      };

      // Apply filters
      if (severity) filter.Severity = severity;
      if (activityType) filter.ActivityType = activityType;
      if (username) filter.Username = { $regex: username, $options: 'i' };
      
      // Date range filter
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const [logs, total] = await Promise.all([
        SecurityCompliance.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        SecurityCompliance.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: logs.map(log => ({
          id: log._id,
          type: log.ActivityType,
          user: log.Username,
          ip: log.IpAddress,
          details: log.ActionDetails,
          severity: log.Severity,
          status: log.Status,
          metadata: log.Metadata,
          timestamp: log.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching security logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch security logs'
      });
    }
  };

  // ============ COMPLIANCE CHECK ============
  static getComplianceStatus = async (req, res) => {
    try {
      // Check various compliance requirements
      const [
        twoFactorEnabled,
        passwordLength,
        specialCharsRequired,
        inactiveSessions,
        expiredApiKeys
      ] = await Promise.all([
        // Check if 2FA is enabled
        SecurityCompliance.findOne({
          DataType: 'setting',
          SettingName: 'two_factor_auth',
          SettingValue: true
        }),
        
        // Check password length requirement
        SecurityCompliance.findOne({
          DataType: 'setting',
          SettingName: 'password_min_length',
          SettingValue: { $gte: 8 }
        }),
        
        // Check special characters requirement
        SecurityCompliance.findOne({
          DataType: 'setting',
          SettingName: 'require_special_chars',
          SettingValue: true
        }),
        
        // Count inactive sessions
        SecurityCompliance.countDocuments({
          DataType: 'session',
          IsSessionActive: false
        }),
        
        // Count expired API keys
        SecurityCompliance.countDocuments({
          DataType: 'api_key',
          IsApiKeyActive: true,
          ApiKeyExpiresAt: { $lt: new Date() }
        })
      ]);

      const compliance = {
        twoFactorAuth: {
          enabled: !!twoFactorEnabled,
          compliant: !!twoFactorEnabled,
          message: twoFactorEnabled ? '2FA is enabled' : '2FA is not enabled (security risk)'
        },
        passwordPolicy: {
          minLength: passwordLength?.SettingValue || 0,
          compliant: (passwordLength?.SettingValue || 0) >= 8,
          message: `Minimum password length: ${passwordLength?.SettingValue || 0}`
        },
        specialChars: {
          required: !!specialCharsRequired,
          compliant: !!specialCharsRequired,
          message: specialCharsRequired ? 'Special characters required' : 'Special characters not required'
        },
        sessionManagement: {
          inactiveSessions,
          compliant: inactiveSessions < 100,
          message: `${inactiveSessions} inactive sessions`
        },
        apiKeyManagement: {
          expiredKeys: expiredApiKeys,
          compliant: expiredApiKeys === 0,
          message: expiredApiKeys > 0 ? `${expiredApiKeys} expired API keys found` : 'No expired API keys'
        },
        overallCompliance: {
          compliant: !!twoFactorEnabled && (passwordLength?.SettingValue || 0) >= 8 && 
                    !!specialCharsRequired && inactiveSessions < 100 && expiredApiKeys === 0,
          score: Math.round(
            ([
              !!twoFactorEnabled,
              (passwordLength?.SettingValue || 0) >= 8,
              !!specialCharsRequired,
              inactiveSessions < 100,
              expiredApiKeys === 0
            ].filter(Boolean).length / 5) * 100
          )
        }
      };

      res.json({
        success: true,
        data: compliance
      });
    } catch (error) {
      console.error('Error checking compliance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check compliance status'
      });
    }
  };

  // ============ SYSTEM HEALTH CHECK ============
  static getSystemHealth = async (req, res) => {
    try {
      const [
        activeSessionsCount,
        blacklistedIpsCount,
        activeApiKeysCount,
        recentFailedLogins,
        systemUptime
      ] = await Promise.all([
        SecurityCompliance.countDocuments({
          DataType: 'session',
          IsSessionActive: true,
          ExpiresAt: { $gt: new Date() }
        }),
        SecurityCompliance.countDocuments({
          DataType: 'ip_rule',
          IpRuleType: 'blacklist',
          IpIsActive: true
        }),
        SecurityCompliance.countDocuments({
          DataType: 'api_key',
          IsApiKeyActive: true
        }),
        SecurityCompliance.countDocuments({
          DataType: 'log',
          ActivityType: 'failed_login',
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        // Mock uptime - in real app, you'd get this from system metrics
        Promise.resolve(Math.floor(Math.random() * 99) + 1)
      ]);

      const health = {
        sessions: {
          count: activeSessionsCount,
          status: activeSessionsCount < 100 ? 'healthy' : 'warning'
        },
        security: {
          blacklistedIps: blacklistedIpsCount,
          status: blacklistedIpsCount > 0 ? 'healthy' : 'info'
        },
        api: {
          activeKeys: activeApiKeysCount,
          status: activeApiKeysCount > 0 ? 'healthy' : 'warning'
        },
        threats: {
          failedLogins24h: recentFailedLogins,
          status: recentFailedLogins < 10 ? 'healthy' : recentFailedLogins < 50 ? 'warning' : 'danger'
        },
        system: {
          uptime: systemUptime,
          status: systemUptime > 95 ? 'healthy' : 'warning'
        },
        overall: 'healthy'
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Error checking system health:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check system health'
      });
    }
  };
}

module.exports = SecurityController;
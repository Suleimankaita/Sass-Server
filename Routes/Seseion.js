// routes/securityRoutes.js
const express = require('express');
const router = express.Router();
const SecurityController = require('../controllers/securityController');
// const { authenticate, authorize } = require('../middleware/auth');

// Initialize default data (run once)
router.get('/init', SecurityController.initializeDefaultData);

// Dashboard Overview
router.get('/dashboard',  SecurityController.getDashboardOverview);

// Session Management
router.get('/sessions',  SecurityController.getActiveSessions);
router.delete('/sessions/:sessionId',   SecurityController.terminateSession);
router.post('/sessions/terminate-all',   SecurityController.terminateAllSessions);

// IP Address Management
router.get('/ip-rules',  SecurityController.getIpRules);
router.post('/ip-rules',   SecurityController.addIpRule);
router.delete('/ip-rules/:ipId',   SecurityController.removeIpRule);

// API Key Management
router.get('/api-keys',  SecurityController.getApiKeys);
router.post('/api-keys/generate',   SecurityController.generateApiKey);
router.delete('/api-keys/:keyId',   SecurityController.revokeApiKey);

// Security Settings
router.get('/settings',  SecurityController.getSecuritySettings);
router.patch('/settings/:settingId',   SecurityController.updateSecuritySetting);

// Security Logs
router.get('/logs',  SecurityController.getSecurityLogs);

// Compliance & Health
router.get('/compliance',  SecurityController.getComplianceStatus);
router.get('/health',  SecurityController.getSystemHealth);

module.exports = router;
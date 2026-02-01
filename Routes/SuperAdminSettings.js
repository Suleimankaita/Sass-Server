// titan-omega-routes.js
const express = require('express');
const router = express.Router();
const controller = require('../Controllers/SuperAdminSettings');

// ============================================
// SYSTEM CONFIGURATION ROUTES
// ============================================
router.get('/system/config', controller.getConfig.bind(controller));
router.put('/system/config', controller.updateConfig.bind(controller));
router.post('/system/config/deploy', controller.deployConfig.bind(controller));
router.post('/system/config/reset', controller.resetConfig.bind(controller));

// ============================================
// SHAREHOLDER ROUTES
// ============================================
router.get('/shareholders', controller.getAllShareholders.bind(controller));
router.get('/shareholders/captable', controller.getCapTable.bind(controller));
router.get('/shareholders/:id', controller.getShareholder.bind(controller));
router.post('/shareholders', controller.createShareholder.bind(controller));
router.put('/shareholders/:id', controller.updateShareholder.bind(controller));
router.delete('/shareholders/:id', controller.deleteShareholder.bind(controller));

// ============================================
// INTEGRATION ROUTES
// ============================================
router.get('/integrations', controller.getAllIntegrations.bind(controller));
router.get('/integrations/:id', controller.getIntegration.bind(controller));
router.post('/integrations', controller.createIntegration.bind(controller));
router.put('/integrations/:id', controller.updateIntegration.bind(controller));
router.post('/integrations/:id/test', controller.testIntegration.bind(controller));
router.post('/integrations/sync/all', controller.syncAllIntegrations.bind(controller));
router.post('/integrations/:id/toggle', controller.toggleIntegration.bind(controller));

// ============================================
// NODE ROUTES
// ============================================
router.get('/nodes', controller.getAllNodes.bind(controller));
router.get('/nodes/:id', controller.getNode.bind(controller));
router.post('/nodes', controller.createNode.bind(controller));
router.put('/nodes/:id', controller.updateNode.bind(controller));
router.delete('/nodes/:id', controller.deleteNode.bind(controller));
router.post('/nodes/:id/ping', controller.pingNode.bind(controller));
router.post('/nodes/ping/all', controller.pingAllNodes.bind(controller));
router.post('/nodes/:id/restart', controller.restartNode.bind(controller));

// ============================================
// DASHBOARD & UTILITY ROUTES
// ============================================
router.get('/dashboard', controller.getDashboard.bind(controller));
router.get('/system/health', controller.getSystemHealth.bind(controller));
router.post('/system/cache/flush', controller.flushCache.bind(controller));
router.get('/search', controller.searchGlobal.bind(controller));

// ============================================
// INITIALIZATION ROUTE
// ============================================
router.post('/initialize', async (req, res) => {
  try {
    const success = await controller.initializeDefaults();
    if (success) {
      res.json({ success: true, message: 'System initialized successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Initialization failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
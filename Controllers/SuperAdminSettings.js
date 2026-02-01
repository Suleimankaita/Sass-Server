// titan-omega-controller.js
const mongoose = require('mongoose');
const SystemConfig = require("../Models/system-config.model");
const Shareholder = require("../Models/shareholder.model");
const Integration = require("../Models/integration.model");
const Node = require("../Models/node.model");

// ============================================
// CONTROLLER CLASS
// ============================================

class TitanOmegaController {
  constructor() {
    // Initialize models
    this.SystemConfig = SystemConfig;
    this.Shareholder = Shareholder;
    this.Integration = Integration;
    this.Node = Node;
  }

  // ============================================
  // SYSTEM CONFIGURATION METHODS
  // ============================================

  async getConfig(req, res) {
    try {
      let config = await this.SystemConfig.findOne().sort({ updatedAt: -1 });
      
      if (!config) {
        config = await this.SystemConfig.create({});
      }
      
      res.json({
        success: true,
        data: config,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system configuration',
        error: error.message
      });
    }
  }

  async updateConfig(req, res) {
    try {
      const updates = req.body;
      
      let config = await this.SystemConfig.findOne().sort({ updatedAt: -1 });
      
      if (!config) {
        config = await this.SystemConfig.create(updates);
      } else {
        Object.assign(config, updates);
        await config.save();
      }
      
      res.json({
        success: true,
        message: 'System configuration updated successfully',
        data: config,
        deployed: true
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to update system configuration',
        error: error.message
      });
    }
  }

  async deployConfig(req, res) {
    try {
      const config = await this.SystemConfig.findOne().sort({ updatedAt: -1 });
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'No configuration found to deploy'
        });
      }
      
      config.lastDeployed = new Date();
      await config.save();
      
      // Simulate deployment
      setTimeout(() => {
        res.json({
          success: true,
          message: 'Configuration deployed successfully to all shards',
          timestamp: new Date(),
          data: {
            lastDeployed: config.lastDeployed,
            version: config.version
          }
        });
      }, 2000);
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Deployment failed',
        error: error.message
      });
    }
  }

  async resetConfig(req, res) {
    try {
      await this.SystemConfig.deleteMany({});
      
      const defaultConfig = await this.SystemConfig.create({});
      
      res.json({
        success: true,
        message: 'System configuration reset to defaults',
        data: defaultConfig
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to reset configuration',
        error: error.message
      });
    }
  }

  // ============================================
  // SHAREHOLDER METHODS
  // ============================================

  async getAllShareholders(req, res) {
    try {
      const shareholders = await this.Shareholder.find({ active: true })
        .sort({ shares: -1 })
        .select('-__v');
      
      const totalShares = shareholders.reduce((sum, sh) => sum + sh.shares, 0);
      const availableShares = 100 - totalShares;
      
      res.json({
        success: true,
        data: shareholders,
        summary: {
          totalShareholders: shareholders.length,
          totalShares: `${totalShares}%`,
          availableShares: `${availableShares}%`
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch shareholders',
        error: error.message
      });
    }
  }

  async getShareholder(req, res) {
    try {
      const shareholder = await this.Shareholder.findById(req.params.id);
      
      if (!shareholder) {
        return res.status(404).json({
          success: false,
          message: 'Shareholder not found'
        });
      }
      
      res.json({
        success: true,
        data: shareholder
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch shareholder',
        error: error.message
      });
    }
  }

  async createShareholder(req, res) {
    try {
      const data = req.body;
      
      // Validate total shares
      const existingShares = await this.Shareholder.aggregate([
        { $match: { active: true } },
        { $group: { _id: null, total: { $sum: '$shares' } } }
      ]);
      
      const currentTotal = existingShares[0]?.total || 0;
      if (currentTotal + data.shares > 100) {
        return res.status(400).json({
          success: false,
          message: `Cannot add shareholder. Total shares would exceed 100% (current: ${currentTotal}%)`
        });
      }
      
      const shareholder = await this.Shareholder.create(data);
      
      res.status(201).json({
        success: true,
        message: 'Shareholder created successfully',
        data: shareholder
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to create shareholder',
        error: error.message
      });
    }
  }

  async updateShareholder(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const shareholder = await this.Shareholder.findById(id);
      
      if (!shareholder) {
        return res.status(404).json({
          success: false,
          message: 'Shareholder not found'
        });
      }
      
      // If updating shares, validate
      if (updates.shares !== undefined) {
        const otherShares = await this.Shareholder.aggregate([
          { $match: { _id: { $ne: shareholder._id }, active: true } },
          { $group: { _id: null, total: { $sum: '$shares' } } }
        ]);
        
        const currentTotal = otherShares[0]?.total || 0;
        if (currentTotal + updates.shares > 100) {
          return res.status(400).json({
            success: false,
            message: `Cannot update shares. Total would exceed 100%`
          });
        }
      }
      
      Object.assign(shareholder, updates);
      await shareholder.save();
      
      res.json({
        success: true,
        message: 'Shareholder updated successfully',
        data: shareholder
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to update shareholder',
        error: error.message
      });
    }
  }

  async deleteShareholder(req, res) {
    try {
      const shareholder = await this.Shareholder.findById(req.params.id);
      
      if (!shareholder) {
        return res.status(404).json({
          success: false,
          message: 'Shareholder not found'
        });
      }
      
      shareholder.active = false;
      await shareholder.save();
      
      res.json({
        success: true,
        message: 'Shareholder deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete shareholder',
        error: error.message
      });
    }
  }

  async getCapTable(req, res) {
    try {
      const shareholders = await this.Shareholder.find({ active: true })
        .sort({ shares: -1 });
      
      const summary = shareholders.reduce((acc, sh) => {
        acc.totalShares += sh.shares;
        acc.byType[sh.type] = (acc.byType[sh.type] || 0) + sh.shares;
        return acc;
      }, { totalShares: 0, byType: {} });
      
      res.json({
        success: true,
        data: {
          shareholders,
          summary,
          availableShares: 100 - summary.totalShares
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate cap table',
        error: error.message
      });
    }
  }

  // ============================================
  // INTEGRATION METHODS
  // ============================================

  async getAllIntegrations(req, res) {
    try {
      const integrations = await this.Integration.find()
        .sort({ type: 1, name: 1 })
        .select('-apiKey');
      
      res.json({
        success: true,
        data: integrations,
        stats: {
          total: integrations.length,
          enabled: integrations.filter(i => i.enabled).length,
          online: integrations.filter(i => i.status === 'Online' || i.status === 'Active').length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch integrations',
        error: error.message
      });
    }
  }

  async getIntegration(req, res) {
    try {
      const integration = await this.Integration.findById(req.params.id)
        .select('-apiKey');
      
      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Integration not found'
        });
      }
      
      res.json({
        success: true,
        data: integration
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch integration',
        error: error.message
      });
    }
  }

  async createIntegration(req, res) {
    try {
      const data = req.body;
      
      const integration = await this.Integration.create(data);
      
      // Hide sensitive data in response
      const responseData = integration.toObject();
      delete responseData.apiKey;
      
      res.status(201).json({
        success: true,
        message: 'Integration created successfully',
        data: responseData
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to create integration',
        error: error.message
      });
    }
  }

  async updateIntegration(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const integration = await this.Integration.findById(id);
      
      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Integration not found'
        });
      }
      
      Object.assign(integration, updates);
      integration.lastSync = updates.status === 'Connected' ? new Date() : integration.lastSync;
      await integration.save();
      
      // Hide sensitive data
      const responseData = integration.toObject();
      delete responseData.apiKey;
      
      res.json({
        success: true,
        message: 'Integration updated successfully',
        data: responseData
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to update integration',
        error: error.message
      });
    }
  }

  async testIntegration(req, res) {
    try {
      const integration = await this.Integration.findById(req.params.id);
      
      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Integration not found'
        });
      }
      
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const success = Math.random() > 0.2; // 80% success rate for demo
      
      if (success) {
        integration.status = 'Connected';
        integration.lastSync = new Date();
        await integration.save();
        
        res.json({
          success: true,
          message: 'Connection test successful',
          data: {
            status: 'Connected',
            latency: Math.floor(Math.random() * 200) + 50,
            timestamp: new Date()
          }
        });
      } else {
        integration.status = 'Error';
        await integration.save();
        
        res.status(500).json({
          success: false,
          message: 'Connection test failed',
          error: 'API endpoint unreachable'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Connection test failed',
        error: error.message
      });
    }
  }

  async syncAllIntegrations(req, res) {
    try {
      const integrations = await this.Integration.find({ enabled: true });
      
      // Simulate sync process
      const results = await Promise.allSettled(
        integrations.map(async (integration) => {
          await new Promise(resolve => setTimeout(resolve, 500));
          integration.lastSync = new Date();
          integration.status = 'Connected';
          await integration.save();
          return { name: integration.name, status: 'synced' };
        })
      );
      
      res.json({
        success: true,
        message: 'Integration sync completed',
        data: {
          total: integrations.length,
          synced: results.filter(r => r.status === 'fulfilled').length,
          failed: results.filter(r => r.status === 'rejected').length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Sync failed',
        error: error.message
      });
    }
  }

  async toggleIntegration(req, res) {
    try {
      const integration = await this.Integration.findById(req.params.id);
      
      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Integration not found'
        });
      }
      
      integration.enabled = !integration.enabled;
      await integration.save();
      
      res.json({
        success: true,
        message: `Integration ${integration.enabled ? 'enabled' : 'disabled'} successfully`,
        data: { enabled: integration.enabled }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to toggle integration',
        error: error.message
      });
    }
  }

  // ============================================
  // NODE METHODS
  // ============================================

  async getAllNodes(req, res) {
    try {
      const nodes = await this.Node.find().sort({ region: 1, name: 1 });
      
      // Calculate health metrics
      const now = new Date();
      const healthStats = nodes.reduce((stats, node) => {
        const isRecent = node.lastPing ? (now - node.lastPing) < 300000 : false; // 5 minutes
        stats.online += node.status === 'online' && isRecent ? 1 : 0;
        stats.offline += node.status === 'offline' ? 1 : 0;
        stats.maintenance += node.status === 'maintenance' ? 1 : 0;
        stats.total++;
        return stats;
      }, { online: 0, offline: 0, maintenance: 0, total: 0 });
      
      res.json({
        success: true,
        data: nodes,
        health: healthStats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch nodes',
        error: error.message
      });
    }
  }

  async getNode(req, res) {
    try {
      const node = await this.Node.findById(req.params.id);
      
      if (!node) {
        return res.status(404).json({
          success: false,
          message: 'Node not found'
        });
      }
      
      res.json({
        success: true,
        data: node
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch node',
        error: error.message
      });
    }
  }

  async createNode(req, res) {
    try {
      const data = req.body;
      
      const node = await this.Node.create({
        ...data,
        status: 'offline'
      });
      
      res.status(201).json({
        success: true,
        message: 'Node created successfully',
        data: node
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to create node',
        error: error.message
      });
    }
  }

  async updateNode(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const node = await this.Node.findById(id);
      
      if (!node) {
        return res.status(404).json({
          success: false,
          message: 'Node not found'
        });
      }
      
      Object.assign(node, updates);
      await node.save();
      
      res.json({
        success: true,
        message: 'Node updated successfully',
        data: node
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to update node',
        error: error.message
      });
    }
  }

  async deleteNode(req, res) {
    try {
      const node = await this.Node.findById(req.params.id);
      
      if (!node) {
        return res.status(404).json({
          success: false,
          message: 'Node not found'
        });
      }
      
      if (node.status === 'online') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete online node. Take it offline first.'
        });
      }
      
      await node.deleteOne();
      
      res.json({
        success: true,
        message: 'Node deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete node',
        error: error.message
      });
    }
  }

  async pingNode(req, res) {
    try {
      const node = await this.Node.findById(req.params.id);
      
      if (!node) {
        return res.status(404).json({
          success: false,
          message: 'Node not found'
        });
      }
      
      // Simulate ping
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const online = Math.random() > 0.1; // 90% chance of being online
      node.status = online ? 'online' : 'offline';
      node.lastPing = new Date();
      node.latency = Math.floor(Math.random() * 100) + 10;
      node.cpu = Math.floor(Math.random() * 80) + 10;
      node.memory = Math.floor(Math.random() * 70) + 20;
      
      await node.save();
      
      res.json({
        success: true,
        message: `Node ${online ? 'is online' : 'is offline'}`,
        data: {
          status: node.status,
          latency: node.latency,
          cpu: node.cpu,
          memory: node.memory,
          timestamp: node.lastPing
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to ping node',
        error: error.message
      });
    }
  }

  async pingAllNodes(req, res) {
    try {
      const nodes = await this.Node.find();
      
      const results = await Promise.all(
        nodes.map(async (node) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          const online = Math.random() > 0.1;
          node.status = online ? 'online' : 'offline';
          node.lastPing = new Date();
          node.latency = Math.floor(Math.random() * 100) + 10;
          await node.save();
          return { name: node.name, status: node.status, latency: node.latency };
        })
      );
      
      res.json({
        success: true,
        message: 'All nodes pinged successfully',
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to ping nodes',
        error: error.message
      });
    }
  }

  async restartNode(req, res) {
    try {
      const node = await this.Node.findById(req.params.id);
      
      if (!node) {
        return res.status(404).json({
          success: false,
          message: 'Node not found'
        });
      }
      
      node.status = 'maintenance';
      await node.save();
      
      // Simulate restart delay
      setTimeout(async () => {
        node.status = 'online';
        node.lastPing = new Date();
        await node.save();
        
        // Simulate response after restart
        if (!res.headersSent) {
          res.json({
            success: true,
            message: 'Node restarted successfully',
            data: {
              status: node.status,
              timestamp: node.lastPing
            }
          });
        }
      }, 3000);
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to restart node',
        error: error.message
      });
    }
  }

  // ============================================
  // DASHBOARD & METRICS METHODS
  // ============================================

  async getDashboard(req, res) {
    try {
      const [
        config,
        shareholders,
        integrations,
        nodes
      ] = await Promise.all([
        this.SystemConfig.findOne().sort({ updatedAt: -1 }),
        this.Shareholder.find({ active: true }),
        this.Integration.find({ enabled: true }),
        this.Node.find()
      ]);
      
      // Calculate metrics
      const now = new Date();
      const onlineNodes = nodes.filter(node => 
        node.status === 'online' && 
        node.lastPing && 
        (now - node.lastPing) < 300000
      ).length;
      
      const activeIntegrations = integrations.filter(i => 
        i.status === 'Connected' || i.status === 'Active'
      ).length;
      
      const totalShares = shareholders.reduce((sum, sh) => sum + sh.shares, 0);
      
      res.json({
        success: true,
        data: {
          system: config || {},
          metrics: {
            uptime: process.uptime(),
            onlineNodes,
            totalNodes: nodes.length,
            activeIntegrations,
            totalIntegrations: integrations.length,
            totalShareholders: shareholders.length,
            totalShares: `${totalShares}%`,
            availableShares: `${100 - totalShares}%`
          },
          health: {
            system: onlineNodes > 0 ? 'healthy' : 'degraded',
            database: 'connected',
            cache: 'active'
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to load dashboard',
        error: error.message
      });
    }
  }

  async getSystemHealth(req, res) {
    try {
      const nodes = await this.Node.find();
      const integrations = await this.Integration.find({ enabled: true });
      
      const now = new Date();
      const nodeHealth = nodes.map(node => ({
        name: node.name,
        status: node.status,
        latency: node.latency,
        lastPing: node.lastPing,
        isRecent: node.lastPing ? (now - node.lastPing) < 300000 : false
      }));
      
      const integrationHealth = integrations.map(integration => ({
        name: integration.name,
        status: integration.status,
        lastSync: integration.lastSync,
        enabled: integration.enabled
      }));
      
      res.json({
        success: true,
        data: {
          nodes: nodeHealth,
          integrations: integrationHealth,
          timestamp: new Date(),
          overallStatus: nodeHealth.some(n => n.isRecent) ? 'healthy' : 'degraded'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to check system health',
        error: error.message
      });
    }
  }

  async flushCache(req, res) {
    try {
      // Simulate cache flush
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      res.json({
        success: true,
        message: 'Global cache flushed successfully',
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to flush cache',
        error: error.message
      });
    }
  }

  async searchGlobal(req, res) {
    try {
      const { query } = req.query;
      
      if (!query) {
        return res.json({
          success: true,
          data: [],
          message: 'No search query provided'
        });
      }
      
      // Search across all collections
      const [config, shareholders, integrations, nodes] = await Promise.all([
        this.SystemConfig.findOne({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { currency: { $regex: query, $options: 'i' } },
            { env: { $regex: query, $options: 'i' } }
          ]
        }),
        this.Shareholder.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { type: { $regex: query, $options: 'i' } }
          ]
        }),
        this.Integration.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { type: { $regex: query, $options: 'i' } },
            { provider: { $regex: query, $options: 'i' } }
          ]
        }),
        this.Node.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { region: { $regex: query, $options: 'i' } }
          ]
        })
      ]);
      
      const results = [];
      
      if (config) results.push({ type: 'system', data: config });
      shareholders.forEach(sh => results.push({ type: 'shareholder', data: sh }));
      integrations.forEach(int => results.push({ type: 'integration', data: int }));
      nodes.forEach(node => results.push({ type: 'node', data: node }));
      
      res.json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }
  }

  // ============================================
  // INITIALIZATION & SEEDING
  // ============================================

  async initializeDefaults() {
    try {
      // Check if system config exists
      const existingConfig = await this.SystemConfig.findOne();
      if (!existingConfig) {
        await this.SystemConfig.create({});
        console.log('✅ System configuration initialized');
      }
      
      // Check if shareholders exist
      const existingShareholders = await this.Shareholder.countDocuments();
      if (existingShareholders === 0) {
        await this.Shareholder.create([
          { name: "Nexus Equity", shares: 45, type: "Company" },
          { name: "Sarah Titan", shares: 25, type: "User" },
          { name: "Angel Group", shares: 30, type: "Company" }
        ]);
        console.log('✅ Default shareholders created');
      }
      
      // Check if integrations exist
      const existingIntegrations = await this.Integration.countDocuments();
      if (existingIntegrations === 0) {
        await this.Integration.create([
          { name: 'Monnify', type: 'Payments', provider: 'Monnify', status: 'Connected' },
          { name: 'SendGrid', type: 'Email', provider: 'SendGrid', status: 'Active' },
          { name: 'Twilio', type: 'SMS', provider: 'Twilio', status: 'Online' }
        ]);
        console.log('✅ Default integrations created');
      }
      
      // Check if nodes exist
      const existingNodes = await this.Node.countDocuments();
      if (existingNodes === 0) {
        await this.Node.create([
          { name: 'Node_US_01', region: 'US', status: 'online', latency: 12 },
          { name: 'Node_EU_02', region: 'EU', status: 'online', latency: 25 },
          { name: 'Node_AS_01', region: 'AS', status: 'online', latency: 45 }
        ]);
        console.log('✅ Default nodes created');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize defaults:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new TitanOmegaController();
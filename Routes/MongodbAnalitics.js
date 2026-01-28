const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const MongoUltimateAnalytics = require('../Models/MongoDbAnaltytics');

router.get('/', async (req, res) => {
  try {
    const admin = mongoose.connection.db.admin();
    
    // Run serverStatus for core metrics
    const s = await admin.serverStatus();

    const data = {
      process: { uptime: s.uptime, version: s.version, pid: s.pid },
      memory: { 
        resident: s.mem.resident, 
        virtual: s.mem.virtual, 
        page_faults: s.extra_info.page_faults 
      },
      connections: {
        current: s.connections.current,
        available: s.connections.available,
        active: s.connections.active,
        totalCreated: s.connections.totalCreated,
        rejected: s.connections.rejected || 0
      },
      globalLock: {
        currentQueue: s.globalLock.currentQueue
      },
      storageEngine: {
        cache: {
          capacityBytes: s.wiredTiger?.cache?.['maximum bytes configured'],
          bytesInCache: s.wiredTiger?.cache?.['bytes currently in the cache'],
          dirtyBytes: s.wiredTiger?.cache?.['tracked dirty bytes in the cache'],
          readIntoCache: s.wiredTiger?.cache?.['pages read into cache'],
          writtenFromCache: s.wiredTiger?.cache?.['pages written from cache']
        },
        tickets: {
          readAvailable: s.wiredTiger?.concurrentTransactions?.read?.available,
          writeAvailable: s.wiredTiger?.concurrentTransactions?.write?.available
        }
      },
      latencies: {
        reads: s.opLatencies?.reads,
        writes: s.opLatencies?.writes,
        commands: s.opLatencies?.commands
      },
      ops: s.opcounters,
      network: {
        bytesIn: s.network.bytesIn,
        bytesOut: s.network.bytesOut,
        numRequests: s.network.numRequests
      },
      asserts: s.asserts
    };

    const snapshot = await MongoUltimateAnalytics.create(data);

    res.json({
      success: true,
      message: "Comprehensive health snapshot archived.",
      snapshot
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
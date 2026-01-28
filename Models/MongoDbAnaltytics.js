const mongoose = require('mongoose');

const MongoUltimateAnalyticsSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },

  // --- Process & Performance Pillars ---
  process: {
    uptime: Number,       // Seconds since last restart
    version: String,      // DB Version
    pid: Number,          // Process ID
  },

  // --- Memory (The "Is it Swapping?" check) ---
  memory: {
    resident: Number,     // Physical RAM (MB)
    virtual: Number,      // Total address space (MB)
    page_faults: Number,  // Disk swaps (Critical for I/O Wait)
  },

  // --- Connections & Queues (The "Traffic Jam" check) ---
  connections: {
    current: Number,
    available: Number,
    active: Number,       // Connections currently doing work
    totalCreated: Number,
    rejected: Number,     // Connections denied (Max limit reached)
  },
  globalLock: {
    currentQueue: {
      total: Number,      // Total ops waiting for a lock
      readers: Number,
      writers: Number
    }
  },

  // --- WiredTiger (The "Engine" health) ---
  storageEngine: {
    cache: {
      capacityBytes: Number,
      bytesInCache: Number,
      dirtyBytes: Number, // Data waiting to be flushed to disk
      readIntoCache: Number,
      writtenFromCache: Number
    },
    tickets: {
      readAvailable: Number,  // If 0, reads are queuing (I/O Bottleneck)
      writeAvailable: Number, // If 0, writes are queuing
    }
  },

  // --- Operation Latency (Actual Response Speeds in microseconds) ---
  latencies: {
    reads: { ops: Number, latency: Number },
    writes: { ops: Number, latency: Number },
    commands: { ops: Number, latency: Number }
  },

  // --- Throughput & Network ---
  ops: {
    insert: Number,
    query: Number,
    update: Number,
    delete: Number,
    getmore: Number,
    command: Number
  },
  network: {
    bytesIn: Number,
    bytesOut: Number,
    numRequests: Number
  },

  // --- Errors & Asserts ---
  asserts: {
    regular: Number,
    warning: Number,
    msg: Number,
    user: Number, // Errors caused by users (bad queries/auth)
  }
}, { timeseries: { timeField: 'timestamp', granularity: 'minutes' } });

const MongoUltimateAnalytics = mongoose.model('MongoUltimateAnalytics', MongoUltimateAnalyticsSchema);
module.exports = MongoUltimateAnalytics;
/**
 * Cryptique Analytics API Server Cluster Setup
 * 
 * This module sets up a Node.js cluster for horizontal scaling across CPU cores.
 * Each worker process runs an instance of the Express server.
 */

const cluster = require('cluster');
const os = require('os');
const path = require('path');
const { getConfig } = require('./config/architecture');

// Get architecture configuration
const config = getConfig();
const maxWorkers = config.loadBalancing.maxWorkers;

// Current worker count
let workerCount = 0;

// Store worker information
const workers = new Map();

/**
 * Start a worker process
 * @returns {Object} - Worker process
 */
function startWorker() {
  const worker = cluster.fork();
  
  // Store worker info
  workers.set(worker.id, {
    id: worker.id,
    pid: worker.process.pid,
    startTime: Date.now(),
    restarts: 0
  });
  
  console.log(`Worker ${worker.id} started (PID: ${worker.process.pid})`);
  
  return worker;
}

/**
 * Handle worker exit and restart if needed
 * @param {Object} worker - Worker that exited
 * @param {number} code - Exit code
 * @param {string} signal - Signal that caused exit
 */
function handleWorkerExit(worker, code, signal) {
  const workerInfo = workers.get(worker.id);
  
  if (workerInfo) {
    const uptime = Date.now() - workerInfo.startTime;
    console.log(`Worker ${worker.id} (PID: ${worker.process.pid}) died with code ${code} and signal ${signal || 'none'} after ${Math.round(uptime / 1000)}s`);
    
    // Remove worker from tracking
    workers.delete(worker.id);
    workerCount--;
    
    // Restart worker if it died unexpectedly
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      console.log(`Restarting worker ${worker.id}...`);
      
      // Add a slight delay to prevent rapid restarts
      setTimeout(() => {
        const newWorker = startWorker();
        workerCount++;
        
        // Track restart count
        if (workerInfo) {
          const newWorkerInfo = workers.get(newWorker.id);
          if (newWorkerInfo) {
            newWorkerInfo.restarts = workerInfo.restarts + 1;
          }
        }
      }, 1000);
    }
  }
}

/**
 * Get cluster status information
 * @returns {Object} - Cluster status
 */
function getClusterStatus() {
  return {
    workers: Array.from(workers.values()),
    totalWorkers: workerCount,
    maxWorkers,
    master: {
      pid: process.pid,
      uptime: Math.round(process.uptime()),
      memoryUsage: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    }
  };
}

// Only run cluster setup in production or if explicitly enabled
if (
  process.env.NODE_ENV === 'production' ||
  process.env.ENABLE_CLUSTERING === 'true'
) {
  // Master process - responsible for spawning workers
  if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    const actualWorkers = Math.min(numCPUs, maxWorkers);
    
    console.log(`Master cluster setting up ${actualWorkers} workers (max: ${maxWorkers}, available CPUs: ${numCPUs})`);
    
    // Create workers
    for (let i = 0; i < actualWorkers; i++) {
      startWorker();
      workerCount++;
    }
    
    // Handle worker exit
    cluster.on('exit', handleWorkerExit);
    
    // Handle messages from workers
    Object.values(cluster.workers).forEach(worker => {
      worker.on('message', message => {
        if (message.cmd === 'GET_STATUS') {
          worker.send({ 
            cmd: 'STATUS_REPORT', 
            data: getClusterStatus() 
          });
        }
      });
    });
    
    // Log status periodically
    setInterval(() => {
      const status = getClusterStatus();
      console.log(`Cluster status: ${status.totalWorkers}/${status.maxWorkers} workers running`);
    }, 5 * 60 * 1000); // Every 5 minutes
    
    console.log(`Master PID: ${process.pid}`);
  } else {
    // Worker process - run the actual server
    console.log(`Worker ${process.pid} started`);
    
    // Load the server
    require('./index');
    
    // Report to master periodically
    setInterval(() => {
      if (process.connected) {
        process.send({ 
          cmd: 'HEARTBEAT',
          pid: process.pid,
          memoryUsage: process.memoryUsage()
        });
      }
    }, 30 * 1000); // Every 30 seconds
  }
} else {
  // Development mode - no clustering
  console.log('Running in single-process mode (clustering disabled)');
  require('./index');
}

// Export cluster functions for testing and management
module.exports = {
  getClusterStatus,
  startWorker
}; 
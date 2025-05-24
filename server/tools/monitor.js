/**
 * Server Monitor Tool
 * 
 * A simple tool for monitoring the health and status of the server cluster.
 * This can be run independently to check on the server status without affecting
 * the main application.
 */

const axios = require('axios');
const Table = require('cli-table3');
const colors = require('colors/safe');
const os = require('os');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const config = {
  serverUrl: process.env.MONITOR_SERVER_URL || 'http://localhost:3001',
  refreshInterval: parseInt(process.env.MONITOR_REFRESH_INTERVAL || '5000', 10),
  apiKey: process.env.MONITOR_API_KEY,
  showMemory: process.env.MONITOR_SHOW_MEMORY !== 'false',
  showCircuits: process.env.MONITOR_SHOW_CIRCUITS !== 'false',
  showTasks: process.env.MONITOR_SHOW_TASKS !== 'false'
};

// API client
const api = axios.create({
  baseURL: config.serverUrl,
  timeout: 5000,
  headers: config.apiKey ? {
    'Authorization': `Bearer ${config.apiKey}`
  } : {}
});

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Bytes to format
 * @returns {string} - Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format uptime to human-readable string
 * @param {number} seconds - Seconds of uptime
 * @returns {string} - Formatted string
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Get health status from server
 * @returns {Promise<Object>} - Health status
 */
async function getHealthStatus() {
  try {
    const response = await api.get('/api/health');
    return response.data;
  } catch (error) {
    console.error('Error getting health status:', error.message);
    return { status: 'error', error: error.message };
  }
}

/**
 * Get architecture status from server
 * @returns {Promise<Object>} - Architecture status
 */
async function getArchitectureStatus() {
  try {
    const response = await api.get('/api/admin/architecture');
    return response.data;
  } catch (error) {
    console.error('Error getting architecture status:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get task metrics from server
 * @returns {Promise<Object>} - Task metrics
 */
async function getTaskMetrics() {
  try {
    const response = await api.get('/api/retention/metrics');
    return response.data;
  } catch (error) {
    console.error('Error getting task metrics:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get active tasks from server
 * @returns {Promise<Object>} - Active tasks
 */
async function getActiveTasks() {
  try {
    const response = await api.get('/api/retention/active-tasks');
    return response.data;
  } catch (error) {
    console.error('Error getting active tasks:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Display server information
 */
async function displayServerInfo() {
  console.clear();
  console.log(colors.bold.cyan('=== Cryptique Server Monitor ==='));
  console.log(`Server URL: ${colors.green(config.serverUrl)}`);
  console.log(`Local time: ${colors.yellow(new Date().toLocaleString())}`);
  console.log(`Monitor refresh: ${colors.yellow(config.refreshInterval / 1000)}s`);
  console.log('');
  
  // Get status information
  const [health, architecture, taskMetrics, activeTasks] = await Promise.all([
    getHealthStatus(),
    getArchitectureStatus(),
    config.showTasks ? getTaskMetrics() : { success: false },
    config.showTasks ? getActiveTasks() : { success: false }
  ]);
  
  // Display health status
  console.log(colors.bold.white('Server Health:'));
  if (health.status === 'ok') {
    console.log(colors.green('✓ Server is healthy'));
    console.log(`  • Uptime: ${colors.yellow(formatUptime(health.uptime))}`);
    console.log(`  • PID: ${health.pid}`);
    console.log(`  • Database: ${health.database === 'connected' ? colors.green('Connected') : colors.red('Disconnected')}`);
    
    if (health.worker) {
      console.log(`  • Worker: ${colors.cyan(`#${health.worker.id} (PID: ${health.worker.pid})`)}`);
    }
    
    if (config.showMemory && health.memory) {
      console.log('  • Memory usage:');
      console.log(`    - RSS: ${colors.yellow(formatBytes(health.memory.rss))}`);
      console.log(`    - Heap Total: ${colors.yellow(formatBytes(health.memory.heapTotal))}`);
      console.log(`    - Heap Used: ${colors.yellow(formatBytes(health.memory.heapUsed))}`);
      console.log(`    - External: ${colors.yellow(formatBytes(health.memory.external || 0))}`);
    }
  } else {
    console.log(colors.red('✗ Server is not healthy'));
    console.log(`  • Error: ${health.error || 'Unknown error'}`);
  }
  
  console.log('');
  
  // Display architecture status
  if (architecture.success) {
    console.log(colors.bold.white('Architecture Configuration:'));
    console.log(`  • Mode: ${colors.cyan(architecture.config.mode)}`);
    console.log(`  • Load Balancing: ${architecture.config.loadBalancing.enableStickySession ? 'Sticky Sessions' : 'Round Robin'}`);
    console.log(`  • Max Workers: ${colors.yellow(architecture.config.loadBalancing.maxWorkers)}`);
    console.log(`  • Circuit Breaker: ${architecture.config.circuitBreaker.enabled ? colors.green('Enabled') : colors.red('Disabled')}`);
    
    if (architecture.worker) {
      console.log(`  • Current Worker: ${colors.cyan(`#${architecture.worker.id} (PID: ${architecture.worker.pid})`)}`);
    }
    
    // Feature flags
    console.log('  • Features:');
    Object.entries(architecture.config.features).forEach(([name, enabled]) => {
      console.log(`    - ${name}: ${enabled ? colors.green('Enabled') : colors.red('Disabled')}`);
    });
  }
  
  console.log('');
  
  // Display circuit breaker status if available
  if (config.showCircuits && taskMetrics.success && taskMetrics.circuits) {
    console.log(colors.bold.white('Circuit Breaker Status:'));
    
    const circuitsTable = new Table({
      head: [
        colors.cyan('Name'),
        colors.cyan('State'),
        colors.cyan('Failures'),
        colors.cyan('Last Failure'),
        colors.cyan('Uptime')
      ],
      colWidths: [15, 12, 10, 25, 15]
    });
    
    Object.entries(taskMetrics.circuits).forEach(([name, circuit]) => {
      const state = circuit.state === 'closed' 
        ? colors.green(circuit.state)
        : circuit.state === 'open'
          ? colors.red(circuit.state)
          : colors.yellow(circuit.state);
      
      const lastFailure = circuit.lastFailureTime
        ? new Date(circuit.lastFailureTime).toLocaleString()
        : 'N/A';
      
      circuitsTable.push([
        name,
        state,
        circuit.failureCount,
        lastFailure,
        formatUptime(circuit.uptime / 1000)
      ]);
    });
    
    console.log(circuitsTable.toString());
    console.log('');
  }
  
  // Display task metrics if available
  if (config.showTasks && taskMetrics.success) {
    console.log(colors.bold.white('Task Metrics:'));
    console.log(`  • Tasks Scheduled: ${colors.yellow(taskMetrics.metrics.tasksScheduled)}`);
    console.log(`  • Tasks Executed: ${colors.yellow(taskMetrics.metrics.tasksExecuted)}`);
    console.log(`  • Tasks Succeeded: ${colors.green(taskMetrics.metrics.tasksSucceeded)}`);
    console.log(`  • Tasks Failed: ${colors.red(taskMetrics.metrics.tasksFailed)}`);
    console.log(`  • Active Jobs: ${colors.cyan(taskMetrics.metrics.activeJobs)}`);
    console.log(`  • Distributed Mode: ${taskMetrics.metrics.distributed ? colors.green('Yes') : colors.yellow('No')}`);
    
    if (activeTasks.success && activeTasks.tasks.length > 0) {
      console.log('');
      console.log(colors.bold.white('Active Tasks:'));
      
      const tasksTable = new Table({
        head: [
          colors.cyan('ID'),
          colors.cyan('Task'),
          colors.cyan('Status'),
          colors.cyan('Started'),
          colors.cyan('Duration')
        ],
        colWidths: [10, 25, 10, 25, 15]
      });
      
      activeTasks.tasks.forEach(task => {
        const status = task.status === 'completed'
          ? colors.green(task.status)
          : task.status === 'failed'
            ? colors.red(task.status)
            : colors.yellow(task.status);
        
        const startTime = new Date(task.startTime).toLocaleString();
        const duration = task.duration ? `${(task.duration / 1000).toFixed(2)}s` : 'In progress';
        
        tasksTable.push([
          task.id.slice(0, 8),
          task.task.type,
          status,
          startTime,
          duration
        ]);
      });
      
      console.log(tasksTable.toString());
    }
  }
  
  console.log('');
  console.log(colors.gray('Press Ctrl+C to exit'));
}

// Run monitor with interval
async function runMonitor() {
  try {
    await displayServerInfo();
    
    // Set up interval for refresh
    const intervalId = setInterval(async () => {
      try {
        await displayServerInfo();
      } catch (error) {
        console.error('Error refreshing display:', error);
      }
    }, config.refreshInterval);
    
    // Handle exit
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log('\nMonitor stopped');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting monitor:', error);
    process.exit(1);
  }
}

// Start the monitor
runMonitor().catch(console.error); 
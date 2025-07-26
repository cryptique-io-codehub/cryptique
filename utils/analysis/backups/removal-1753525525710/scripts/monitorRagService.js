const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const Table = require('cli-table3');
const chalk = require('chalk');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const MONITOR_INTERVAL = process.env.MONITOR_INTERVAL || 30000; // 30 seconds

// Statistics
let stats = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    byEndpoint: {},
  },
  responseTimes: [],
  errors: [],
  lastUpdated: new Date(),
};

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const startTime = Date.now();
  
  try {
    const response = await axios({
      method,
      url,
      headers: { 'Content-Type': 'application/json' },
      data,
      validateStatus: () => true, // Don't throw on HTTP error status
    });
    
    const responseTime = Date.now() - startTime;
    
    // Update statistics
    stats.requests.total++;
    stats.requests.byEndpoint[endpoint] = (stats.requests.byEndpoint[endpoint] || 0) + 1;
    stats.responseTimes.push(responseTime);
    
    if (response.status >= 200 && response.status < 300) {
      stats.requests.success++;
    } else {
      stats.requests.errors++;
      stats.errors.push({
        time: new Date().toISOString(),
        endpoint,
        status: response.status,
        error: response.data?.error || 'Unknown error',
      });
    }
    
    return {
      status: response.status,
      data: response.data,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    stats.requests.total++;
    stats.requests.errors++;
    stats.errors.push({
      time: new Date().toISOString(),
      endpoint,
      error: error.message,
    });
    
    console.error(`API request failed: ${error.message}`);
    return {
      status: 500,
      data: { success: false, error: error.message },
      responseTime,
    };
  }
}

// Calculate statistics
function calculateStats() {
  const responseTimes = [...stats.responseTimes];
  const avgResponseTime = responseTimes.length > 0 
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) 
    : 0;
    
  const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
  const p95ResponseTime = sortedResponseTimes[p95Index] || 0;
  
  return {
    avgResponseTime,
    p95ResponseTime,
    successRate: stats.requests.total > 0 
      ? Math.round((stats.requests.success / stats.requests.total) * 100) 
      : 0,
  };
}

// Display dashboard
function displayDashboard() {
  console.clear();
  console.log(chalk.blue.bold('=== RAG Service Monitor ==='));
  console.log(`Last Updated: ${new Date().toLocaleTimeString()}`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('='.repeat(50));
  
  // Summary Table
  const summaryTable = new Table({
    head: ['Metric', 'Value'],
    colWidths: [30, 20],
    style: { head: ['cyan'] },
  });
  
  const { avgResponseTime, p95ResponseTime, successRate } = calculateStats();
  
  summaryTable.push(
    ['Total Requests', stats.requests.total],
    ['Successful Requests', stats.requests.success],
    ['Error Rate', `${100 - successRate}%`],
    ['Avg Response Time', `${avgResponseTime}ms`],
    ['P95 Response Time', `${p95ResponseTime}ms`],
    ['Uptime', formatUptime()]
  );
  
  console.log(chalk.cyan.bold('\nSummary:'));
  console.log(summaryTable.toString());
  
  // Endpoint Table
  const endpointTable = new Table({
    head: ['Endpoint', 'Requests'],
    colWidths: [40, 20],
    style: { head: ['cyan'] },
  });
  
  Object.entries(stats.requests.byEndpoint).forEach(([endpoint, count]) => {
    endpointTable.push([endpoint, count]);
  });
  
  if (Object.keys(stats.requests.byEndpoint).length > 0) {
    console.log(chalk.cyan.bold('\nRequests by Endpoint:'));
    console.log(endpointTable.toString());
  }
  
  // Recent Errors
  if (stats.errors.length > 0) {
    console.log(chalk.red.bold('\nRecent Errors:'));
    const recentErrors = stats.errors.slice(-5).reverse();
    
    recentErrors.forEach((error, index) => {
      console.log(chalk.red(`[${error.time}] ${error.endpoint || 'Unknown'}: ${error.status || ''} ${error.error || 'Unknown error'}`));
    });
    
    if (stats.errors.length > 5) {
      console.log(chalk.dim(`...and ${stats.errors.length - 5} more errors`));
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Press Ctrl+C to stop monitoring');
}

// Format uptime
function formatUptime() {
  const uptime = (Date.now() - stats.lastUpdated) / 1000;
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  return [
    hours > 0 ? `${hours}h` : '',
    minutes > 0 || hours > 0 ? `${minutes}m` : '',
    `${seconds}s`
  ].filter(Boolean).join(' ');
}

// Monitor the RAG service
async function monitorRagService() {
  console.log('Starting RAG Service Monitor...');
  console.log(`Monitoring ${API_BASE_URL} every ${MONITOR_INTERVAL / 1000} seconds`);
  console.log('Press Ctrl+C to stop monitoring\n');
  
  // Initial display
  displayDashboard();
  
  // Set up interval for monitoring
  const interval = setInterval(async () => {
    try {
      // Make a test request to the health endpoint
      await makeRequest('GET', '/api/health');
      
      // Update and display the dashboard
      displayDashboard();
    } catch (error) {
      console.error('Monitoring error:', error.message);
    }
  }, MONITOR_INTERVAL);
  
  // Handle process termination
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\nMonitoring stopped. Goodbye!');
    process.exit(0);
  });
}

// Run the monitor
monitorRagService().catch(error => {
  console.error('Failed to start monitor:', error);
  process.exit(1);
});

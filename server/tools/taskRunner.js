/**
 * Task Runner Tool
 * 
 * A utility for running and monitoring tasks with the task orchestrator.
 * This tool provides an easy way to run tasks and see their status.
 */

const path = require('path');
const dotenv = require('dotenv');
const si = require('systeminformation');
const { performance } = require('perf_hooks');
const { Table } = require('cli-table3');
const colors = require('colors/safe');
const readline = require('readline');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import task orchestrator
const { 
  taskOrchestrator, 
  TASK_TYPES, 
  PRIORITY, 
  IMPACT, 
  EXECUTOR_MODE 
} = require('../services/taskOrchestratorService');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Global variables for task tracking
const runningTasks = new Map();
let refreshIntervalId = null;
let displayMode = 'basic'; // 'basic' or 'detailed'

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
 * Format time to human-readable string
 * @param {number} ms - Time in milliseconds
 * @returns {string} - Formatted string
 */
function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Get task status color based on status
 * @param {string} status - Task status
 * @returns {Function} - Color function
 */
function getStatusColor(status) {
  switch (status) {
    case 'scheduled': return colors.yellow;
    case 'running': return colors.cyan;
    case 'completed': return colors.green;
    case 'failed': return colors.red;
    default: return colors.white;
  }
}

/**
 * Display task runner header
 */
function displayHeader() {
  console.log(colors.bold.cyan('=== Cryptique Task Runner ==='));
  console.log(`Mode: ${colors.yellow(displayMode)}`);
  console.log(`Time: ${colors.white(new Date().toLocaleString())}`);
  console.log('');
}

/**
 * Display task list
 * @param {Array} tasks - Tasks to display
 */
function displayTasks(tasks) {
  if (tasks.length === 0) {
    console.log(colors.yellow('No tasks to display'));
    return;
  }
  
  const table = new Table({
    head: [
      colors.cyan('ID'),
      colors.cyan('Type'),
      colors.cyan('Status'),
      colors.cyan('Started'),
      colors.cyan('Duration'),
      colors.cyan('Mode')
    ],
    colWidths: [10, 25, 12, 25, 15, 15]
  });
  
  tasks.forEach(task => {
    const statusColor = getStatusColor(task.status);
    const startTime = task.startedAt ? new Date(task.startedAt).toLocaleString() : 'Not started';
    const duration = task.duration ? formatTime(task.duration) : 'N/A';
    
    table.push([
      task.id.substring(0, 8),
      task.type,
      statusColor(task.status),
      startTime,
      duration,
      task.options?.executorMode || 'unknown'
    ]);
  });
  
  console.log(table.toString());
}

/**
 * Display system resources
 */
async function displayResources() {
  try {
    const [cpu, mem, load] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.currentLoad()
    ]);
    
    console.log(colors.bold.white('System Resources:'));
    console.log(`  • CPU: ${colors.yellow(cpu.currentLoad.toFixed(1))}%`);
    console.log(`  • Memory: ${colors.yellow((mem.used / mem.total * 100).toFixed(1))}% (${formatBytes(mem.used)} / ${formatBytes(mem.total)})`);
    console.log(`  • Load: ${colors.yellow(load.avgLoad.toFixed(2))}`);
    console.log('');
  } catch (error) {
    console.error('Error getting system resources:', error);
  }
}

/**
 * Display task details
 * @param {Object} task - Task to display details for
 */
function displayTaskDetails(task) {
  console.log(colors.bold.white(`Task Details (${task.id}):`));
  console.log(`  • Type: ${colors.cyan(task.type)}`);
  console.log(`  • Status: ${getStatusColor(task.status)(task.status)}`);
  console.log(`  • Created: ${new Date(task.createdAt).toLocaleString()}`);
  
  if (task.startedAt) {
    console.log(`  • Started: ${new Date(task.startedAt).toLocaleString()}`);
  }
  
  if (task.completedAt) {
    console.log(`  • Completed: ${new Date(task.completedAt).toLocaleString()}`);
  }
  
  if (task.duration) {
    console.log(`  • Duration: ${formatTime(task.duration)}`);
  }
  
  console.log(`  • Attempts: ${task.attempts}`);
  
  if (task.options) {
    console.log('  • Options:');
    console.log(`    - Priority: ${task.options.priority}`);
    console.log(`    - Impact: ${task.options.impact}`);
    console.log(`    - Mode: ${task.options.executorMode}`);
  }
  
  if (task.result) {
    console.log('  • Result:');
    
    if (task.result._metrics) {
      console.log('    - Metrics:');
      console.log(`      • Duration: ${formatTime(task.result._metrics.duration)}`);
      
      if (task.result._metrics.memoryUsage) {
        console.log('      • Memory Usage:');
        console.log(`        - Heap Used: ${task.result._metrics.memoryUsage.heapUsed}MB`);
        console.log(`        - Heap Total: ${task.result._metrics.memoryUsage.heapTotal}MB`);
      }
      
      if (task.result._metrics.batchSize) {
        console.log(`      • Batch Size: ${task.result._metrics.batchSize}`);
      }
      
      if (task.result._metrics.batchDelay) {
        console.log(`      • Batch Delay: ${task.result._metrics.batchDelay}ms`);
      }
    }
    
    // Show task-specific result information
    if (task.type === TASK_TYPES.MARK_EXPIRED_DATA && task.result.teamsProcessed !== undefined) {
      console.log(`    - Teams Processed: ${task.result.teamsProcessed}`);
      console.log(`    - Errors: ${task.result.errors?.length || 0}`);
    } else if (task.type === TASK_TYPES.DELETE_EXPIRED_DATA && task.result.deletedTeams) {
      console.log(`    - Teams Deleted: ${task.result.deletedTeams.length}`);
      console.log(`    - Errors: ${task.result.errors?.length || 0}`);
    }
  }
  
  if (task.error) {
    console.log('  • Error:');
    console.log(`    - Message: ${colors.red(task.error.message)}`);
  }
  
  console.log('');
}

/**
 * Refresh display
 */
async function refreshDisplay() {
  console.clear();
  displayHeader();
  
  // Get orchestrator metrics
  const metrics = taskOrchestrator.getMetrics();
  console.log(colors.bold.white('Orchestrator Metrics:'));
  console.log(`  • Tasks Scheduled: ${colors.yellow(metrics.tasksScheduled)}`);
  console.log(`  • Tasks Running: ${colors.cyan(metrics.runningTasks)}`);
  console.log(`  • Tasks Completed: ${colors.green(metrics.tasksCompleted)}`);
  console.log(`  • Tasks Failed: ${colors.red(metrics.tasksFailed)}`);
  console.log(`  • Mode: ${colors.white(metrics.mode)}`);
  console.log('');
  
  // Display resources
  await displayResources();
  
  // Get and display active tasks
  const activeTasks = taskOrchestrator.getActiveTasks();
  console.log(colors.bold.white(`Active Tasks (${activeTasks.length}):`));
  displayTasks(activeTasks);
  console.log('');
  
  // Display tracked tasks
  if (runningTasks.size > 0) {
    console.log(colors.bold.white(`Tracked Tasks (${runningTasks.size}):`));
    
    // Get latest status for all tracked tasks
    const trackedTasks = [];
    for (const [taskId, task] of runningTasks.entries()) {
      const updatedTask = await taskOrchestrator.getTaskStatus(taskId) || task;
      runningTasks.set(taskId, updatedTask);
      trackedTasks.push(updatedTask);
    }
    
    // Display tasks
    displayTasks(trackedTasks);
    console.log('');
    
    // Display detailed information if in detailed mode
    if (displayMode === 'detailed' && trackedTasks.length > 0) {
      trackedTasks.forEach(task => {
        displayTaskDetails(task);
      });
    }
  }
  
  console.log(colors.gray('Commands: [r] Run Task, [m] Toggle Mode, [c] Clear Tracked, [q] Quit'));
}

/**
 * Start task monitoring
 */
function startMonitoring() {
  // Set up interval for refreshing display
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
  }
  
  refreshIntervalId = setInterval(async () => {
    await refreshDisplay();
  }, 3000); // Refresh every 3 seconds
}

/**
 * Run a task
 * @param {string} taskType - Type of task to run
 * @param {Object} taskData - Task data
 * @param {Object} options - Task options
 */
async function runTask(taskType, taskData = {}, options = {}) {
  console.log(`Scheduling task ${taskType}...`);
  
  try {
    const task = await taskOrchestrator.scheduleTask(taskType, taskData, options);
    console.log(`Task scheduled with ID: ${task.taskId}`);
    
    // Track this task
    runningTasks.set(task.taskId, {
      id: task.taskId,
      type: taskType,
      status: 'scheduled',
      createdAt: Date.now(),
      options
    });
    
    return task;
  } catch (error) {
    console.error(`Error scheduling task: ${error.message}`);
    throw error;
  }
}

/**
 * Display task menu and get selection
 */
function displayTaskMenu() {
  console.log(colors.bold.white('Available Tasks:'));
  console.log(`  ${colors.yellow('1')} - Mark Expired Data`);
  console.log(`  ${colors.yellow('2')} - Delete Expired Data`);
  console.log(`  ${colors.yellow('3')} - Both Tasks Sequentially`);
  console.log(`  ${colors.yellow('4')} - Both Tasks in Parallel`);
  console.log(`  ${colors.yellow('0')} - Cancel`);
  
  rl.question(colors.cyan('Select a task to run: '), async (answer) => {
    switch (answer.trim()) {
      case '1':
        await runMarkExpiredDataTask();
        break;
      case '2':
        await runDeleteExpiredDataTask();
        break;
      case '3':
        await runSequentialTasks();
        break;
      case '4':
        await runParallelTasks();
        break;
      case '0':
        console.log('Task selection cancelled');
        break;
      default:
        console.log('Invalid selection');
    }
    
    // Refresh display after task selection
    await refreshDisplay();
  });
}

/**
 * Run mark expired data task
 */
async function runMarkExpiredDataTask() {
  console.log('Running Mark Expired Data task...');
  
  // Prompt for executor mode
  rl.question(colors.cyan('Select executor mode (1=In Process, 2=Child Process, 3=Microservice): '), async (answer) => {
    let executorMode = EXECUTOR_MODE.IN_PROCESS;
    
    switch (answer.trim()) {
      case '1':
        executorMode = EXECUTOR_MODE.IN_PROCESS;
        break;
      case '2':
        executorMode = EXECUTOR_MODE.CHILD_PROCESS;
        break;
      case '3':
        executorMode = EXECUTOR_MODE.MICROSERVICE;
        break;
    }
    
    try {
      const task = await taskOrchestrator.scheduleMarkExpiredData({
        executorMode,
        priority: PRIORITY.NORMAL,
        impact: IMPACT.LOW
      });
      
      // Track this task
      runningTasks.set(task.taskId, {
        id: task.taskId,
        type: TASK_TYPES.MARK_EXPIRED_DATA,
        status: 'scheduled',
        createdAt: Date.now(),
        options: { executorMode }
      });
      
      console.log(`Task scheduled with ID: ${task.taskId}`);
    } catch (error) {
      console.error(`Error scheduling task: ${error.message}`);
    }
  });
}

/**
 * Run delete expired data task
 */
async function runDeleteExpiredDataTask() {
  console.log('Running Delete Expired Data task...');
  
  // Prompt for executor mode
  rl.question(colors.cyan('Select executor mode (1=In Process, 2=Child Process, 3=Microservice): '), async (answer) => {
    let executorMode = EXECUTOR_MODE.IN_PROCESS;
    
    switch (answer.trim()) {
      case '1':
        executorMode = EXECUTOR_MODE.IN_PROCESS;
        break;
      case '2':
        executorMode = EXECUTOR_MODE.CHILD_PROCESS;
        break;
      case '3':
        executorMode = EXECUTOR_MODE.MICROSERVICE;
        break;
    }
    
    try {
      const task = await taskOrchestrator.scheduleDeleteExpiredData({
        executorMode,
        priority: PRIORITY.HIGH,
        impact: IMPACT.MODERATE
      });
      
      // Track this task
      runningTasks.set(task.taskId, {
        id: task.taskId,
        type: TASK_TYPES.DELETE_EXPIRED_DATA,
        status: 'scheduled',
        createdAt: Date.now(),
        options: { executorMode }
      });
      
      console.log(`Task scheduled with ID: ${task.taskId}`);
    } catch (error) {
      console.error(`Error scheduling task: ${error.message}`);
    }
  });
}

/**
 * Run sequential tasks
 */
async function runSequentialTasks() {
  console.log('Running tasks sequentially...');
  
  try {
    // Run mark expired data task first
    const markTask = await taskOrchestrator.scheduleMarkExpiredData({
      executorMode: EXECUTOR_MODE.CHILD_PROCESS
    });
    
    // Track this task
    runningTasks.set(markTask.taskId, {
      id: markTask.taskId,
      type: TASK_TYPES.MARK_EXPIRED_DATA,
      status: 'scheduled',
      createdAt: Date.now(),
      options: { executorMode: EXECUTOR_MODE.CHILD_PROCESS }
    });
    
    console.log(`Mark task scheduled with ID: ${markTask.taskId}`);
    
    // Schedule delete task with delay (will run after mark task)
    const deleteTask = await taskOrchestrator.scheduleDeleteExpiredData({
      executorMode: EXECUTOR_MODE.CHILD_PROCESS,
      delay: 1000 // 1 second delay to ensure it runs after mark task
    });
    
    // Track this task
    runningTasks.set(deleteTask.taskId, {
      id: deleteTask.taskId,
      type: TASK_TYPES.DELETE_EXPIRED_DATA,
      status: 'scheduled',
      createdAt: Date.now(),
      options: { executorMode: EXECUTOR_MODE.CHILD_PROCESS }
    });
    
    console.log(`Delete task scheduled with ID: ${deleteTask.taskId}`);
  } catch (error) {
    console.error(`Error scheduling sequential tasks: ${error.message}`);
  }
}

/**
 * Run parallel tasks
 */
async function runParallelTasks() {
  console.log('Running tasks in parallel...');
  
  try {
    // Run both tasks simultaneously
    const [markTask, deleteTask] = await Promise.all([
      taskOrchestrator.scheduleMarkExpiredData({
        executorMode: EXECUTOR_MODE.CHILD_PROCESS
      }),
      taskOrchestrator.scheduleDeleteExpiredData({
        executorMode: EXECUTOR_MODE.CHILD_PROCESS
      })
    ]);
    
    // Track these tasks
    runningTasks.set(markTask.taskId, {
      id: markTask.taskId,
      type: TASK_TYPES.MARK_EXPIRED_DATA,
      status: 'scheduled',
      createdAt: Date.now(),
      options: { executorMode: EXECUTOR_MODE.CHILD_PROCESS }
    });
    
    runningTasks.set(deleteTask.taskId, {
      id: deleteTask.taskId,
      type: TASK_TYPES.DELETE_EXPIRED_DATA,
      status: 'scheduled',
      createdAt: Date.now(),
      options: { executorMode: EXECUTOR_MODE.CHILD_PROCESS }
    });
    
    console.log(`Mark task scheduled with ID: ${markTask.taskId}`);
    console.log(`Delete task scheduled with ID: ${deleteTask.taskId}`);
  } catch (error) {
    console.error(`Error scheduling parallel tasks: ${error.message}`);
  }
}

/**
 * Initialize the task runner
 */
async function initTaskRunner() {
  // Initial display
  await refreshDisplay();
  
  // Start monitoring
  startMonitoring();
  
  // Set up keyboard input handling
  process.stdin.setRawMode(true);
  process.stdin.on('data', async (key) => {
    const keyCode = key.toString();
    
    // Handle key presses
    switch (keyCode) {
      case 'r':
        // Run task
        clearInterval(refreshIntervalId);
        await displayTaskMenu();
        startMonitoring();
        break;
      case 'm':
        // Toggle display mode
        displayMode = displayMode === 'basic' ? 'detailed' : 'basic';
        console.log(`Display mode set to: ${displayMode}`);
        await refreshDisplay();
        break;
      case 'c':
        // Clear tracked tasks
        runningTasks.clear();
        console.log('Tracked tasks cleared');
        await refreshDisplay();
        break;
      case 'q':
      case '\u0003': // Ctrl+C
        // Quit
        clearInterval(refreshIntervalId);
        rl.close();
        console.log('\nTask runner stopped');
        process.exit(0);
        break;
    }
  });
  
  console.log('Task runner initialized');
}

// Start the task runner
initTaskRunner().catch(error => {
  console.error('Error initializing task runner:', error);
  process.exit(1);
}); 
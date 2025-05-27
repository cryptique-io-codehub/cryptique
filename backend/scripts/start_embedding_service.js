const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Path to Python executable - use python or python3 depending on system
const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

// Path to the Python service directory
const pythonServiceDir = path.join(__dirname, '..', 'python');
const startScriptPath = path.join(pythonServiceDir, 'start_service.py');

// Check if the service directory exists
if (!fs.existsSync(pythonServiceDir)) {
  console.error(`Python service directory not found at: ${pythonServiceDir}`);
  process.exit(1);
}

// Check if the start script exists
if (!fs.existsSync(startScriptPath)) {
  console.error(`Python start script not found at: ${startScriptPath}`);
  process.exit(1);
}

console.log('Starting embedding service...');

// Spawn Python process
const pythonProcess = spawn(pythonCommand, [startScriptPath], {
  cwd: pythonServiceDir,
  stdio: 'inherit', // Share stdio with parent process
  env: {
    ...process.env,
    PYTHONUNBUFFERED: '1' // Ensure Python output is not buffered
  }
});

// Handle process events
pythonProcess.on('error', (err) => {
  console.error('Failed to start embedding service:', err);
});

pythonProcess.on('close', (code) => {
  console.log(`Embedding service exited with code ${code}`);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('Stopping embedding service...');
  pythonProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Stopping embedding service...');
  pythonProcess.kill('SIGTERM');
});

console.log('Embedding service is running. Press Ctrl+C to stop.'); 
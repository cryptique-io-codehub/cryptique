module.exports = {
  apps: [
    {
      // Main backend application
      name: 'cryptique-backend',
      script: 'index.js',
      instances: process.env.PM2_INSTANCES || 'max', // Use all CPU cores
      exec_mode: 'cluster',
      
      // Restart settings
      autorestart: true,
      watch: false, // Disable in production for performance
      max_memory_restart: '1G',
      restart_delay: 4000,
      
      // Environment settings
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        LOG_LEVEL: 'debug'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        LOG_LEVEL: 'info',
        ENABLE_CONSOLE_LOGS: 'false'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        LOG_LEVEL: 'debug',
        ENABLE_CONSOLE_LOGS: 'true'
      },
      
      // Logging
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Performance monitoring
      monitoring: true,
      pmx: true,
      
      // Process management
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health check
      health_check_grace_period: 3000,
      
      // Advanced settings
      node_args: '--max-old-space-size=2048', // 2GB heap limit
      
      // Graceful shutdown
      shutdown_with_message: true,
      wait_ready: true,
      
      // Process title
      instance_var: 'INSTANCE_ID'
    },
    
    // RAG Processing Worker (separate process for heavy RAG operations)
    {
      name: 'cryptique-rag-worker',
      script: 'workers/ragWorker.js',
      instances: 2, // Limited instances for RAG processing
      exec_mode: 'cluster',
      
      // Restart settings
      autorestart: true,
      watch: false,
      max_memory_restart: '2G', // Higher memory limit for RAG processing
      restart_delay: 5000,
      
      // Environment settings
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'rag',
        LOG_LEVEL: 'debug'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'rag',
        LOG_LEVEL: 'info'
      },
      
      // Logging
      log_file: './logs/rag-worker-combined.log',
      out_file: './logs/rag-worker-out.log',
      error_file: './logs/rag-worker-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Performance settings
      node_args: '--max-old-space-size=4096', // 4GB heap limit for RAG
      
      // Health check
      health_check_grace_period: 5000,
      
      // Graceful shutdown
      kill_timeout: 10000, // Longer timeout for RAG operations
      shutdown_with_message: true,
      wait_ready: true
    },
    
    // Monitoring Dashboard (separate lightweight process)
    {
      name: 'cryptique-monitor',
      script: 'workers/monitorWorker.js',
      instances: 1, // Single instance for monitoring
      exec_mode: 'fork',
      
      // Restart settings
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 2000,
      
      // Environment settings
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'monitor',
        LOG_LEVEL: 'info'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'monitor',
        LOG_LEVEL: 'warn'
      },
      
      // Logging
      log_file: './logs/monitor-combined.log',
      out_file: './logs/monitor-out.log',
      error_file: './logs/monitor-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Performance settings
      node_args: '--max-old-space-size=512',
      
      // Health check
      health_check_grace_period: 2000,
      
      // Graceful shutdown
      kill_timeout: 3000,
      shutdown_with_message: true
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/cryptique.git',
      path: '/var/www/cryptique-backend',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    },
    
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/cryptique.git',
      path: '/var/www/cryptique-backend-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  }
}; 
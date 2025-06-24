const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// Check if we're in a serverless environment (Vercel, Netlify, etc.)
const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Create logs directory only if not in serverless environment
const fs = require('fs');
let logsDir;
if (!isServerless) {
  logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create logs directory, using console logging only:', error.message);
    }
  }
}

// Custom format for production logs
const productionFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
);

// Custom format for development logs
const developmentFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'cryptique-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: []
});

// Production transports - only add file transports if not in serverless environment
if (process.env.NODE_ENV === 'production' && !isServerless && logsDir) {
  try {
    // Error logs
    logger.add(new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      auditFile: path.join(logsDir, 'error-audit.json'),
      zippedArchive: true
    }));

    // Combined logs
    logger.add(new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '30d',
      auditFile: path.join(logsDir, 'combined-audit.json'),
      zippedArchive: true
    }));

    // Performance logs
    logger.add(new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '7d',
      auditFile: path.join(logsDir, 'performance-audit.json'),
      zippedArchive: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format((info) => {
          // Only log performance-related messages
          if (info.type === 'performance' || info.performance) {
            return info;
          }
          return false;
        })()
      )
    }));

    // Security logs
    logger.add(new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '10m',
      maxFiles: '90d',
      auditFile: path.join(logsDir, 'security-audit.json'),
      zippedArchive: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format((info) => {
          // Only log security-related messages
          if (info.type === 'security' || info.security || info.level === 'warn' || info.level === 'error') {
            return info;
          }
          return false;
        })()
      )
    }));
  } catch (error) {
    console.warn('Could not set up file logging, using console only:', error.message);
  }
}

// Always add console transport for serverless environments or when file logging fails
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_CONSOLE_LOGS === 'true' || isServerless) {
  logger.add(new winston.transports.Console({
    handleExceptions: true,
    handleRejections: true
  }));
}

// Add file transport for development only if not serverless
if (process.env.NODE_ENV !== 'production' && !isServerless && logsDir) {
  try {
    logger.add(new winston.transports.File({
      filename: path.join(logsDir, 'development.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }));
  } catch (error) {
    console.warn('Could not set up development file logging:', error.message);
  }
}

// Helper methods for different log types
logger.logPerformance = (message, data = {}) => {
  logger.info(message, { type: 'performance', performance: true, ...data });
};

logger.logSecurity = (message, data = {}) => {
  logger.warn(message, { type: 'security', security: true, ...data });
};

logger.logRAG = (message, data = {}) => {
  logger.info(message, { type: 'rag', component: 'rag-system', ...data });
};

logger.logJob = (message, data = {}) => {
  logger.info(message, { type: 'job', component: 'job-processing', ...data });
};

logger.logAPI = (message, data = {}) => {
  logger.info(message, { type: 'api', component: 'api-request', ...data });
};

// Error handling
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down logger...');
  logger.end();
});

process.on('SIGTERM', () => {
  logger.info('Shutting down logger...');
  logger.end();
});

module.exports = logger; 
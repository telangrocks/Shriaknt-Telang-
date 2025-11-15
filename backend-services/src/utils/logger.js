const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist (with error handling)
const logsDir = path.join(__dirname, '../../logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  // If we can't create logs directory, log to console and continue
  // This prevents crashes in environments where file system access is restricted
  console.warn('[LOGGER] Warning: Could not create logs directory:', error.message);
  console.warn('[LOGGER] Logging will continue to console only');
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger with error handling for file transports
const transports = [
  // Always write to console (this is critical for container logs)
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat
  })
];

// Add file transports only if logs directory is accessible
try {
  if (fs.existsSync(logsDir)) {
    // Write all logs with level 'error' and below to error.log
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );
    // Write all logs to combined.log
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );
  }
} catch (error) {
  console.warn('[LOGGER] Warning: Could not set up file transports:', error.message);
}

// Create exception and rejection handlers
const exceptionHandlers = [
  // Always log exceptions to console
  new winston.transports.Console({
    format: logFormat
  })
];

const rejectionHandlers = [
  // Always log rejections to console
  new winston.transports.Console({
    format: logFormat
  })
];

// Add file handlers if logs directory exists
try {
  if (fs.existsSync(logsDir)) {
    exceptionHandlers.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'exceptions.log')
      })
    );
    rejectionHandlers.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'rejections.log')
      })
    );
  }
} catch (error) {
  console.warn('[LOGGER] Warning: Could not set up exception/rejection file handlers:', error.message);
}

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'cryptopulse-api' },
  transports: transports,
  exceptionHandlers: exceptionHandlers,
  rejectionHandlers: rejectionHandlers
});

module.exports = logger;


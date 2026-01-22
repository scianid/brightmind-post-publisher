/**
 * Simple logger utility for consistent logging
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const shouldLog = (level) => {
  if (process.env.NODE_ENV === 'production' && level === LOG_LEVELS.DEBUG) {
    return false;
  }
  return true;
};

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${level}] ${message} ${metaStr}`;
};

const logger = {
  error: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      console.error(formatMessage(LOG_LEVELS.ERROR, message, meta));
    }
  },
  
  warn: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn(formatMessage(LOG_LEVELS.WARN, message, meta));
    }
  },
  
  info: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log(formatMessage(LOG_LEVELS.INFO, message, meta));
    }
  },
  
  debug: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }
};

module.exports = logger;

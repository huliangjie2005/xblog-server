require('dotenv').config();
const { logger } = require('../utils/logger');

/**
 * JWT配置
 */
module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'xblog-test-secret-key-12345',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h'
};

// JWT配置已加载（静默模式）
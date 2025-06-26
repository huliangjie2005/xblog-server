const dbConfig = require('../config/db');
const { logger } = require('./logger');

// 直接使用config/db.js中的连接池和函数
const { pool, query, testConnection } = dbConfig;

module.exports = {
  pool,
  query,
  testConnection
}; 
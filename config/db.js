const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');
require('dotenv').config();

// 尝试导入缓存服务（如果可用）
let cacheService = null;
try {
  cacheService = require('../utils/cache').cacheService;
} catch (error) {
  logger.debug('缓存服务不可用，跳过缓存功能');
}

// 数据库配置信息（静默模式下不输出）

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root', // 添加默认密码
  database: process.env.DB_NAME || 'xblog',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4', // 支持完整的UTF-8字符集，包括表情符号
  // 移除无效的collation配置
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 设置连接字符集和排序规则
pool.on('connection', function(connection) {
  connection.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
});

// 优化后的查询函数
async function query(sql, params = [], options = {}) {
  const startTime = Date.now();
  let error = null;

  try {
    // 参数预处理
    if (params && params.length > 0) {
      params = params.map(param => {
        // 确保数字类型的参数是Number类型
        if (typeof param === 'string' && !isNaN(Number(param)) && param.trim() !== '') {
          return Number(param);
        }
        return param;
      });
    }

    // 只在开发环境且启用详细日志时记录查询
    if (process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true') {
      logger.debug(`执行SQL查询: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
      if (params && params.length > 0) {
        logger.debug(`参数: ${JSON.stringify(params)}`);
      }
    }

    // 执行查询
    const [rows] = await pool.query(sql, params);

    // 只记录慢查询
    const duration = Date.now() - startTime;
    if (duration > 2000) { // 提高阈值到2秒
      logger.warn(`慢查询检测: ${sql.substring(0, 50)}... - ${duration}ms`);
    }

    return rows;

  } catch (err) {
    error = err;
    const duration = Date.now() - startTime;

    logger.error(`SQL执行错误: ${err.message}`);
    logger.error(`SQL语句: ${sql}`);
    logger.error(`SQL参数: ${JSON.stringify(params)}`);
    logger.error(`执行时间: ${duration}ms`);

    // 对于某些错误，尝试重试
    if (isRetryableError(err) && !options.noRetry) {
      logger.info('尝试重试查询...');
      await delay(1000);
      return query(sql, params, { ...options, noRetry: true });
    }

    throw err;
  }
}

// 判断是否为可重试的错误
function isRetryableError(error) {
  const retryableErrors = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ER_LOCK_WAIT_TIMEOUT'
  ];

  return retryableErrors.some(code =>
    error.code === code || error.message.includes(code)
  );
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 带缓存的查询函数
async function queryWithCache(sql, params = [], options = {}) {
  const {
    cache = false,
    cacheTTL = 300,
    cacheKey = null
  } = options;

  // 如果不启用缓存或缓存服务不可用，直接查询
  if (!cache || !cacheService) {
    return query(sql, params, options);
  }

  // 生成缓存键
  const key = cacheKey || generateCacheKey(sql, params);

  // 尝试从缓存获取
  try {
    const cachedResult = await cacheService.get(key);
    if (cachedResult !== null) {
      logger.debug(`数据库查询缓存命中: ${key}`);
      return cachedResult;
    }
  } catch (error) {
    logger.warn(`缓存获取失败: ${error.message}`);
  }

  // 缓存未命中，执行查询
  const result = await query(sql, params, options);

  // 将结果存入缓存
  try {
    await cacheService.set(key, result, cacheTTL);
    logger.debug(`查询结果已缓存: ${key}`);
  } catch (error) {
    logger.warn(`缓存设置失败: ${error.message}`);
  }

  return result;
}

// 生成缓存键
function generateCacheKey(sql, params) {
  const crypto = require('crypto');
  const sqlHash = crypto.createHash('md5').update(sql).digest('hex').substring(0, 8);
  const paramsHash = crypto.createHash('md5').update(JSON.stringify(params)).digest('hex').substring(0, 8);
  return `db:${sqlHash}:${paramsHash}`;
}

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    
    // 测试字符集配置
    const [charsetRows] = await connection.query('SHOW VARIABLES LIKE "character_set_%"');
    logger.info('数据库字符集配置:');
    charsetRows.forEach(row => {
      logger.info(`${row.Variable_name}: ${row.Value}`);
    });
    
    // 测试排序规则配置
    const [collationRows] = await connection.query('SHOW VARIABLES LIKE "collation_%"');
    logger.info('数据库排序规则配置:');
    collationRows.forEach(row => {
      logger.info(`${row.Variable_name}: ${row.Value}`);
    });
    
    connection.release();
    // 静默模式，不输出连接成功信息
    global.dbConnected = true;
    return true;
  } catch (error) {
    logger.error(`数据库连接失败: ${error.message}`);
    global.dbConnected = false;
    return false;
  }
}

module.exports = {
  pool,
  query,
  queryWithCache,
  testConnection
};
/**
 * 令牌黑名单服务
 * 用于处理令牌失效和登出功能
 */
const { query } = require('../config/db');
const { logger } = require('../utils/logger');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

// 内存缓存，用于提高性能
const tokenBlacklist = new Set();

/**
 * 将令牌添加到黑名单
 * @param {string} token - JWT令牌
 * @param {string} reason - 失效原因
 * @returns {Promise<boolean>} 是否成功
 */
async function addToBlacklist(token, reason = 'user_logout') {
  try {
    // 解析令牌以获取过期时间
    const decoded = jwt.verify(token, jwtConfig.JWT_SECRET, { ignoreExpiration: true });
    const expiryDate = new Date(decoded.exp * 1000); // 转换为毫秒
    
    // 将令牌添加到数据库
    const sql = `
      INSERT INTO token_blacklist (token, user_id, expiry_date, reason, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    
    await query(sql, [token, decoded.id, expiryDate, reason]);
    
    // 添加到内存缓存
    tokenBlacklist.add(token);
    
    return true;
  } catch (error) {
    logger.error(`将令牌添加到黑名单失败: ${error.message}`);
    return false;
  }
}

/**
 * 检查令牌是否在黑名单中
 * @param {string} token - JWT令牌
 * @returns {Promise<boolean>} 是否在黑名单中
 */
async function isBlacklisted(token) {
  try {
    // 首先检查内存缓存
    if (tokenBlacklist.has(token)) {
      return true;
    }
    
    // 如果不在内存缓存中，检查数据库
    const sql = 'SELECT id FROM token_blacklist WHERE token = ?';
    const result = await query(sql, [token]);
    
    const isInBlacklist = result && result.length > 0;
    
    // 如果在数据库中找到，添加到内存缓存
    if (isInBlacklist) {
      tokenBlacklist.add(token);
    }
    
    return isInBlacklist;
  } catch (error) {
    logger.error(`检查令牌黑名单失败: ${error.message}`);
    return false;
  }
}

/**
 * 清理过期的黑名单令牌
 * @returns {Promise<number>} 清理的令牌数量
 */
async function cleanupExpiredTokens() {
  try {
    // 删除过期的令牌
    const sql = 'DELETE FROM token_blacklist WHERE expiry_date < NOW()';
    const result = await query(sql);
    
    // 重新加载内存缓存
    await reloadBlacklist();
    
    return result.affectedRows;
  } catch (error) {
    logger.error(`清理过期令牌失败: ${error.message}`);
    return 0;
  }
}

/**
 * 重新加载黑名单到内存
 * @returns {Promise<void>}
 */
async function reloadBlacklist() {
  try {
    // 清空当前内存缓存
    tokenBlacklist.clear();
    
    // 加载所有未过期的令牌
    const sql = 'SELECT token FROM token_blacklist WHERE expiry_date > NOW()';
    const tokens = await query(sql);
    
    // 添加到内存缓存
    tokens.forEach(row => tokenBlacklist.add(row.token));
    
    logger.info(`已重新加载令牌黑名单，共 ${tokenBlacklist.size} 个令牌`);
  } catch (error) {
    logger.error(`重新加载令牌黑名单失败: ${error.message}`);
  }
}

/**
 * 初始化令牌黑名单服务
 * @returns {Promise<void>}
 */
async function init() {
  try {
    logger.info('开始初始化令牌黑名单服务');
    
    // 检查表是否存在，如果不存在则创建
    const checkTableSql = `
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id BIGINT NOT NULL AUTO_INCREMENT,
        token VARCHAR(512) NOT NULL,
        user_id BIGINT NOT NULL,
        expiry_date DATETIME NOT NULL,
        reason VARCHAR(50) NOT NULL DEFAULT 'user_logout',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_token (token(255)),
        INDEX idx_expiry (expiry_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await query(checkTableSql);
    logger.info('令牌黑名单表已检查/创建');
    
    // 先检查是否可以访问表
    try {
      await query('SELECT 1 FROM token_blacklist LIMIT 1');
      logger.info('token_blacklist表存在且可访问');
      
      // 加载黑名单到内存
      await reloadBlacklist();
      
      // 清理过期令牌
      const cleanedCount = await cleanupExpiredTokens();
      logger.info(`已清理 ${cleanedCount} 个过期令牌`);
    } catch (error) {
      // 如果表不存在或无法访问，记录错误但不中断启动
      logger.warn(`无法访问token_blacklist表: ${error.message}`);
      logger.info('令牌黑名单将使用内存模式');
      logger.info('内存模拟Redis已启用');
      
      // 仍然可以使用内存中的集合
      tokenBlacklist.clear();
    }
    
    // 设置定期清理任务
    setInterval(async () => {
      try {
        const count = await cleanupExpiredTokens();
        logger.debug(`定期清理：已删除 ${count} 个过期令牌`);
      } catch (error) {
        logger.error(`定期清理令牌失败: ${error.message}`);
  }
    }, 24 * 60 * 60 * 1000); // 每24小时清理一次
    
    logger.info('令牌黑名单服务初始化完成');
  } catch (error) {
    // 记录错误但不抛出，以避免应用崩溃
    logger.error(`初始化令牌黑名单服务失败: ${error.message}`);
    logger.error(error.stack);
    logger.info('应用将继续运行，但令牌黑名单功能可能不可用');
  }
}

module.exports = {
  addToBlacklist,
  isBlacklisted,
  cleanupExpiredTokens,
  reloadBlacklist,
  init
}; 
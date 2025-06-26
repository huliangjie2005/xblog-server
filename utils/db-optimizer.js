/**
 * 数据库查询优化工具
 * 提供查询缓存、批量操作、连接池监控等功能
 * 
 * @author XBlog Team
 * @version 1.0.0
 */

const { query: originalQuery } = require('../config/db');
const { logger } = require('./logger');
const { cacheService } = require('./cache');
const { performanceMonitor } = require('../middlewares/performance-monitor');

class DatabaseOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.batchQueue = new Map();
    this.queryStats = new Map();
    this.dbMonitor = performanceMonitor.dbQueryMonitor();
  }

  /**
   * 优化后的查询函数
   * @param {string} sql - SQL语句
   * @param {Array} params - 查询参数
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 查询结果
   */
  async query(sql, params = [], options = {}) {
    const {
      cache = false,
      cacheTTL = 300,
      cacheKey = null,
      timeout = 30000,
      retries = 1
    } = options;

    const startInfo = this.dbMonitor.beforeQuery(sql, params);
    let result;
    let error = null;

    try {
      // 尝试从缓存获取
      if (cache) {
        const key = cacheKey || this.generateCacheKey(sql, params);
        result = await cacheService.get(key);
        if (result !== null) {
          logger.debug(`数据库查询缓存命中: ${key}`);
          this.recordQueryStats(sql, 0, true);
          return result;
        }
      }

      // 执行查询
      result = await this.executeWithRetry(sql, params, retries, timeout);

      // 存入缓存
      if (cache && result) {
        const key = cacheKey || this.generateCacheKey(sql, params);
        await cacheService.set(key, result, cacheTTL);
      }

      this.recordQueryStats(sql, Date.now() - startInfo.startTime, false);
      
    } catch (err) {
      error = err;
      this.recordQueryStats(sql, Date.now() - startInfo.startTime, false, true);
      throw err;
    } finally {
      this.dbMonitor.afterQuery(startInfo, error);
    }

    return result;
  }

  /**
   * 带重试的查询执行
   * @param {string} sql - SQL语句
   * @param {Array} params - 查询参数
   * @param {number} retries - 重试次数
   * @param {number} timeout - 超时时间
   */
  async executeWithRetry(sql, params, retries, timeout) {
    let lastError;
    
    for (let i = 0; i <= retries; i++) {
      try {
        // 设置查询超时
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('查询超时')), timeout);
        });
        
        const queryPromise = originalQuery(sql, params);
        
        return await Promise.race([queryPromise, timeoutPromise]);
        
      } catch (error) {
        lastError = error;
        
        if (i < retries && this.isRetryableError(error)) {
          logger.warn(`查询失败，第${i + 1}次重试: ${error.message}`);
          await this.delay(Math.pow(2, i) * 1000); // 指数退避
        } else {
          break;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 判断是否为可重试的错误
   * @param {Error} error - 错误对象
   * @returns {boolean} 是否可重试
   */
  isRetryableError(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ER_LOCK_WAIT_TIMEOUT',
      'ER_LOCK_DEADLOCK'
    ];
    
    return retryableErrors.some(code => 
      error.code === code || error.message.includes(code)
    );
  }

  /**
   * 批量查询
   * @param {Array} queries - 查询数组 [{sql, params, options}]
   * @returns {Promise<Array>} 查询结果数组
   */
  async batchQuery(queries) {
    const results = [];
    const startTime = Date.now();
    
    try {
      // 并行执行查询
      const promises = queries.map(({ sql, params, options }) => 
        this.query(sql, params, options)
      );
      
      const batchResults = await Promise.allSettled(promises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error(`批量查询中的单个查询失败: ${result.reason.message}`);
          results.push(null);
        }
      }
      
      logger.debug(`批量查询完成: ${queries.length}个查询, 耗时${Date.now() - startTime}ms`);
      
    } catch (error) {
      logger.error(`批量查询失败: ${error.message}`);
      throw error;
    }
    
    return results;
  }

  /**
   * 事务执行
   * @param {Function} callback - 事务回调函数
   * @returns {Promise<any>} 事务结果
   */
  async transaction(callback) {
    const connection = await require('../config/db').pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 创建事务查询函数
      const transactionQuery = async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      };
      
      const result = await callback(transactionQuery);
      
      await connection.commit();
      logger.debug('事务提交成功');
      
      return result;
      
    } catch (error) {
      await connection.rollback();
      logger.error(`事务回滚: ${error.message}`);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 分页查询
   * @param {string} sql - 基础SQL语句
   * @param {Array} params - 查询参数
   * @param {Object} pagination - 分页参数
   * @returns {Promise<Object>} 分页结果
   */
  async paginatedQuery(sql, params = [], pagination = {}) {
    const {
      page = 1,
      limit = 10,
      orderBy = 'id',
      orderDirection = 'DESC'
    } = pagination;
    
    const offset = (page - 1) * limit;
    
    // 构建计数查询
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_query`;
    
    // 构建分页查询
    const paginatedSql = `${sql} ORDER BY ${orderBy} ${orderDirection} LIMIT ${limit} OFFSET ${offset}`;
    
    // 并行执行计数和数据查询
    const [countResult, dataResult] = await Promise.all([
      this.query(countSql, params, { cache: true, cacheTTL: 60 }),
      this.query(paginatedSql, params)
    ]);
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data: dataResult,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * 生成缓存键
   * @param {string} sql - SQL语句
   * @param {Array} params - 查询参数
   * @returns {string} 缓存键
   */
  generateCacheKey(sql, params) {
    const sqlHash = require('crypto')
      .createHash('md5')
      .update(sql)
      .digest('hex')
      .substring(0, 8);
    
    const paramsHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex')
      .substring(0, 8);
    
    return `db:${sqlHash}:${paramsHash}`;
  }

  /**
   * 记录查询统计
   * @param {string} sql - SQL语句
   * @param {number} duration - 执行时间
   * @param {boolean} fromCache - 是否来自缓存
   * @param {boolean} hasError - 是否有错误
   */
  recordQueryStats(sql, duration, fromCache, hasError = false) {
    const queryType = sql.trim().split(' ')[0].toUpperCase();
    const key = `${queryType}_QUERIES`;
    
    const stats = this.queryStats.get(key) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      cacheHits: 0,
      errors: 0
    };
    
    stats.count++;
    if (!fromCache) {
      stats.totalDuration += duration;
      stats.avgDuration = stats.totalDuration / (stats.count - stats.cacheHits);
    } else {
      stats.cacheHits++;
    }
    
    if (hasError) {
      stats.errors++;
    }
    
    this.queryStats.set(key, stats);
  }

  /**
   * 获取查询统计信息
   * @returns {Object} 统计信息
   */
  getQueryStats() {
    const stats = {};
    for (const [key, value] of this.queryStats.entries()) {
      stats[key] = {
        ...value,
        cacheHitRate: value.count > 0 ? (value.cacheHits / value.count * 100).toFixed(2) + '%' : '0%',
        errorRate: value.count > 0 ? (value.errors / value.count * 100).toFixed(2) + '%' : '0%'
      };
    }
    return stats;
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建单例实例
const dbOptimizer = new DatabaseOptimizer();

module.exports = {
  dbOptimizer,
  query: dbOptimizer.query.bind(dbOptimizer),
  batchQuery: dbOptimizer.batchQuery.bind(dbOptimizer),
  transaction: dbOptimizer.transaction.bind(dbOptimizer),
  paginatedQuery: dbOptimizer.paginatedQuery.bind(dbOptimizer)
};

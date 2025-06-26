/**
 * 缓存服务工具
 * 提供统一的缓存接口，支持Redis和内存缓存
 * 
 * @author XBlog Team
 * @version 1.0.0
 */

const redis = require('redis');
const { logger } = require('./logger');

class CacheService {
  constructor() {
    this.redisClient = null;
    this.memoryCache = new Map();
    this.isRedisAvailable = false;
    this.init();
  }

  /**
   * 初始化缓存服务
   */
  async init() {
    try {
      // 尝试连接Redis
      if (process.env.REDIS_URL) {
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL,
          retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              logger.warn('Redis连接被拒绝，使用内存缓存');
              return undefined;
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
              logger.error('Redis重试时间超过1小时，停止重试');
              return undefined;
            }
            if (options.attempt > 10) {
              logger.error('Redis重试次数超过10次，停止重试');
              return undefined;
            }
            return Math.min(options.attempt * 100, 3000);
          }
        });

        await this.redisClient.connect();
        this.isRedisAvailable = true;
        logger.info('Redis缓存服务已启动');
      } else {
        logger.info('未配置Redis，使用内存缓存');
      }
    } catch (error) {
      logger.warn(`Redis连接失败，使用内存缓存: ${error.message}`);
      this.isRedisAvailable = false;
    }
  }

  /**
   * 获取缓存值
   * @param {string} key - 缓存键
   * @returns {Promise<any>} 缓存值
   */
  async get(key) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // 使用内存缓存
        const cached = this.memoryCache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.value;
        } else if (cached) {
          this.memoryCache.delete(key);
        }
        return null;
      }
    } catch (error) {
      logger.error(`缓存获取失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 设置缓存值
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间(秒)
   */
  async set(key, value, ttl = 300) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      } else {
        // 使用内存缓存
        this.memoryCache.set(key, {
          value,
          expiry: Date.now() + (ttl * 1000)
        });
        
        // 定期清理过期的内存缓存
        this.cleanupMemoryCache();
      }
    } catch (error) {
      logger.error(`缓存设置失败: ${error.message}`);
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  async del(key) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      logger.error(`缓存删除失败: ${error.message}`);
    }
  }

  /**
   * 清理过期的内存缓存
   */
  cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expiry <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * 缓存装饰器
   * @param {string} keyPrefix - 缓存键前缀
   * @param {number} ttl - 过期时间(秒)
   */
  withCache(keyPrefix, ttl = 300) {
    return (target, propertyName, descriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
        
        // 尝试从缓存获取
        let result = await cacheService.get(cacheKey);
        if (result !== null) {
          logger.debug(`缓存命中: ${cacheKey}`);
          return result;
        }
        
        // 缓存未命中，执行原方法
        result = await originalMethod.apply(this, args);
        
        // 将结果存入缓存
        await cacheService.set(cacheKey, result, ttl);
        logger.debug(`缓存设置: ${cacheKey}`);
        
        return result;
      };
      
      return descriptor;
    };
  }

  /**
   * 获取缓存统计信息
   */
  async getStats() {
    const stats = {
      type: this.isRedisAvailable ? 'redis' : 'memory',
      memoryKeys: this.memoryCache.size
    };

    if (this.isRedisAvailable && this.redisClient) {
      try {
        const info = await this.redisClient.info('memory');
        stats.redisMemory = info;
      } catch (error) {
        logger.error(`获取Redis统计信息失败: ${error.message}`);
      }
    }

    return stats;
  }

  /**
   * 关闭缓存连接
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    this.memoryCache.clear();
  }
}

// 创建单例实例
const cacheService = new CacheService();

module.exports = {
  cacheService,
  withCache: cacheService.withCache.bind(cacheService)
};

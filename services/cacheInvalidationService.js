/**
 * 缓存失效服务
 * 当数据更新时自动清理相关缓存
 * 
 * @author XBlog Team
 * @version 1.0.0
 */

const { logger } = require('../utils/logger');

// 尝试导入缓存服务
let cacheService = null;
try {
  cacheService = require('../utils/cache').cacheService;
} catch (error) {
  logger.debug('缓存服务不可用，跳过缓存失效功能');
}

class CacheInvalidationService {
  constructor() {
    this.cachePatterns = {
      // 分类相关缓存
      categories: [
        'categories:all',
        'categories:hierarchy',
        'db:*:categories*'
      ],
      
      // 文章相关缓存
      posts: [
        'posts:*',
        'db:*:posts*',
        'dashboard:*'
      ],
      
      // 用户相关缓存
      users: [
        'users:*',
        'db:*:users*'
      ],
      
      // 评论相关缓存
      comments: [
        'comments:*',
        'db:*:comments*',
        'dashboard:*'
      ],
      
      // 标签相关缓存
      tags: [
        'tags:*',
        'db:*:tags*'
      ],
      
      // 仪表板相关缓存
      dashboard: [
        'dashboard:*',
        'stats:*'
      ]
    };
  }

  /**
   * 清理指定模式的缓存
   * @param {string|Array} patterns - 缓存模式或模式数组
   */
  async invalidateByPatterns(patterns) {
    if (!cacheService) {
      return;
    }

    try {
      const patternArray = Array.isArray(patterns) ? patterns : [patterns];
      
      for (const pattern of patternArray) {
        if (pattern.includes('*')) {
          // 通配符模式，需要获取所有匹配的键
          await this.invalidateByWildcard(pattern);
        } else {
          // 精确匹配
          await cacheService.del(pattern);
          logger.debug(`缓存已清理: ${pattern}`);
        }
      }
    } catch (error) {
      logger.error(`缓存清理失败: ${error.message}`);
    }
  }

  /**
   * 通过通配符模式清理缓存
   * @param {string} pattern - 通配符模式
   */
  async invalidateByWildcard(pattern) {
    // 注意：这里需要根据实际的缓存实现来调整
    // Redis 支持 KEYS 命令，但在生产环境中应该谨慎使用
    // 内存缓存需要遍历所有键
    
    try {
      if (cacheService.redisClient && cacheService.isRedisAvailable) {
        // Redis 实现
        const keys = await cacheService.redisClient.keys(pattern);
        if (keys.length > 0) {
          await cacheService.redisClient.del(keys);
          logger.debug(`Redis缓存已清理: ${keys.length}个键匹配模式 ${pattern}`);
        }
      } else {
        // 内存缓存实现
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const keysToDelete = [];
        
        for (const [key] of cacheService.memoryCache.entries()) {
          if (regex.test(key)) {
            keysToDelete.push(key);
          }
        }
        
        for (const key of keysToDelete) {
          cacheService.memoryCache.delete(key);
        }
        
        if (keysToDelete.length > 0) {
          logger.debug(`内存缓存已清理: ${keysToDelete.length}个键匹配模式 ${pattern}`);
        }
      }
    } catch (error) {
      logger.error(`通配符缓存清理失败: ${error.message}`);
    }
  }

  /**
   * 分类相关缓存失效
   */
  async invalidateCategories() {
    await this.invalidateByPatterns(this.cachePatterns.categories);
    logger.info('分类相关缓存已清理');
  }

  /**
   * 文章相关缓存失效
   */
  async invalidatePosts() {
    await this.invalidateByPatterns(this.cachePatterns.posts);
    logger.info('文章相关缓存已清理');
  }

  /**
   * 用户相关缓存失效
   */
  async invalidateUsers() {
    await this.invalidateByPatterns(this.cachePatterns.users);
    logger.info('用户相关缓存已清理');
  }

  /**
   * 评论相关缓存失效
   */
  async invalidateComments() {
    await this.invalidateByPatterns(this.cachePatterns.comments);
    logger.info('评论相关缓存已清理');
  }

  /**
   * 标签相关缓存失效
   */
  async invalidateTags() {
    await this.invalidateByPatterns(this.cachePatterns.tags);
    logger.info('标签相关缓存已清理');
  }

  /**
   * 仪表板相关缓存失效
   */
  async invalidateDashboard() {
    await this.invalidateByPatterns(this.cachePatterns.dashboard);
    logger.info('仪表板相关缓存已清理');
  }

  /**
   * 清理所有缓存
   */
  async invalidateAll() {
    if (!cacheService) {
      return;
    }

    try {
      if (cacheService.redisClient && cacheService.isRedisAvailable) {
        await cacheService.redisClient.flushdb();
        logger.info('所有Redis缓存已清理');
      } else {
        cacheService.memoryCache.clear();
        logger.info('所有内存缓存已清理');
      }
    } catch (error) {
      logger.error(`清理所有缓存失败: ${error.message}`);
    }
  }

  /**
   * 创建缓存失效中间件
   * @param {string} type - 缓存类型
   * @returns {Function} Express中间件
   */
  createInvalidationMiddleware(type) {
    return async (req, res, next) => {
      // 保存原始的 res.json 方法
      const originalJson = res.json;
      
      // 重写 res.json 方法
      res.json = async function(data) {
        // 如果响应成功，清理相关缓存
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            switch (type) {
              case 'categories':
                await cacheInvalidationService.invalidateCategories();
                break;
              case 'posts':
                await cacheInvalidationService.invalidatePosts();
                break;
              case 'users':
                await cacheInvalidationService.invalidateUsers();
                break;
              case 'comments':
                await cacheInvalidationService.invalidateComments();
                break;
              case 'tags':
                await cacheInvalidationService.invalidateTags();
                break;
              case 'dashboard':
                await cacheInvalidationService.invalidateDashboard();
                break;
            }
          } catch (error) {
            logger.error(`缓存失效中间件错误: ${error.message}`);
          }
        }
        
        // 调用原始的 json 方法
        return originalJson.call(this, data);
      };
      
      next();
    };
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats() {
    if (!cacheService) {
      return { available: false };
    }

    try {
      return await cacheService.getStats();
    } catch (error) {
      logger.error(`获取缓存统计失败: ${error.message}`);
      return { error: error.message };
    }
  }
}

// 创建单例实例
const cacheInvalidationService = new CacheInvalidationService();

module.exports = {
  cacheInvalidationService,
  invalidateCategories: cacheInvalidationService.invalidateCategories.bind(cacheInvalidationService),
  invalidatePosts: cacheInvalidationService.invalidatePosts.bind(cacheInvalidationService),
  invalidateUsers: cacheInvalidationService.invalidateUsers.bind(cacheInvalidationService),
  invalidateComments: cacheInvalidationService.invalidateComments.bind(cacheInvalidationService),
  invalidateTags: cacheInvalidationService.invalidateTags.bind(cacheInvalidationService),
  invalidateDashboard: cacheInvalidationService.invalidateDashboard.bind(cacheInvalidationService),
  createInvalidationMiddleware: cacheInvalidationService.createInvalidationMiddleware.bind(cacheInvalidationService)
};

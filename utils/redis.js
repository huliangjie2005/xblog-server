/**
 * Redis客户端工具
 * 支持Redis连接失败时切换到内存模式
 */
const { createClient } = require('redis');
const { logger } = require('./logger');

// 创建内存模拟Redis的函数
function createMemoryRedis() {
  const memoryStore = new Map();
  const memoryClient = {
    isMemoryStore: true,
    get: async (key) => memoryStore.get(key),
    set: async (key, value, opt1, opt2, opt3) => {
      // 处理过期时间
      if (opt1 === 'EX' && typeof opt2 === 'number') {
        memoryStore.set(key, value);
        setTimeout(() => {
          memoryStore.delete(key);
        }, opt2 * 1000);
        return 'OK';
      }
      memoryStore.set(key, value);
      return 'OK';
    },
    del: async (key) => {
      const existed = memoryStore.has(key);
      memoryStore.delete(key);
      return existed ? 1 : 0;
    },
    connect: async () => Promise.resolve(),
    disconnect: async () => Promise.resolve(),
  };
  
  logger.info('内存模拟Redis已启用');
  return memoryClient;
}

// 默认使用Redis客户端，如果环境变量设置了USE_MEMORY_REDIS=true，则直接使用内存模式
let redisClient;

if (process.env.USE_MEMORY_REDIS === 'true') {
  redisClient = createMemoryRedis();
} else {
  // 尝试创建Redis客户端
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000, // 5秒连接超时
        reconnectStrategy: false // 禁用重连策略
      }
    });
    
    // 只绑定一次错误处理器
    redisClient.on('error', (err) => {
      logger.warn('Redis连接失败，切换到内存模式', err.message);
      // 替换为内存版本
      redisClient = createMemoryRedis();
    });
    
    // 检查是否可以连接
    (async () => {
      try {
        // 设置超时
        const timeout = setTimeout(() => {
          logger.warn('Redis连接超时，切换到内存模式');
          redisClient = createMemoryRedis();
        }, 5000);
        
        await redisClient.connect();
        clearTimeout(timeout);
        
        logger.info('Redis连接成功');
      } catch (err) {
        logger.warn('Redis连接失败，切换到内存模式', err.message);
        redisClient = createMemoryRedis();
      }
    })();
  } catch (err) {
    logger.warn('Redis初始化失败，切换到内存模式', err.message);
    redisClient = createMemoryRedis();
  }
}

module.exports = {
  redisClient
}; 
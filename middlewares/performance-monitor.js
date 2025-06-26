/**
 * 性能监控中间件
 * 监控API响应时间、内存使用、数据库查询等性能指标
 * 
 * @author XBlog Team
 * @version 1.0.0
 */

const { logger } = require('../utils/logger');
const { cacheService } = require('../utils/cache');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: new Map(),
      apiStats: new Map(),
      dbQueries: [],
      memoryUsage: []
    };
    
    // 定期清理旧数据
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // 5分钟清理一次
  }

  /**
   * 请求性能监控中间件
   */
  requestMonitor() {
    return (req, res, next) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();
      
      // 生成请求ID
      req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 监控响应
      const originalSend = res.send;
      res.send = function(data) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const endMemory = process.memoryUsage();
        
        // 记录性能指标
        performanceMonitor.recordRequest({
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          memoryDelta: {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed
          },
          timestamp: new Date().toISOString()
        });
        
        // 记录慢请求
        if (duration > 1000) {
          logger.warn(`慢请求检测: ${req.method} ${req.originalUrl} - ${duration}ms`, {
            requestId: req.requestId,
            duration,
            statusCode: res.statusCode
          });
        }
        
        // 设置性能头部
        res.set({
          'X-Response-Time': `${duration}ms`,
          'X-Request-ID': req.requestId
        });
        
        return originalSend.call(this, data);
      };
      
      next();
    };
  }

  /**
   * 记录请求性能数据
   */
  recordRequest(data) {
    // 存储最近1000个请求
    if (this.metrics.requests.size >= 1000) {
      const firstKey = this.metrics.requests.keys().next().value;
      this.metrics.requests.delete(firstKey);
    }
    
    this.metrics.requests.set(data.requestId, data);
    
    // 更新API统计
    const apiKey = `${data.method} ${data.url.split('?')[0]}`;
    const existing = this.metrics.apiStats.get(apiKey) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      errorCount: 0
    };
    
    existing.count++;
    existing.totalDuration += data.duration;
    existing.avgDuration = existing.totalDuration / existing.count;
    existing.minDuration = Math.min(existing.minDuration, data.duration);
    existing.maxDuration = Math.max(existing.maxDuration, data.duration);
    
    if (data.statusCode >= 400) {
      existing.errorCount++;
    }
    
    this.metrics.apiStats.set(apiKey, existing);
  }

  /**
   * 数据库查询监控
   */
  dbQueryMonitor() {
    return {
      beforeQuery: (sql, params) => {
        return {
          startTime: Date.now(),
          sql: sql.substring(0, 100), // 只记录前100个字符
          paramCount: params ? params.length : 0
        };
      },
      
      afterQuery: (queryInfo, error = null) => {
        const duration = Date.now() - queryInfo.startTime;
        
        const queryData = {
          sql: queryInfo.sql,
          duration,
          paramCount: queryInfo.paramCount,
          error: error ? error.message : null,
          timestamp: new Date().toISOString()
        };
        
        // 存储最近100个查询
        if (this.metrics.dbQueries.length >= 100) {
          this.metrics.dbQueries.shift();
        }
        this.metrics.dbQueries.push(queryData);
        
        // 记录慢查询
        if (duration > 500) {
          logger.warn(`慢查询检测: ${queryInfo.sql} - ${duration}ms`, queryData);
        }
        
        if (error) {
          logger.error(`数据库查询错误: ${error.message}`, queryData);
        }
      }
    };
  }

  /**
   * 内存使用监控
   */
  startMemoryMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const memoryData = {
        ...usage,
        timestamp: new Date().toISOString()
      };
      
      // 存储最近100个内存快照
      if (this.metrics.memoryUsage.length >= 100) {
        this.metrics.memoryUsage.shift();
      }
      this.metrics.memoryUsage.push(memoryData);
      
      // 内存使用警告
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      if (heapUsedMB > 500) { // 超过500MB警告
        logger.warn(`内存使用过高: ${heapUsedMB.toFixed(2)}MB`, memoryData);
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 获取性能统计报告
   */
  async getPerformanceReport() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // 过滤最近一小时的请求
    const recentRequests = Array.from(this.metrics.requests.values())
      .filter(req => new Date(req.timestamp).getTime() > oneHourAgo);
    
    // 计算总体统计
    const totalRequests = recentRequests.length;
    const avgResponseTime = totalRequests > 0 
      ? recentRequests.reduce((sum, req) => sum + req.duration, 0) / totalRequests 
      : 0;
    
    const errorRate = totalRequests > 0
      ? recentRequests.filter(req => req.statusCode >= 400).length / totalRequests
      : 0;
    
    // 最慢的API
    const slowestApis = Array.from(this.metrics.apiStats.entries())
      .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
      .slice(0, 5)
      .map(([api, stats]) => ({ api, ...stats }));
    
    // 最近的慢查询
    const slowQueries = this.metrics.dbQueries
      .filter(query => query.duration > 100)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    // 当前内存使用
    const currentMemory = process.memoryUsage();
    
    // 缓存统计
    const cacheStats = await cacheService.getStats();
    
    return {
      summary: {
        totalRequests,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100),
        uptime: process.uptime()
      },
      apis: {
        slowest: slowestApis,
        total: this.metrics.apiStats.size
      },
      database: {
        slowQueries,
        totalQueries: this.metrics.dbQueries.length
      },
      memory: {
        current: {
          rss: Math.round(currentMemory.rss / 1024 / 1024),
          heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024)
        },
        history: this.metrics.memoryUsage.slice(-10) // 最近10个快照
      },
      cache: cacheStats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 清理旧数据
   */
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // 清理旧请求数据
    for (const [id, request] of this.metrics.requests.entries()) {
      if (new Date(request.timestamp).getTime() < oneHourAgo) {
        this.metrics.requests.delete(id);
      }
    }
    
    // 清理旧查询数据
    this.metrics.dbQueries = this.metrics.dbQueries
      .filter(query => new Date(query.timestamp).getTime() > oneHourAgo);
    
    // 清理旧内存数据
    this.metrics.memoryUsage = this.metrics.memoryUsage
      .filter(memory => new Date(memory.timestamp).getTime() > oneHourAgo);
    
    logger.debug('性能监控数据清理完成');
  }
}

// 创建单例实例
const performanceMonitor = new PerformanceMonitor();

// 启动内存监控
performanceMonitor.startMemoryMonitoring();

module.exports = {
  performanceMonitor,
  requestMonitor: performanceMonitor.requestMonitor.bind(performanceMonitor),
  dbQueryMonitor: performanceMonitor.dbQueryMonitor.bind(performanceMonitor)
};

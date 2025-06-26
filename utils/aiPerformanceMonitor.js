/**
 * AI性能监控工具
 */

const { logger } = require('./logger');

class AIPerformanceMonitor {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.requestTimes = [];
    this.maxHistorySize = 100; // 保留最近100次请求的记录
  }
  
  /**
   * 开始监控请求
   */
  startRequest() {
    return {
      startTime: Date.now(),
      requestId: this.generateRequestId()
    };
  }
  
  /**
   * 结束监控请求
   */
  endRequest(requestInfo, success = true, fromCache = false) {
    const endTime = Date.now();
    const responseTime = endTime - requestInfo.startTime;
    
    // 更新统计信息
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    // 记录响应时间
    this.requestTimes.push(responseTime);
    if (this.requestTimes.length > this.maxHistorySize) {
      this.requestTimes.shift();
    }
    
    // 更新平均响应时间
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;
    
    // 记录日志
    logger.info(`AI请求完成 [${requestInfo.requestId}]: ${responseTime}ms, 成功: ${success}, 缓存: ${fromCache}`);
    
    return {
      responseTime,
      success,
      fromCache
    };
  }
  
  /**
   * 获取性能统计
   */
  getMetrics() {
    const recentTimes = this.requestTimes.slice(-10); // 最近10次请求
    const recentAverage = recentTimes.length > 0 
      ? recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length 
      : 0;
    
    return {
      ...this.metrics,
      recentAverageResponseTime: Math.round(recentAverage),
      cacheHitRate: this.metrics.totalRequests > 0 
        ? ((this.metrics.cacheHits / this.metrics.totalRequests) * 100).toFixed(2) + '%'
        : '0%',
      successRate: this.metrics.totalRequests > 0 
        ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
  
  /**
   * 重置统计信息
   */
  reset() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.requestTimes = [];
  }
  
  /**
   * 生成请求ID
   */
  generateRequestId() {
    return Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * 获取性能建议
   */
  getPerformanceAdvice() {
    const metrics = this.getMetrics();
    const advice = [];
    
    if (metrics.averageResponseTime > 5000) {
      advice.push('平均响应时间较长，建议检查网络连接或减少请求内容长度');
    }
    
    if (parseFloat(metrics.cacheHitRate) < 20) {
      advice.push('缓存命中率较低，建议优化缓存策略');
    }
    
    if (parseFloat(metrics.successRate) < 95) {
      advice.push('请求成功率较低，建议检查API配置和网络稳定性');
    }
    
    if (metrics.recentAverageResponseTime > metrics.averageResponseTime * 1.5) {
      advice.push('最近响应时间明显增长，建议检查服务状态');
    }
    
    return advice;
  }
}

// 创建全局实例
const aiPerformanceMonitor = new AIPerformanceMonitor();

module.exports = aiPerformanceMonitor;

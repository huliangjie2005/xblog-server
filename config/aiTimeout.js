/**
 * AI服务超时配置
 */

module.exports = {
  // 基础超时设置
  timeouts: {
    // API请求超时（毫秒）
    apiRequest: 45000, // 45秒
    
    // 前端请求超时（毫秒）
    frontendRequest: 50000, // 50秒
    
    // 连接超时（毫秒）
    connection: 10000, // 10秒
    
    // 读取超时（毫秒）
    read: 40000, // 40秒
  },
  
  // 重试配置
  retry: {
    // 最大重试次数
    maxRetries: 2,
    
    // 重试延迟（毫秒）
    retryDelay: 2000, // 2秒
    
    // 重试的错误类型
    retryableErrors: [
      'ECONNABORTED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
      'AbortError'
    ]
  },
  
  // 不同AI服务提供商的超时设置
  providers: {
    openai: {
      timeout: 30000, // 30秒
      maxTokens: 1000
    },
    deepseek: {
      timeout: 45000, // 45秒
      maxTokens: 500
    },
    baidu: {
      timeout: 35000, // 35秒
      maxTokens: 800
    },
    alibaba: {
      timeout: 40000, // 40秒
      maxTokens: 600
    }
  },
  
  // 根据内容长度调整超时
  getTimeoutByContentLength: (contentLength) => {
    if (contentLength < 200) {
      return 20000 // 20秒
    } else if (contentLength < 500) {
      return 30000 // 30秒
    } else if (contentLength < 1000) {
      return 45000 // 45秒
    } else {
      return 60000 // 60秒
    }
  },
  
  // 根据操作类型调整超时
  getTimeoutByOperation: (operation) => {
    const timeouts = {
      'polish': 30000,    // 润色：30秒
      'expand': 45000,    // 扩展：45秒
      'condense': 25000,  // 精简：25秒
      'summary': 20000,   // 摘要：20秒
      'seo': 15000        // SEO：15秒
    }
    
    return timeouts[operation] || 30000
  },
  
  // 错误消息映射
  errorMessages: {
    'ECONNABORTED': '连接超时，请检查网络连接',
    'ETIMEDOUT': '请求超时，请稍后重试',
    'ENOTFOUND': '无法连接到AI服务，请检查网络',
    'ECONNRESET': '连接被重置，请重试',
    'AbortError': 'AI处理超时，请尝试缩短内容长度'
  },
  
  // 获取友好的错误消息
  getFriendlyErrorMessage: (error) => {
    const errorCode = error.code || error.name
    return module.exports.errorMessages[errorCode] || '处理失败，请重试'
  }
}

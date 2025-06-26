/**
 * 集中式错误处理中间件
 */
const { logger } = require('../utils/logger');
const { responseError } = require('../utils/response');

/**
 * 自定义API错误类
 */
class ApiError extends Error {
  /**
   * 创建API错误实例
   * @param {string} message - 错误消息
   * @param {number} statusCode - HTTP状态码
   * @param {any} details - 错误详情
   */
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(`找不到路径: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * 处理请求ID生成中间件
 * 为每个请求生成唯一ID以便跟踪
 */
const requestIdMiddleware = (req, res, next) => {
  // 生成唯一请求ID (UUID v4格式)
  const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
  
  req.id = req.headers['x-request-id'] || uuid();
  res.setHeader('X-Request-ID', req.id);
  
  // 为每个请求添加带有请求ID的日志上下文
  req.logger = {
    info: (message) => logger.info(`[${req.id}] ${message}`),
    error: (message) => logger.error(`[${req.id}] ${message}`),
    warn: (message) => logger.warn(`[${req.id}] ${message}`),
    debug: (message) => logger.debug(`[${req.id}] ${message}`)
  };
  
  next();
};

/**
 * 主错误处理器
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  let details = err.details || null;
  
  // 记录错误
  const logError = `处理请求 ${req.method} ${req.originalUrl} 时出错: ${message}`;
  if (statusCode >= 500) {
    logger.error(`[${req.id}] ${logError}`);
    logger.error(`[${req.id}] 错误堆栈: ${err.stack}`);
    
    // 在生产环境中不向客户端返回详细错误信息
    if (process.env.NODE_ENV === 'production') {
      details = undefined;
    } else {
      details = {
        stack: err.stack?.split('\n'),
        ...details
      };
    }
  } else {
    logger.warn(`[${req.id}] ${logError}`);
  }
  
  // 发送错误响应
  return responseError(res, message, statusCode, details);
};

/**
 * 验证错误处理助手
 */
const handleValidationErrors = (err) => {
  if (err.name === 'ValidationError') {
    // 处理mongoose验证错误
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    return new ApiError('验证错误', 400, { errors });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return new ApiError('无效的令牌', 401);
  }
  
  if (err.name === 'TokenExpiredError') {
    return new ApiError('令牌已过期', 401);
  }
  
  // 通用错误处理
  return new ApiError(err.message, err.statusCode || 500, err.details);
};

/**
 * 异步错误处理包装器
 * 用于捕获异步路由处理器中的错误
 * @param {function} fn - 异步路由处理函数
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ApiError,
  notFoundHandler,
  errorHandler,
  requestIdMiddleware,
  handleValidationErrors,
  catchAsync
}; 
const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * 全局错误处理中间件
 * 统一捕获和处理应用中的所有错误
 */
const errorHandler = (err, req, res, next) => {
  // 为每个请求生成唯一ID用于追踪
  const requestId = req.id || uuidv4();

  // 记录错误日志，包含请求ID便于追踪
  logger.error(`${err.name}: ${err.message}`, {
    requestId,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    stack: err.stack
  });

  // 默认错误响应配置
  let statusCode = err.statusCode || 500;
  let errorResponse = {
    status: 'error',
    code: statusCode,
    message: err.message || '服务器内部错误',
    requestId
  };

  // 验证错误处理
  if (err.type === 'validation') {
    statusCode = 400;
    errorResponse = {
      ...errorResponse,
      code: 400,
      message: '请求数据验证失败',
      errors: err.details
    };
  }

  // JWT认证错误处理
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse = {
      ...errorResponse,
      code: 401,
      message: '无效的令牌'
    };
  }

  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse = {
      ...errorResponse,
      code: 401,
      message: '令牌已过期'
    };
  }

  // 数据库错误处理
  else if (err.name === 'DatabaseError') {
    statusCode = 500;
    errorResponse = {
      ...errorResponse,
      code: 500,
      message: process.env.NODE_ENV === 'production' ? 
        '数据库操作失败' : `数据库错误: ${err.message}`
    };
  }

  // 生产环境隐藏敏感错误信息
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.message = '服务器内部错误';
    delete errorResponse.stack;
  }

  // 开发环境包含错误堆栈信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // 返回错误响应
  return res.status(statusCode).json(errorResponse);
};

/**
 * 请求ID生成中间件
 * 为每个请求生成唯一ID
 */
const requestIdMiddleware = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

module.exports = {
  errorHandler,
  requestIdMiddleware
};
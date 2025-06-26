/**
 * 增强的输入验证中间件
 * 提供更严格的数据验证和安全检查
 * 
 * @author XBlog Team
 * @version 1.0.0
 */

const { body, param, query, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const rateLimit = require('express-rate-limit');

/**
 * 处理验证错误
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(`输入验证失败: ${req.method} ${req.originalUrl}`, {
      errors: errors.array(),
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip
    });
    
    return res.status(400).json({
      status: 'error',
      message: '请求数据验证失败',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * SQL注入防护
 */
const sqlInjectionProtection = (value) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|`)/g,
    /(\bOR\b|\bAND\b).*?(\b=\b|\bLIKE\b)/gi
  ];
  
  return !sqlPatterns.some(pattern => pattern.test(value));
};

/**
 * XSS防护
 */
const xssProtection = (value) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[^>]*>/gi
  ];
  
  return !xssPatterns.some(pattern => pattern.test(value));
};

/**
 * 路径遍历防护
 */
const pathTraversalProtection = (value) => {
  const pathPatterns = [
    /\.\./g,
    /\/\.\./g,
    /\.\.\\/g,
    /~\//g
  ];
  
  return !pathPatterns.some(pattern => pattern.test(value));
};

/**
 * 创建安全验证规则
 */
const createSecureValidation = (field, type = 'string', options = {}) => {
  const {
    required = true,
    minLength = 1,
    maxLength = 255,
    allowEmpty = false,
    customValidator = null
  } = options;
  
  let validator;
  
  switch (field) {
    case 'body':
      validator = body(type);
      break;
    case 'param':
      validator = param(type);
      break;
    case 'query':
      validator = query(type);
      break;
    default:
      validator = body(field);
  }
  
  if (required && !allowEmpty) {
    validator = validator.notEmpty().withMessage(`${field}不能为空`);
  }
  
  if (type === 'string') {
    validator = validator
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field}长度必须在${minLength}-${maxLength}之间`)
      .custom((value) => {
        if (!sqlInjectionProtection(value)) {
          throw new Error(`${field}包含潜在的SQL注入攻击`);
        }
        if (!xssProtection(value)) {
          throw new Error(`${field}包含潜在的XSS攻击`);
        }
        if (!pathTraversalProtection(value)) {
          throw new Error(`${field}包含潜在的路径遍历攻击`);
        }
        return true;
      });
  }
  
  if (customValidator) {
    validator = validator.custom(customValidator);
  }
  
  return validator;
};

/**
 * 常用验证规则
 */
const validationRules = {
  // 用户名验证
  username: createSecureValidation('username', 'string', {
    minLength: 3,
    maxLength: 50,
    customValidator: (value) => {
      if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(value)) {
        throw new Error('用户名只能包含字母、数字、下划线和中文');
      }
      return true;
    }
  }),
  
  // 邮箱验证
  email: body('email')
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('邮箱长度不能超过100个字符'),
  
  // 密码验证
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('密码长度必须在8-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('密码必须包含大小写字母、数字和特殊字符'),
  
  // 文章标题验证
  title: createSecureValidation('title', 'string', {
    minLength: 1,
    maxLength: 200
  }),
  
  // 文章内容验证
  content: createSecureValidation('content', 'string', {
    minLength: 1,
    maxLength: 50000
  }),
  
  // ID验证
  id: param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数'),
  
  // 分页验证
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间')
};

/**
 * API限流配置
 */
const createRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15分钟
    max = 100, // 最大请求数
    message = '请求过于频繁，请稍后再试',
    skipSuccessfulRequests = false
  } = options;
  
  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      message,
      code: 429
    },
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`API限流触发: ${req.ip} - ${req.method} ${req.originalUrl}`);
      res.status(429).json({
        status: 'error',
        message,
        code: 429
      });
    }
  });
};

/**
 * 预定义的限流规则
 */
const rateLimits = {
  // 登录限流
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 最大5次登录尝试
    message: '登录尝试过于频繁，请15分钟后再试'
  }),
  
  // 注册限流
  register: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 3, // 最大3次注册
    message: '注册过于频繁，请1小时后再试'
  }),
  
  // 一般API限流
  api: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 最大100次请求
    message: 'API请求过于频繁，请稍后再试'
  }),
  
  // 上传限流
  upload: createRateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 10, // 最大10次上传
    message: '上传过于频繁，请稍后再试'
  })
};

/**
 * 请求日志中间件
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // 记录请求信息
  logger.info(`请求开始: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  });
  
  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`请求完成: ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

module.exports = {
  handleValidationErrors,
  createSecureValidation,
  validationRules,
  rateLimits,
  createRateLimit,
  requestLogger,
  sqlInjectionProtection,
  xssProtection,
  pathTraversalProtection
};

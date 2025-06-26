/**
 * 配置中心入口文件
 * 支持多环境配置
 */
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

// 确定当前环境
const environment = process.env.NODE_ENV || 'development';

// 加载环境变量
const envFile = `.env${environment !== 'development' ? `.${environment}` : ''}`;
const envPath = path.join(__dirname, '..', envFile);

// 尝试加载特定环境的.env文件，如果不存在则加载默认.env
if (environment !== 'development' && fs.existsSync(envPath)) {
  logger.info(`加载环境配置: ${envFile}`);
  dotenv.config({ path: envPath });
} else {
  logger.info(`加载默认环境配置: .env`);
  dotenv.config();
}

// 导入JWT配置
const jwtConfig = require('./jwt');

// 导入数据库配置
const dbConfig = require('./db');

// 服务器配置
const serverConfig = {
  port: parseInt(process.env.PORT || '9002', 10),
  host: process.env.HOST || 'localhost',
  apiVersion: process.env.API_VERSION || 'v1',
  env: environment,
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  rateLimit: {
    enabled: process.env.ENABLE_RATE_LIMIT === 'true',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
  }
};

// 安全配置
const securityConfig = {
  helmet: process.env.ENABLE_HELMET === 'true',
  xssProtection: process.env.ENABLE_XSS_PROTECTION === 'true',
  jwt: {
    ...jwtConfig,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: process.env.JWT_ISSUER || 'xblog-api'
  }
};

// 文件上传配置
const uploadConfig = {
  path: process.env.UPLOAD_DIR || 'public/uploads',
  maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif').split(',')
};

// Redis配置
const redisConfig = {
  useMemory: process.env.USE_MEMORY_REDIS === 'true',
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0', 10),
  prefix: process.env.REDIS_PREFIX || 'xblog:'
};

// 邮件配置
const mailConfig = {
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  },
  from: process.env.MAIL_FROM || 'noreply@example.com'
};

// 日志配置
const loggingConfig = {
  level: process.env.LOG_LEVEL || (environment === 'production' ? 'info' : 'debug'),
  retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '14', 10),
  maxSize: process.env.LOG_MAX_SIZE || '20m'
};

// 缓存配置
const cacheConfig = {
  ttl: parseInt(process.env.CACHE_TTL || '3600000', 10),
  enabled: process.env.API_CACHE_ENABLED === 'true'
};

// 导出配置
module.exports = {
  // 环境信息
  environment,
  
  // 服务器配置
  server: serverConfig,
  
  // 安全配置
  security: securityConfig,
  
  // 数据库配置
  db: dbConfig,
  
  // 文件上传配置
  uploads: uploadConfig,
  
  // Redis配置
  redis: redisConfig,
  
  // 邮件配置
  mail: mailConfig,
  
  // 日志配置
  logging: loggingConfig,
  
  // 缓存配置
  cache: cacheConfig,
  
  // 向前兼容旧配置
  JWT_SECRET: jwtConfig.JWT_SECRET,
  JWT_EXPIRES_IN: jwtConfig.JWT_EXPIRES_IN,
  port: serverConfig.port,
  host: serverConfig.host
}; 
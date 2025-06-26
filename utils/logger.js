/**
 * 增强版日志工具
 * 支持日志轮转、结构化日志、不同环境配置
 */
const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 确保日志目录存在
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 确定当前环境
const environment = process.env.NODE_ENV || 'development';

// 日志级别配置
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 根据环境决定日志级别
const level = () => {
  return environment === 'production' ? 'info' : 'info'; // 开发环境也使用info级别，减少debug日志
};

// 自定义日志格式
const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// 彩色日志格式 (用于控制台)
const colorizedFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, stack }) => {
    // 如果有错误栈，则打印出来
    if (stack) {
      return `${timestamp} [${level}]: ${message}\n${stack}`;
    }
    
    return `${timestamp} [${level}]: ${message}`;
  })
);

// 精简的控制台输出格式，不显示时间戳和额外元数据
const consoleFormat = combine(
  colorize({ all: true }),
  printf(({ level, message, stack }) => {
    // 只在错误时显示堆栈
    if (stack) {
      return `[${level}]: ${message}\n${stack}`;
    }
    
    return `[${level}]: ${message}`;
  })
);

// JSON格式 (用于文件日志，方便后续机器解析)
const jsonFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json()
);

// 创建日志轮转文件传输
const fileRotateTransport = (filename, level) => {
  return new winston.transports.DailyRotateFile({
    filename: path.join(logDir, `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m', // 单个文件最大20MB
    maxFiles: '14d', // 保留14天的日志
    level
  });
};

// 控制台日志过滤器，只显示错误和警告
const consoleFilter = winston.format((info) => {
  // 只显示错误和警告
  if (info.level === 'error' || info.level === 'warn') {
    return info;
  }

  // 不显示任何其他消息（包括info级别的消息）
  return false;
});

// 创建日志实例
const logger = winston.createLogger({
  level: level(),
  levels,
  format: jsonFormat,
  defaultMeta: { service: 'xblog-backend', environment },
  transports: [
    // 将筛选后的日志输出到控制台
    new winston.transports.Console({
      format: combine(
        consoleFilter(),
        consoleFormat
      ),
      level: 'debug' // 允许所有级别通过，但由过滤器决定显示哪些
    }),
    // 普通信息日志
    fileRotateTransport('app', 'info'),
    // 错误日志
    fileRotateTransport('error', 'error'),
    // HTTP请求日志
    fileRotateTransport('http', 'http'),
    // 调试日志 (仅在开发环境)
    ...(environment !== 'production' ? [fileRotateTransport('debug', 'debug')] : [])
  ],
  // 异常处理
  exceptionHandlers: [
    new winston.transports.Console({
      format: colorizedFormat
    }),
    fileRotateTransport('exceptions', 'error')
  ],
  // 拒绝Promise处理
  rejectionHandlers: [
    new winston.transports.Console({
      format: colorizedFormat
    }),
    fileRotateTransport('rejections', 'error')
  ],
  exitOnError: false // 不因日志记录错误退出应用
});

// 添加辅助方法用于记录重要信息
logger.important = function(message, meta = {}) {
  return this.info(message, { ...meta, important: true });
};

// 创建HTTP日志专用记录器
const httpLogger = (req, res, next) => {
  // 记录请求开始时间
  const start = Date.now();
  
  // 处理响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // 从请求中提取需要记录的信息
    const log = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      requestId: req.id || 'unknown'
    };
    
    // 记录不同级别的日志，取决于响应状态码
    if (res.statusCode >= 500) {
      logger.error('请求处理失败', log);
    } else if (res.statusCode >= 400) {
      logger.warn('请求处理警告', log);
    } else {
      logger.http('请求处理完成', log);
    }
  });
  
  next();
};

// 导出logger实例
module.exports = { 
  logger,
  httpLogger 
}; 
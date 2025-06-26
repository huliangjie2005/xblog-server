/**
 * Swagger配置和初始化
 */
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerUiOptions = require('./config');
const { logger } = require('../utils/logger');
const path = require('path');

// Swagger基本信息配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Xblog API 文档',
      version: '1.0.0',
      description: 'Xblog博客系统API接口文档',
      contact: {
        name: 'Xblog开发团队'
      },
      license: {
        name: 'MIT'
      }
    },
    servers: [
      {
        url: '/',
        description: '开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  // API文档路径
  apis: [
    path.resolve(__dirname, './models.js'),
    path.resolve(__dirname, './admin-api.js'),
    path.resolve(__dirname, './public-api.js')
  ]
};

// 生成Swagger规范
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// 初始化Swagger
function setupSwagger(app) {
  if (!app) {
    logger.error('无法设置Swagger UI：应用程序实例未提供');
    return;
  }
  
  logger.info('正在初始化Swagger UI...');
  
  // 添加Swagger路径转换中间件，处理路径不一致问题
  app.use((req, res, next) => {
    // 如果是对API的请求，检查是否存在路径重复问题
    if (req.originalUrl.includes('/api/api/')) {
      // 修复路径，将/api/api/替换为/api/
      const fixedPath = req.originalUrl.replace('/api/api/', '/api/');
      logger.warn(`检测到错误API路径，重定向: ${req.originalUrl} => ${fixedPath}`);
      return res.redirect(fixedPath);
    }
    next();
  });
  
  // Swagger JSON端点
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  // 设置Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  logger.info('Swagger UI已成功初始化，可访问 /api-docs');
}

module.exports = {
  setupSwagger,
  swaggerSpec
}; 
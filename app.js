const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { logger, httpLogger } = require('./utils/logger');
const { testConnection } = require('./config/db');
const dotenv = require('dotenv');
const tokenBlacklistService = require('./services/tokenBlacklistService');
// 引入Swagger配置
const { setupSwagger } = require('./swagger');
const { 
  errorHandler, 
  notFoundHandler, 
  requestIdMiddleware 
} = require('./middlewares/error-handler');
// 引入请求日志中间件
const requestLogger = require('./middlewares/request-logger');

// 引入性能监控和增强验证
const { requestMonitor } = require('./middlewares/performance-monitor');
const { rateLimits } = require('./middlewares/enhanced-validation');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 安全头设置 - 允许跨域资源访问
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 请求ID中间件，在所有其他中间件之前应用
app.use(requestIdMiddleware);

// 性能监控中间件
app.use(requestMonitor());

// 日志中间件，用于记录所有HTTP请求
app.use(httpLogger);

// 应用请求日志中间件
app.use(requestLogger);

// API限流中间件
app.use('/api', rateLimits.api);

// 应用其他中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 预检请求缓存时间，1天
}));
app.use(cookieParser()); // Cookie解析
app.use(compression()); // 响应压缩

// 引入专用CORS中间件用于静态资源
const corsStatic = require('./middlewares/cors-static');

// 静态文件路由 - 先应用CORS中间件，再提供静态文件
app.use('/static', corsStatic, express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  }
}));
app.use('/uploads', corsStatic, express.static(path.join(__dirname, 'public/uploads'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*'); 
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  }
}));

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 性能监控端点
app.get('/metrics', async (req, res) => {
  try {
    const { performanceMonitor } = require('./middlewares/performance-monitor');
    const report = await performanceMonitor.getPerformanceReport();
    res.json({
      status: 'ok',
      data: report
    });
  } catch (error) {
    logger.error(`获取性能指标失败: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: '无法获取性能指标'
    });
  }
});

// 测试数据库连接
testConnection()
  .then(async (connected) => {
    if (!connected) {
      logger.error('数据库连接失败，应用可能无法正常工作');
    } else {
      logger.info('数据库连接成功');
      
      // 初始化令牌黑名单服务
      try {
        await tokenBlacklistService.init();
        logger.info('令牌黑名单服务初始化完成');
      } catch (error) {
        logger.error(`令牌黑名单服务初始化失败: ${error.message}`);
      }
    }
  })
  .catch((err) => {
    logger.error(`数据库连接测试出错: ${err.message}`);
  });

// 安全地加载路由
function loadRoutes() {
  try {
    // 加载直接处理路由 (包括图像访问路由)
    const directHandlers = require('./routes/direct-handlers');
    app.use('/direct', directHandlers);
    logger.info('已加载直接处理路由');
    
    // 加载公共路由
    const publicRoutes = require('./routes/public');
    app.use('/api', publicRoutes);
    logger.info('已加载公共路由');
    
    // 尝试加载管理路由
    try {
      const adminRoutes = require('./routes/admin');
      app.use('/api/admin', adminRoutes); 
      logger.info('已加载管理员路由');
    } catch (adminRouteError) {
      logger.error(`加载管理员路由失败: ${adminRouteError.message}`);
      logger.error(adminRouteError.stack);
      // 注册一个临时路由，返回错误信息
      app.use('/api/admin', (req, res) => {
        res.status(503).json({
          success: false,
          message: '管理员API暂时不可用，请稍后再试'
        });
      });
    }
  } catch (error) {
    logger.error(`加载路由失败: ${error.message}`);
    logger.error(error.stack);
  }
}

// 加载路由
loadRoutes();

// 设置Swagger UI
try {
  setupSwagger(app);
} catch (error) {
  logger.error(`设置Swagger UI失败: ${error.message}`);
  logger.error(error.stack);
  
  // 如果Swagger UI设置失败，提供备用的API文档页面
  app.get('/api-docs', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Xblog API</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; color: #333; }
            h1 { color: #2c3e50; }
            h2 { color: #3498db; margin-top: 30px; }
            ul { margin-bottom: 20px; }
            li { margin-bottom: 10px; }
            code { background: #f8f9fa; padding: 2px 5px; border-radius: 3px; }
            .container { max-width: 800px; margin: 0 auto; }
            .error { color: #e74c3c; padding: 10px; background: #fadbd8; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Xblog API 文档</h1>
            <p class="error">Swagger UI加载失败: ${error.message}</p>
            <p>以下是主要API端点：</p>
            
            <h2>认证相关</h2>
            <ul>
              <li><code>POST /api/auth/register</code> - 用户注册</li>
              <li><code>POST /api/auth/login</code> - 用户登录</li>
              <li><code>GET /api/auth/me</code> - 获取当前用户信息</li>
              <li><code>POST /api/auth/logout</code> - 用户登出</li>
            </ul>
            
            <h2>文章相关</h2>
            <ul>
              <li><code>GET /api/posts</code> - 获取文章列表</li>
              <li><code>GET /api/posts/{slug}</code> - 获取文章详情</li>
              <li><code>GET /api/posts/{postId}/comments</code> - 获取文章评论</li>
              <li><code>POST /api/posts/{postId}/comments</code> - 添加评论</li>
            </ul>
            
            <h2>分类和标签</h2>
            <ul>
              <li><code>GET /api/categories</code> - 获取分类列表</li>
              <li><code>GET /api/tags</code> - 获取标签列表</li>
            </ul>
            
            <h2>管理员相关</h2>
            <ul>
              <li><code>POST /api/admin/auth/login</code> - 管理员登录</li>
              <li><code>GET /api/admin/roles</code> - 获取所有角色</li>
              <li><code>GET /api/admin/users</code> - 获取用户列表</li>
              <li><code>GET /api/admin/roles/permissions</code> - 获取所有权限</li>
            </ul>
          </div>
        </body>
      </html>
    `);
  });
}

// 根路径重定向
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// 在所有路由之后，添加404处理中间件
app.use(notFoundHandler);

// 错误处理中间件，必须放在最后
app.use(errorHandler);

// 导出应用
module.exports = app; 
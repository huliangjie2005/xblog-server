/**
 * 直接评论API认证中间件
 * 使用环境变量中的JWT密钥直接验证令牌
 */
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const { logger } = require('../utils/logger');

logger.info('直接认证中间件已加载');

/**
 * 直接验证管理员令牌
 */
const directVerifyAdmin = (req, res, next) => {
  try {
    logger.debug(`处理请求: ${req.method} ${req.path}`);
    
    // 从请求头获取Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供访问令牌'
      });
    }

    // 提取Token
    const token = authHeader.split(' ')[1];
    logger.debug(`收到令牌: ${token.substring(0, 20)}...`);
    
    // 使用JWT密钥验证
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.debug(`令牌验证成功: ${JSON.stringify(decoded)}`);
    
    // 检查是否是管理员角色
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    // 将管理员信息添加到请求对象
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    
    // 为兼容性也添加到req.admin
    req.admin = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email
    };
    
    logger.debug(`认证成功，管理员ID: ${decoded.id}`);
    
    // 继续处理请求
    next();
  } catch (error) {
    logger.error(`认证失败: ${error.message}`);
    logger.error(`错误类型: ${error.name}`);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的令牌'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已过期'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

module.exports = {
  directVerifyAdmin
};
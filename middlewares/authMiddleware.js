/**
 * 认证中间件
 * 用于验证JWT令牌和用户权限
 */
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const { query } = require('../config/db');
const jwtConfig = require('../config/jwt');

/**
 * 管理员认证中间件
 * 验证请求头中的JWT令牌是否有效
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: '未提供认证令牌'
      });
    }

    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    // 验证令牌
    const decoded = jwt.verify(token, jwtConfig.JWT_SECRET);
    
    // 查询管理员信息
    const admin = await query(
      'SELECT id, username, role_id, email, avatar, status FROM admin_users WHERE id = ?',
      [decoded.id]
    );
    
    if (!admin || admin.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: '管理员不存在或已被删除'
      });
    }
    
    const adminData = admin[0];
    
    // 检查管理员状态
    if (adminData.status !== 1) {
      return res.status(403).json({
        status: 'error',
        message: '管理员账户已被禁用'
      });
    }
    
    // 将管理员信息添加到请求对象
    req.admin = adminData;
    
    // 继续处理请求
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: '无效的令牌'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: '令牌已过期'
      });
    }
    
    logger.error(`认证中间件错误: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '服务器错误'
    });
  }
};

module.exports = authMiddleware; 
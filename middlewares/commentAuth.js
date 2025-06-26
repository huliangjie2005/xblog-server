/**
 * 评论API专用认证中间件
 */
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
require('dotenv').config();

// 从环境变量获取JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'xblog-test-secret-key-12345';

/**
 * 简化的管理员认证中间件
 * 专门用于评论API的认证
 */
const verifyCommentAdmin = (req, res, next) => {
  try {
    // 记录调试信息
    logger.info(`评论API请求: ${req.method} ${req.path}`);
    console.log(`评论API请求: ${req.method} ${req.path}`);
    
    // 从请求头获取Token
    const authHeader = req.headers.authorization;
    console.log(`请求头Authorization: ${authHeader}`);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('请求头中未提供令牌');
      return res.status(401).json({
        status: 'error',
        message: '未提供访问令牌'
      });
    }

    // 提取Token
    const token = authHeader.split(' ')[1];
    
    // 记录令牌信息
    const tokenInfo = `${token.substring(0, 20)}...`;
    logger.info(`收到令牌: ${tokenInfo}`);
    console.log(`收到令牌: ${tokenInfo}`);
    console.log(`使用密钥: ${JWT_SECRET.substring(0, 5)}...`);
    
    // 尝试直接解码令牌（不验证）
    const decoded = jwt.decode(token);
    console.log(`令牌解码结果: ${JSON.stringify(decoded || {})}`);
    
    // 验证令牌（使用验证）
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      console.log(`令牌验证成功: ${JSON.stringify(verified)}`);
      logger.info(`令牌验证成功，用户信息: ${JSON.stringify(verified)}`);
      
      // 检查是否是管理员角色
      if (verified.role !== 'admin' && verified.role !== 'superadmin') {
        logger.warn(`角色验证失败，当前角色: ${verified.role}`);
        return res.status(403).json({
          status: 'error',
          message: '需要管理员权限'
        });
      }
      
      // 将管理员信息添加到请求对象
      req.user = {
        id: verified.id,
        username: verified.username,
        email: verified.email,
        role: verified.role
      };
      
      // 为兼容性也添加到req.admin
      req.admin = {
        id: verified.id,
        username: verified.username,
        email: verified.email
      };
      
      logger.info(`认证成功，管理员ID: ${verified.id}`);
      console.log(`认证成功，管理员ID: ${verified.id}`);
      
      // 继续处理请求
      next();
    } catch (verifyError) {
      console.log(`验证失败: ${verifyError.message}`);
      logger.error(`令牌验证失败: ${verifyError.message}`);
      
      if (verifyError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          status: 'error',
          message: '无效的令牌'
        });
      } else if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: '令牌已过期'
        });
      } else {
        return res.status(401).json({
          status: 'error',
          message: `令牌验证错误: ${verifyError.message}`
        });
      }
    }
  } catch (error) {
    logger.error(`认证中间件错误: ${error.message}`);
    console.log(`认证中间件错误: ${error.message}`);
    
    return res.status(500).json({
      status: 'error',
      message: '服务器错误'
    });
  }
};

module.exports = {
  verifyCommentAdmin
}; 
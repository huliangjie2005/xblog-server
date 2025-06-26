const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const { query } = require('../config/db');
const jwtConfig = require('../config/jwt');
const { responseError } = require('../utils/response');

/**
 * 验证用户是否已登录
 */
const verifyToken = async (req, res, next) => {
  try {
    // 从请求头获取Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: '未提供访问令牌'
      });
    }

    // 提取Token
    const token = authHeader.split(' ')[1];
    
    // 检查令牌是否在黑名单中
    const tokenBlacklistService = require('../services/tokenBlacklistService');
    const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        status: 'error',
        message: '令牌已失效，请重新登录'
      });
    }
    
    // 验证Token
    const decoded = jwt.verify(token, jwtConfig.JWT_SECRET);
    
    // 确保角色字段存在，默认为'user'
    const role = decoded.role || 'user';
    
    // 将用户信息添加到请求对象
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: role,
      // 添加roles数组以兼容前端需求
      roles: [role]
    };
    
    // 记录用户角色信息，帮助调试
    logger.debug(`验证令牌成功: 用户ID=${decoded.id}, 角色=${role}`);
    
    next();
  } catch (error) {
    logger.error(`令牌验证失败: ${error.message}`);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: '令牌已过期'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: '无效的令牌'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: '身份验证过程中发生错误'
    });
  }
};

/**
 * 验证管理员身份
 */
const verifyAdmin = (req, res, next) => {
  try {
    // 从请求头获取Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: '未提供访问令牌'
      });
    }

    // 提取Token
    const token = authHeader.split(' ')[1];
    
    // 验证Token
    const decoded = jwt.verify(token, jwtConfig.JWT_SECRET);
    
    // 验证管理员角色
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({
        status: 'error',
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
    
    next();
  } catch (error) {
    logger.error(`管理员验证失败: ${error.message}`);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: '令牌已过期'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: '无效的令牌'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: '身份验证过程中发生错误'
    });
  }
};

/**
 * 管理员权限中间件
 */
const isAdmin = async (req, res, next) => {
  if (!req.user) {
    return responseError(res, '未认证的请求', 401);
  }

  try {
    // 检查用户是否是管理员角色
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return responseError(res, '需要管理员权限', 403);
    }
    
    // 验证管理员账户是否有效
    const admin = await query(
      'SELECT * FROM admin_users WHERE id = ? AND status = 1',
      [req.user.id]
    );
    
    if (!admin || admin.length === 0) {
      return responseError(res, '管理员账户已停用', 401);
    }
    
    next();
  } catch (error) {
    logger.error('管理员验证失败:', error.message);
    return responseError(res, '管理员验证失败', 401);
  }
};

/**
 * 超级管理员权限中间件
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return responseError(res, '请先登录', 401);
  }
  
  if (req.user.role !== 'superadmin') {
    return responseError(res, '权限不足', 401);
  }
  
  next();
};

// 验证普通用户权限中间件
const isUser = async (req, res, next) => {
  if (!req.user) {
    return responseError(res, '请先登录', 401);
  }

  try {
    // 普通用户角色验证
    if (req.user.role !== 'user') {
      return responseError(res, '需要用户权限', 403);
    }
    
    // 验证用户账户是否有效
    const user = await query(
      'SELECT * FROM public_users WHERE id = ? AND status = 1',
      [req.user.id]
    );
    
    if (!user || user.length === 0) {
      return responseError(res, '用户账户已停用', 401);
    }
    
    next();
  } catch (error) {
    logger.error('用户验证失败:', error.message);
    return responseError(res, '用户验证失败', 401);
  }
};

/**
 * 用户认证中间件
 * 用于验证用户JWT令牌和访问权限
 */
const auth = async (req, res, next) => {
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
    
    // 查询用户信息
    const user = await query(
      'SELECT id, username, email, avatar, status FROM public_users WHERE id = ?',
      [decoded.id]
    );
    
    if (!user || user.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: '用户不存在或已被删除'
      });
    }
    
    const userData = user[0];
    
    // 检查用户状态
    if (userData.status !== 1) {
      return res.status(403).json({
        status: 'error',
        message: '用户账户已被禁用'
      });
    }
    
    // 将用户信息添加到请求对象
    req.user = userData;
    
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

/**
 * 验证用户是否有特定权限
 * @param {string} permission - 所需权限名称
 */
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // 确保用户已经通过auth中间件认证
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: '用户未认证'
        });
      }
      
      // 查询用户权限
      const permissions = await query(
        `SELECT p.name
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = ?`,
        [req.user.id]
      );
      
      // 检查用户是否拥有所需权限
      const hasPermission = permissions.some(p => p.name === permission);
      
      if (!hasPermission) {
        return res.status(403).json({
          status: 'error',
          message: '没有权限执行此操作'
        });
      }
      
      // 用户有权限，继续处理请求
      next();
    } catch (error) {
      logger.error(`权限检查错误: ${error.message}`);
      return res.status(500).json({
        status: 'error',
        message: '服务器错误'
      });
    }
  };
};

// 导出认证中间件
module.exports = {
  verifyToken,
  verifyAdmin,
  isAdmin,
  isSuperAdmin,
  isUser,
  auth,
  checkPermission,
  verifyUser: auth // 添加verifyUser作为auth的别名，以兼容前面的代码
};
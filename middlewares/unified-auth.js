/**
 * 统一认证中间件
 * 整合所有认证逻辑，替代多个重复的认证中间件
 * 
 * @author XBlog Team
 * @version 2.0.0
 */

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { logger } = require('../utils/logger');
const { query } = require('../config/db');
const { responseError } = require('../utils/response');

/**
 * 认证选项接口
 * @typedef {Object} AuthOptions
 * @property {boolean} requireAuth - 是否需要认证
 * @property {string[]} roles - 允许的角色列表
 * @property {boolean} checkBlacklist - 是否检查令牌黑名单
 * @property {boolean} checkUserStatus - 是否检查用户状态
 * @property {string} userTable - 用户表名 ('admin_users' | 'public_users')
 */

class UnifiedAuth {
  /**
   * 提取并验证JWT令牌
   * @param {Object} req - Express请求对象
   * @returns {Object} 解码后的令牌数据
   */
  static extractAndVerifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('未提供访问令牌');
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.split(' ')[1];
    return {
      token,
      decoded: jwt.verify(token, jwtConfig.JWT_SECRET)
    };
  }

  /**
   * 检查令牌是否在黑名单中
   * @param {string} token - JWT令牌
   * @returns {Promise<boolean>} 是否在黑名单中
   */
  static async checkTokenBlacklist(token) {
    try {
      const tokenBlacklistService = require('../services/tokenBlacklistService');
      return await tokenBlacklistService.isBlacklisted(token);
    } catch (error) {
      logger.warn(`检查令牌黑名单失败: ${error.message}`);
      return false; // 如果检查失败，允许通过
    }
  }

  /**
   * 验证用户状态
   * @param {number} userId - 用户ID
   * @param {string} userTable - 用户表名
   * @returns {Promise<Object>} 用户信息
   */
  static async verifyUserStatus(userId, userTable = 'admin_users') {
    const sql = userTable === 'admin_users' 
      ? 'SELECT id, username, role_id, email, avatar, status FROM admin_users WHERE id = ?'
      : 'SELECT id, username, email, avatar, status FROM public_users WHERE id = ?';
    
    const users = await query(sql, [userId]);
    
    if (!users || users.length === 0) {
      const error = new Error('用户不存在或已被删除');
      error.statusCode = 401;
      throw error;
    }
    
    const user = users[0];
    
    if (user.status !== 1) {
      const error = new Error('用户账户已被禁用');
      error.statusCode = 403;
      throw error;
    }
    
    return user;
  }

  /**
   * 验证用户角色
   * @param {string} userRole - 用户角色
   * @param {string[]} allowedRoles - 允许的角色列表
   * @returns {boolean} 是否有权限
   */
  static verifyRole(userRole, allowedRoles) {
    if (!allowedRoles || allowedRoles.length === 0) {
      return true; // 没有角色限制
    }
    
    return allowedRoles.includes(userRole);
  }

  /**
   * 处理认证错误
   * @param {Error} error - 认证错误
   * @param {Object} res - Express响应对象
   */
  static handleAuthError(error, res) {
    logger.error(`认证失败: ${error.message}`);
    
    let statusCode = error.statusCode || 500;
    let message = error.message || '身份验证过程中发生错误';
    
    if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = '令牌已过期';
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = '无效的令牌';
    }
    
    return res.status(statusCode).json({
      status: 'error',
      message,
      code: statusCode
    });
  }

  /**
   * 创建认证中间件
   * @param {AuthOptions} options - 认证选项
   * @returns {Function} Express中间件函数
   */
  static createAuthMiddleware(options = {}) {
    const {
      requireAuth = true,
      roles = [],
      checkBlacklist = true,
      checkUserStatus = false,
      userTable = 'admin_users'
    } = options;

    return async (req, res, next) => {
      try {
        // 如果不需要认证，直接通过
        if (!requireAuth) {
          return next();
        }

        // 提取并验证令牌
        const { token, decoded } = UnifiedAuth.extractAndVerifyToken(req);

        // 检查令牌黑名单
        if (checkBlacklist) {
          const isBlacklisted = await UnifiedAuth.checkTokenBlacklist(token);
          if (isBlacklisted) {
            return res.status(401).json({
              status: 'error',
              message: '令牌已失效，请重新登录'
            });
          }
        }

        // 验证角色权限
        const userRole = decoded.role || 'user';
        if (!UnifiedAuth.verifyRole(userRole, roles)) {
          return res.status(403).json({
            status: 'error',
            message: '权限不足'
          });
        }

        // 构建用户信息
        let userInfo = {
          id: decoded.id,
          username: decoded.username,
          email: decoded.email,
          role: userRole,
          roles: [userRole]
        };

        // 检查用户状态（可选）
        if (checkUserStatus) {
          const dbUser = await UnifiedAuth.verifyUserStatus(decoded.id, userTable);
          userInfo = { ...userInfo, ...dbUser };
        }

        // 将用户信息添加到请求对象
        req.user = userInfo;
        req.admin = userInfo; // 兼容性

        logger.debug(`认证成功: 用户ID=${decoded.id}, 角色=${userRole}`);
        next();

      } catch (error) {
        UnifiedAuth.handleAuthError(error, res);
      }
    };
  }
}

// 预定义的常用认证中间件
const authMiddlewares = {
  // 基础令牌验证
  verifyToken: UnifiedAuth.createAuthMiddleware({
    requireAuth: true,
    checkBlacklist: true,
    checkUserStatus: false
  }),

  // 管理员认证
  verifyAdmin: UnifiedAuth.createAuthMiddleware({
    requireAuth: true,
    roles: ['admin', 'superadmin'],
    checkBlacklist: true,
    checkUserStatus: true,
    userTable: 'admin_users'
  }),

  // 超级管理员认证
  verifySuperAdmin: UnifiedAuth.createAuthMiddleware({
    requireAuth: true,
    roles: ['superadmin'],
    checkBlacklist: true,
    checkUserStatus: true,
    userTable: 'admin_users'
  }),

  // 普通用户认证
  verifyUser: UnifiedAuth.createAuthMiddleware({
    requireAuth: true,
    roles: ['user'],
    checkBlacklist: true,
    checkUserStatus: true,
    userTable: 'public_users'
  }),

  // 可选认证（用户可以是游客或已登录用户）
  optionalAuth: UnifiedAuth.createAuthMiddleware({
    requireAuth: false
  }),

  // 直接管理员认证（不检查数据库状态，用于高频API）
  directVerifyAdmin: UnifiedAuth.createAuthMiddleware({
    requireAuth: true,
    roles: ['admin', 'superadmin'],
    checkBlacklist: false,
    checkUserStatus: false
  })
};

module.exports = {
  UnifiedAuth,
  createAuthMiddleware: UnifiedAuth.createAuthMiddleware,
  ...authMiddlewares
};

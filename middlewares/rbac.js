/**
 * 基于角色的访问控制中间件
 * 用于检查用户权限
 */
const { logger } = require('../utils/logger');
const permissionService = require('../services/permissionService');
const { responseError } = require('../utils/response');
const { query } = require('../config/db');

/**
 * 检查用户是否具有指定权限
 * @param {string|Array} requiredPermissions - 所需权限代码或权限代码数组
 * @param {boolean} requireAll - 是否需要满足所有权限，默认为false (满足任一权限即可)
 * @returns {Function} Express中间件
 */
function checkPermission(requiredPermissions, requireAll = false) {
  return async (req, res, next) => {
    try {
      // 确保用户已认证
      if (!req.user || !req.user.id) {
        return responseError(res, '未认证的请求', 401);
      }
      
      // 超级管理员始终有所有权限
      if (req.user.role === 'superadmin') {
        return next();
      }
      
      // 转换为数组形式
      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];
      
      // 检查用户是否有所需权限
      const permissionChecks = [];
      for (const permission of permissions) {
        const hasPermission = await permissionService.checkUserPermission(
          req.user.id, 
          permission
        );
        permissionChecks.push(hasPermission);
      }
      
      // 根据requireAll参数决定权限验证逻辑
      const hasAccess = requireAll
        ? permissionChecks.every(check => check) // 需要满足所有权限
        : permissionChecks.some(check => check); // 满足任一权限即可
      
      if (hasAccess) {
        return next();
      }
      
      // 记录权限不足的尝试
      logger.warn(`用户 ${req.user.username} (ID: ${req.user.id}) 尝试访问需要 ${permissions.join(', ')} 权限的资源`);
      
      return responseError(res, '权限不足', 403);
    } catch (error) {
      logger.error(`权限检查失败: ${error.message}`);
      return responseError(res, '权限验证过程中发生错误', 500);
    }
  };
}

/**
 * 检查用户是否具有指定角色
 * @param {string|Array} requiredRoles - 所需角色名称或角色名称数组
 * @returns {Function} Express中间件
 */
function checkRole(requiredRoles) {
  return async (req, res, next) => {
    try {
      // 确保用户已认证
      if (!req.user || !req.user.id) {
        return responseError(res, '未认证的请求', 401);
      }
      
      // 转换为数组形式
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      
      // 检查用户角色
      // 1. 首先检查req.user.role属性（向后兼容）
      if (req.user.role && roles.includes(req.user.role)) {
        return next();
      }
      
      // 2. 如果没有找到匹配的角色，尝试从数据库查询用户角色
      const [userInfo] = await query(`
        SELECT r.code as role_code
        FROM admin_users au
        JOIN roles r ON au.role_id = r.id
        WHERE au.id = ? AND au.status = 1
      `, [req.user.id]);
      
      if (userInfo && userInfo.role_code && roles.includes(userInfo.role_code)) {
        // 更新用户的角色属性（方便后续使用）
        req.user.role = userInfo.role_code;
        return next();
      }
      
      // 记录角色不足的尝试
      const userRole = (req.user.role || (userInfo && userInfo.role_code) || '未知角色');
      logger.warn(`用户 ${req.user.username || req.user.id} (ID: ${req.user.id}, 角色: ${userRole}) 尝试访问需要 ${roles.join(', ')} 角色的资源`);
      
      return responseError(res, '角色权限不足', 403);
    } catch (error) {
      logger.error(`角色检查失败: ${error.message}`);
      return responseError(res, '角色验证过程中发生错误', 500);
    }
  };
}

/**
 * 检查用户是否是资源所有者
 * @param {Function} getResourceOwnerId - 从请求中获取资源所有者ID的函数
 * @returns {Function} Express中间件
 */
function checkOwnership(getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      // 确保用户已认证
      if (!req.user || !req.user.id) {
        return responseError(res, '未认证的请求', 401);
      }
      
      // 超级管理员和管理员可以访问所有资源
      const adminRoles = ['superadmin', 'admin'];
      if (req.user.role && adminRoles.includes(req.user.role)) {
        return next();
      }
      
      // 如果用户没有role属性，检查数据库
      if (!req.user.role) {
        const [userInfo] = await query(`
          SELECT r.code as role_code
          FROM admin_users au
          JOIN roles r ON au.role_id = r.id
          WHERE au.id = ? AND au.status = 1
        `, [req.user.id]);
        
        if (userInfo && userInfo.role_code && adminRoles.includes(userInfo.role_code)) {
          // 更新用户的角色属性（方便后续使用）
          req.user.role = userInfo.role_code;
          return next();
        }
      }
      
      // 获取资源所有者ID
      const ownerId = await getResourceOwnerId(req);
      
      // 检查用户是否是资源所有者
      if (req.user.id === ownerId) {
        return next();
      }
      
      // 对于编辑角色，检查是否有额外的权限
      if (req.user.role === 'editor') {
        // 编辑可以访问所有内容资源，但这里需要根据具体资源类型来确定
        // 这里添加自定义逻辑来检查编辑是否可以访问特定资源
        
        // 例如：如果是文章资源，允许编辑访问
        if (req.baseUrl.includes('/posts') || req.baseUrl.includes('/articles')) {
          return next();
        }
        
        // 例如：如果是评论资源，允许编辑访问
        if (req.baseUrl.includes('/comments')) {
          return next();
        }
      }
      
      // 记录非资源所有者的访问尝试
      logger.warn(`用户 ${req.user.username || req.user.id} (ID: ${req.user.id}) 尝试访问用户 ${ownerId} 的资源`);
      
      return responseError(res, '您没有权限访问此资源', 403);
    } catch (error) {
      logger.error(`所有权检查失败: ${error.message}`);
      return responseError(res, '所有权验证过程中发生错误', 500);
    }
  };
}

module.exports = {
  checkPermission,
  checkRole,
  checkOwnership
}; 
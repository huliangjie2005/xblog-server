/**
 * 角色管理控制器
 * 处理角色和权限相关的请求
 */
const { logger } = require('../../utils/logger');
const permissionService = require('../../services/permissionService');
const { responseSuccess, responseError } = require('../../utils/response');
const { query } = require('../../config/db');

/**
 * 获取所有角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAllRoles(req, res) {
  try {
    // 检查是否需要统计信息
    const withStats = req.query.stats === 'true';
    
    // 添加缓存控制，确保响应不会被缓存
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    let roles;
    if (withStats) {
      roles = await permissionService.getRolesWithStats();
    } else {
      roles = await permissionService.getAllRoles();
    }
    
    return responseSuccess(res, '获取角色列表成功', roles);
  } catch (error) {
    logger.error(`获取角色列表失败: ${error.message}`);
    return responseError(res, '获取角色列表时发生错误', 500);
  }
}

/**
 * 获取所有权限
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAllPermissions(req, res) {
  try {
    const permissions = await permissionService.getAllPermissions();
    
    return responseSuccess(res, '获取权限列表成功', permissions);
  } catch (error) {
    logger.error(`获取权限列表失败: ${error.message}`);
    return responseError(res, '获取权限列表时发生错误', 500);
  }
}

/**
 * 获取角色的权限
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getRolePermissions(req, res) {
  try {
    const { roleId } = req.params;
    
    // 验证角色ID
    if (!roleId || isNaN(parseInt(roleId))) {
      return responseError(res, '无效的角色ID', 400);
    }
    
    const permissions = await permissionService.getRolePermissions(roleId);
    
    return responseSuccess(res, '获取角色权限成功', permissions);
  } catch (error) {
    logger.error(`获取角色权限失败: ${error.message}`);
    return responseError(res, '获取角色权限时发生错误', 500);
  }
}

/**
 * 创建角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function createRole(req, res) {
  try {
    const { name, code, description } = req.body;
    
    // 验证必填字段
    if (!name) {
      return responseError(res, '角色名称不能为空', 400);
    }
    
    const result = await permissionService.createRole({
      name,
      code,
      description: description || ''
    });
    
    if (!result.success) {
      return responseError(res, result.message, 400);
    }
    
    return responseSuccess(res, '角色创建成功', { roleId: result.roleId });
  } catch (error) {
    logger.error(`创建角色失败: ${error.message}`);
    return responseError(res, '创建角色时发生错误', 500);
  }
}

/**
 * 更新角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updateRole(req, res) {
  try {
    const { roleId } = req.params;
    const { name, description } = req.body;
    
    // 验证角色ID
    if (!roleId || isNaN(parseInt(roleId))) {
      return responseError(res, '无效的角色ID', 400);
    }
    
    // 验证必填字段
    if (!name) {
      return responseError(res, '角色名称不能为空', 400);
    }
    
    const result = await permissionService.updateRole(roleId, {
      name,
      description: description || ''
    });
    
    if (!result.success) {
      return responseError(res, result.message, 400);
    }
    
    return responseSuccess(res, '角色更新成功');
  } catch (error) {
    logger.error(`更新角色失败: ${error.message}`);
    return responseError(res, '更新角色时发生错误', 500);
  }
}

/**
 * 删除角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function deleteRole(req, res) {
  try {
    const { roleId } = req.params;
    
    // 验证角色ID
    if (!roleId || isNaN(parseInt(roleId))) {
      return responseError(res, '无效的角色ID', 400);
    }
    
    const result = await permissionService.deleteRole(roleId);
    
    if (!result.success) {
      return responseError(res, result.message, 400);
    }
    
    return responseSuccess(res, '角色删除成功');
  } catch (error) {
    logger.error(`删除角色失败: ${error.message}`);
    return responseError(res, '删除角色时发生错误', 500);
  }
}

/**
 * 为角色分配权限
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function assignPermissionsToRole(req, res) {
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;
    
    // 验证角色ID
    if (!roleId || isNaN(parseInt(roleId))) {
      return responseError(res, '无效的角色ID', 400);
    }
    
    // 验证权限ID数组
    if (!Array.isArray(permissionIds)) {
      return responseError(res, '权限ID必须是数组', 400);
    }
    
    const result = await permissionService.assignPermissionsToRole(roleId, permissionIds);
    
    if (!result.success) {
      return responseError(res, result.message, 400);
    }
    
    return responseSuccess(res, '权限分配成功');
  } catch (error) {
    logger.error(`分配权限失败: ${error.message}`);
    return responseError(res, '分配权限时发生错误', 500);
  }
}

/**
 * 为用户分配角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function assignRoleToUser(req, res) {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    
    // 验证用户ID
    if (!userId || isNaN(parseInt(userId))) {
      return responseError(res, '无效的用户ID', 400);
    }
    
    // 验证角色ID
    if (!roleId || isNaN(parseInt(roleId))) {
      return responseError(res, '无效的角色ID', 400);
    }
    
    const result = await permissionService.assignRoleToUser(userId, roleId);
    
    if (!result.success) {
      return responseError(res, result.message, 400);
    }
    
    return responseSuccess(res, '角色分配成功');
  } catch (error) {
    logger.error(`分配角色失败: ${error.message}`);
    return responseError(res, '分配角色时发生错误', 500);
  }
}

/**
 * 批量为用户分配角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function assignRoleToUsers(req, res) {
  try {
    const { userIds, roleId } = req.body;
    
    // 验证用户ID数组
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return responseError(res, '用户ID必须是非空数组', 400);
    }
    
    // 验证角色ID
    if (!roleId || isNaN(parseInt(roleId))) {
      return responseError(res, '无效的角色ID', 400);
    }
    
    const result = await permissionService.assignRoleToUsers(userIds, roleId);
    
    if (!result.success) {
      return responseError(res, result.message, 400);
    }
    
    return responseSuccess(res, result.message);
  } catch (error) {
    logger.error(`批量分配角色失败: ${error.message}`);
    return responseError(res, '批量分配角色时发生错误', 500);
  }
}

/**
 * 获取用户的权限
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getUserPermissions(req, res) {
  try {
    const { userId } = req.params;
    
    // 验证用户ID
    if (!userId || isNaN(parseInt(userId))) {
      return responseError(res, '无效的用户ID', 400);
    }
    
    const permissions = await permissionService.getUserPermissions(userId);
    
    return responseSuccess(res, '获取用户权限成功', permissions);
  } catch (error) {
    logger.error(`获取用户权限失败: ${error.message}`);
    return responseError(res, '获取用户权限时发生错误', 500);
  }
}

/**
 * 清理重复角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function cleanDuplicateRoles(req, res) {
  try {
    // 事务处理
    await query('START TRANSACTION');
    
    try {
      // 1. 获取所有角色
      const roles = await query('SELECT * FROM roles ORDER BY id');
      
      // 2. 按code分组找出重复角色
      const rolesByCode = new Map();
      roles.forEach(role => {
        // 标准化角色编码（去除后缀数字和连字符）
        const baseCode = role.code.replace(/[-_]\d+$/, '');
        
        if (!rolesByCode.has(baseCode)) {
          rolesByCode.set(baseCode, [role]);
        } else {
          rolesByCode.get(baseCode).push(role);
        }
      });
      
      // 3. 处理重复角色
      const cleanResults = [];
      for (const [code, roleGroup] of rolesByCode.entries()) {
        if (roleGroup.length > 1) {
          // 保留第一个角色（通常ID较小的那个）
          const mainRole = roleGroup[0];
          const duplicates = roleGroup.slice(1);
          
          // 更新用户关联 (admin_users表)
          for (const dup of duplicates) {
            // 更新用户关联
            const userUpdateResult = await query('UPDATE admin_users SET role_id = ? WHERE role_id = ?', 
              [mainRole.id, dup.id]);
            
            // 合并角色权限
            const permMergeResult = await query(`
              INSERT IGNORE INTO role_permissions (role_id, permission_id)
              SELECT ?, permission_id FROM role_permissions WHERE role_id = ?
            `, [mainRole.id, dup.id]);
            
            // 删除重复角色的权限关联
            const permDeleteResult = await query('DELETE FROM role_permissions WHERE role_id = ?', [dup.id]);
            
            // 删除重复角色
            const roleDeleteResult = await query('DELETE FROM roles WHERE id = ?', [dup.id]);
            
            cleanResults.push({
              mainRole: { id: mainRole.id, name: mainRole.name, code: mainRole.code },
              duplicate: { id: dup.id, name: dup.name, code: dup.code },
              usersUpdated: userUpdateResult.affectedRows || 0,
              permissionsMerged: permMergeResult.affectedRows || 0,
              permissionsDeleted: permDeleteResult.affectedRows || 0,
              roleDeleted: roleDeleteResult.affectedRows > 0
            });
          }
        }
      }
      
      // 提交事务
      await query('COMMIT');
      
      return responseSuccess(res, `成功清理 ${cleanResults.length} 个重复角色`, { results: cleanResults });
      
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`清理重复角色失败: ${error.message}`);
    return responseError(res, '清理重复角色时发生错误', 500);
  }
}

module.exports = {
  getAllRoles,
  getAllPermissions,
  getRolePermissions,
  createRole,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
  assignRoleToUser,
  assignRoleToUsers,
  getUserPermissions,
  cleanDuplicateRoles
}; 
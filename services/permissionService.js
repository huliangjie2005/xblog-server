/**
 * 权限管理服务
 * 处理角色和权限相关的功能
 */
const { query } = require('../config/db');
const { logger } = require('../utils/logger');

/**
 * 获取角色的所有权限
 * @param {number} roleId - 角色ID
 * @returns {Promise<Array>} 权限列表
 */
async function getRolePermissions(roleId) {
  try {
    const sql = `
      SELECT p.id, p.name, p.code, p.display_name, p.description
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `;
    
    const permissions = await query(sql, [roleId]);
    return permissions;
  } catch (error) {
    logger.error(`获取角色权限失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取所有角色
 * @returns {Promise<Array>} 角色列表
 */
async function getAllRoles() {
  try {
    const sql = 'SELECT id, name, code, description FROM roles';
    return await query(sql);
  } catch (error) {
    logger.error(`获取所有角色失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取所有角色，附带用户数量统计
 * @returns {Promise<Array>} 带统计信息的角色列表
 */
async function getRolesWithStats() {
  try {
    // 获取角色基本信息
    const roles = await query(`
      SELECT r.id, r.name, r.code, r.description, r.created_at
      FROM roles r
      ORDER BY r.id
    `);
    
    // 获取普通用户的角色统计 (从user_roles关联表统计)
    const publicUserStats = await query(`
      SELECT ur.role_id, COUNT(DISTINCT ur.user_id) as count
      FROM user_roles ur
      JOIN public_users pu ON ur.user_id = pu.id
      WHERE pu.status = 1
      GROUP BY ur.role_id
    `);
    
    // 获取管理员用户的角色统计 (直接从admin_users表统计)
    const adminUserStats = await query(`
      SELECT role_id, COUNT(*) as count
      FROM admin_users
      WHERE status = 1
      GROUP BY role_id
    `);
    
    // 获取管理员用户通过user_roles表关联的角色统计
    const adminUserRolesStats = await query(`
      SELECT ur.role_id, COUNT(DISTINCT ur.user_id) as count
      FROM user_roles ur
      JOIN admin_users au ON ur.user_id = au.id
      WHERE au.status = 1
      GROUP BY ur.role_id
    `);
    
    // 合并统计数据
    const roleStats = new Map();
    const roleUserSources = new Map();
    
    // 处理普通用户统计
    publicUserStats.forEach(stat => {
      if (stat.role_id) {
        roleStats.set(stat.role_id, (roleStats.get(stat.role_id) || 0) + stat.count);
        
        // 记录用户来源
        if (!roleUserSources.has(stat.role_id)) {
          roleUserSources.set(stat.role_id, { publicUsers: 0, adminUsers: 0, adminUserRoles: 0 });
        }
        roleUserSources.get(stat.role_id).publicUsers = stat.count;
      }
    });
    
    // 处理管理员用户统计 (admin_users表)
    adminUserStats.forEach(stat => {
      if (stat.role_id) {
        roleStats.set(stat.role_id, (roleStats.get(stat.role_id) || 0) + stat.count);
        
        // 记录用户来源
        if (!roleUserSources.has(stat.role_id)) {
          roleUserSources.set(stat.role_id, { publicUsers: 0, adminUsers: 0, adminUserRoles: 0 });
        }
        roleUserSources.get(stat.role_id).adminUsers = stat.count;
      }
    });
    
    // 处理管理员用户关联统计 (user_roles表)
    adminUserRolesStats.forEach(stat => {
      if (stat.role_id) {
        roleStats.set(stat.role_id, (roleStats.get(stat.role_id) || 0) + stat.count);
        
        // 记录用户来源
        if (!roleUserSources.has(stat.role_id)) {
          roleUserSources.set(stat.role_id, { publicUsers: 0, adminUsers: 0, adminUserRoles: 0 });
        }
        roleUserSources.get(stat.role_id).adminUserRoles = stat.count;
      }
    });
    
    // 整合数据
    const result = roles.map(role => ({
      ...role,
      userCount: roleStats.get(role.id) || 0,
      userSources: roleUserSources.get(role.id) || { publicUsers: 0, adminUsers: 0, adminUserRoles: 0 }
    }));
    
    return result;
  } catch (error) {
    logger.error(`获取角色统计失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取所有权限
 * @returns {Promise<Array>} 权限列表
 */
async function getAllPermissions() {
  try {
    const sql = 'SELECT id, name, code, display_name, description, `group` FROM permissions ORDER BY `group`, display_name';
    return await query(sql);
  } catch (error) {
    logger.error(`获取所有权限失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建新角色
 * @param {Object} roleData - 角色数据
 * @param {string} roleData.name - 角色名称
 * @param {string} roleData.description - 角色描述
 * @returns {Promise<Object>} 创建结果
 */
async function createRole(roleData) {
  try {
    const { name, code, description } = roleData;
    
    // 如果没有提供code，则根据name生成
    const roleCode = code || name.toLowerCase().replace(/\s+/g, '_');
    
    // 检查角色名是否已存在
    const existingRole = await query('SELECT id FROM roles WHERE name = ? OR code = ?', [name, roleCode]);
    if (existingRole && existingRole.length > 0) {
      return { success: false, message: '角色名或角色代码已存在' };
    }
    
    const sql = 'INSERT INTO roles (name, code, description) VALUES (?, ?, ?)';
    const result = await query(sql, [name, roleCode, description]);
    
    return { 
      success: true, 
      message: '角色创建成功', 
      roleId: result.insertId 
    };
  } catch (error) {
    logger.error(`创建角色失败: ${error.message}`);
    return { success: false, message: '创建角色时发生错误' };
  }
}

/**
 * 更新角色
 * @param {number} roleId - 角色ID
 * @param {Object} roleData - 角色数据
 * @returns {Promise<Object>} 更新结果
 */
async function updateRole(roleId, roleData) {
  try {
    const { name, description } = roleData;
    
    // 检查角色是否存在
    const existingRole = await query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!existingRole || existingRole.length === 0) {
      return { success: false, message: '角色不存在' };
    }
    
    // 检查角色名是否与其他角色重复
    const duplicateRole = await query('SELECT id FROM roles WHERE name = ? AND id != ?', [name, roleId]);
    if (duplicateRole && duplicateRole.length > 0) {
      return { success: false, message: '角色名已被其他角色使用' };
    }
    
    const sql = 'UPDATE roles SET name = ?, description = ? WHERE id = ?';
    await query(sql, [name, description, roleId]);
    
    return { success: true, message: '角色更新成功' };
  } catch (error) {
    logger.error(`更新角色失败: ${error.message}`);
    return { success: false, message: '更新角色时发生错误' };
  }
}

/**
 * 删除角色
 * @param {number} roleId - 角色ID
 * @returns {Promise<Object>} 删除结果
 */
async function deleteRole(roleId) {
  try {
    // 检查角色是否存在
    const existingRole = await query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!existingRole || existingRole.length === 0) {
      return { success: false, message: '角色不存在' };
    }
    
    // 检查角色是否被普通用户使用 (通过user_roles表)
    const usedByPublicUsers = await query('SELECT user_id FROM user_roles WHERE role_id = ?', [roleId]);
    
    // 检查角色是否被管理员用户使用 (直接在admin_users表中)
    const usedByAdminUsers = await query('SELECT id FROM admin_users WHERE role_id = ?', [roleId]);
    
    // 如果角色被任何用户使用，则不允许删除
    if ((usedByPublicUsers && usedByPublicUsers.length > 0) || 
        (usedByAdminUsers && usedByAdminUsers.length > 0)) {
      return { success: false, message: '该角色正在被用户使用，无法删除' };
    }
    
    // 开始事务
    await query('START TRANSACTION');
    
    try {
      // 删除角色权限关联
      await query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
      
      // 删除角色
      await query('DELETE FROM roles WHERE id = ?', [roleId]);
      
      // 提交事务
      await query('COMMIT');
      
      return { success: true, message: '角色删除成功' };
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`删除角色失败: ${error.message}`);
    return { success: false, message: '删除角色时发生错误' };
  }
}

/**
 * 为角色分配权限
 * @param {number} roleId - 角色ID
 * @param {Array<number>} permissionIds - 权限ID数组
 * @returns {Promise<Object>} 分配结果
 */
async function assignPermissionsToRole(roleId, permissionIds) {
  try {
    // 检查角色是否存在
    const existingRole = await query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!existingRole || existingRole.length === 0) {
      return { success: false, message: '角色不存在' };
    }
    
    // 开始事务
    await query('START TRANSACTION');
    
    try {
      // 删除现有权限
      await query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
      
      // 如果有新权限，则添加
      if (permissionIds && permissionIds.length > 0) {
        // 构建批量插入的值
        const values = permissionIds.map(permId => [roleId, permId]);
        
        // 批量插入权限
        const insertSql = 'INSERT INTO role_permissions (role_id, permission_id) VALUES ?';
        await query(insertSql, [values]);
      }
      
      // 提交事务
      await query('COMMIT');
      
      return { success: true, message: '权限分配成功' };
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`分配权限失败: ${error.message}`);
    return { success: false, message: '分配权限时发生错误' };
  }
}

/**
 * 检查用户是否有特定权限
 * @param {number} userId - 用户ID
 * @param {string} permissionCode - 权限代码
 * @returns {Promise<boolean>} 是否有权限
 */
async function checkUserPermission(userId, permissionCode) {
  try {
    const sql = `
      SELECT COUNT(*) as count
      FROM public_users pu
      JOIN user_roles ur ON pu.id = ur.user_id
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE pu.id = ? AND p.code = ?
    `;
    
    const result = await query(sql, [userId, permissionCode]);
    return result[0].count > 0;
  } catch (error) {
    logger.error(`检查用户权限失败: ${error.message}`);
    return false;
  }
}

/**
 * 为用户分配角色
 * @param {number} userId - 用户ID
 * @param {number} roleId - 角色ID
 * @returns {Promise<Object>} 分配结果
 */
async function assignRoleToUser(userId, roleId) {
  try {
    // 检查用户和角色是否存在
    const [user] = await query('SELECT id FROM public_users WHERE id = ?', [userId]);
    if (!user) {
      return { success: false, message: '用户不存在' };
    }
    
    const [role] = await query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!role) {
      return { success: false, message: '角色不存在' };
    }
    
    // 开始事务
    await query('START TRANSACTION');
    
    try {
      // 先删除用户现有的角色关联
      await query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
      
      // 添加新的角色关联
      await query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
      
      // 提交事务
      await query('COMMIT');
      
      return { success: true, message: '角色分配成功' };
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`为用户分配角色失败: ${error.message}`);
    return { success: false, message: '为用户分配角色时发生错误' };
  }
}

/**
 * 批量为用户分配角色
 * @param {Array<number>} userIds - 用户ID数组
 * @param {number} roleId - 角色ID
 * @returns {Promise<Object>} 分配结果
 */
async function assignRoleToUsers(userIds, roleId) {
  try {
    // 检查角色是否存在
    const [role] = await query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!role) {
      return { success: false, message: '角色不存在' };
    }
    
    // 开始事务
    await query('START TRANSACTION');
    
    try {
      // 更新每个用户的角色
      for (const userId of userIds) {
        // 先删除用户现有的角色关联
        await query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
        
        // 添加新的角色关联
        await query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
      }
      
      // 提交事务
      await query('COMMIT');
      
      return { 
        success: true, 
        message: `已成功为 ${userIds.length} 个用户分配角色` 
      };
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`批量分配角色失败: ${error.message}`);
    return { success: false, message: '批量分配角色时发生错误' };
  }
}

/**
 * 获取用户拥有的所有权限
 * @param {number} userId - 用户ID
 * @returns {Promise<Array>} 权限列表
 */
async function getUserPermissions(userId) {
  try {
    // 查询用户角色
    const userRoles = await query('SELECT role_id FROM user_roles WHERE user_id = ?', [userId]);
    
    if (!userRoles || userRoles.length === 0) {
      return [];
    }
    
    // 提取角色ID
    const roleIds = userRoles.map(role => role.role_id);
    
    // 查询角色权限
    const permissions = await query(`
      SELECT p.id, p.name, p.code, p.display_name, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id IN (?)
    `, [roleIds]);
    
    return permissions;
  } catch (error) {
    logger.error(`获取用户权限失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getRolePermissions,
  getAllRoles,
  getRolesWithStats,
  getAllPermissions,
  createRole,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
  checkUserPermission,
  assignRoleToUser,
  assignRoleToUsers,
  getUserPermissions
}; 
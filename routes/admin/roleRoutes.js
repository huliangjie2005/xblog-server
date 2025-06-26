/**
 * 角色管理路由
 */
const express = require('express');
const router = express.Router();
const roleController = require('../../controllers/admin/roleController');
const { verifyToken, isAdmin } = require('../../middlewares/auth');
const { checkRole } = require('../../middlewares/rbac');
const { checkPermission } = require('../../middlewares/rbac');
const { query } = require('../../utils/db');

// 所有路由都需要管理员权限
router.use(verifyToken, isAdmin);

// GET /api/admin/roles - 获取所有角色
router.get('/', roleController.getAllRoles);

// GET /api/admin/roles/permissions - 获取所有权限
router.get('/permissions', roleController.getAllPermissions);

// GET /api/admin/roles/:roleId/permissions - 获取角色的权限
router.get('/:roleId/permissions', roleController.getRolePermissions);

// GET /api/admin/users/:userId/permissions - 获取用户的权限
router.get('/users/:userId/permissions', roleController.getUserPermissions);

// 以下路由需要超级管理员权限
router.use(checkRole('superadmin'));

// POST /api/admin/roles - 创建角色
router.post('/', roleController.createRole);

// PUT /api/admin/roles/:roleId - 更新角色
router.put('/:roleId', roleController.updateRole);

// DELETE /api/admin/roles/:roleId - 删除角色
router.delete('/:roleId', roleController.deleteRole);

// POST /api/admin/roles/:roleId/permissions - 为角色分配权限
router.post('/:roleId/permissions', roleController.assignPermissionsToRole);

// PUT /api/admin/users/:userId/role - 为用户分配角色
router.put('/users/:userId/role', roleController.assignRoleToUser);

// POST /api/admin/roles/batch-assign - 批量为用户分配角色
router.post('/batch-assign', roleController.assignRoleToUsers);

// 添加角色管理相关的路由
router.post('/clean-duplicates', verifyToken, checkPermission('role.manage'), roleController.cleanDuplicateRoles);

// 临时路由：修复用户角色关联
router.get('/fix-user-roles', verifyToken, async (req, res) => {
  try {
    // 1. 清空现有的user_roles表
    await query('DELETE FROM user_roles');
    
    // 2. 获取ID为84的用户
    const user = await query('SELECT id, username FROM public_users WHERE id = 84');
    
    if (user && user.length > 0) {
      // 3. 获取管理员角色
      const adminRole = await query('SELECT id FROM roles WHERE code = ?', ['admin']);
      
      if (adminRole && adminRole.length > 0) {
        // 4. 为用户分配管理员角色
        await query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', 
          [user[0].id, adminRole[0].id]
        );
        
        return res.json({
          success: true,
          message: `用户角色关联修复成功! 用户 ${user[0].username}(ID: ${user[0].id}) 已分配管理员角色(ID: ${adminRole[0].id})`,
          data: {
            user: user[0],
            role: adminRole[0]
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: '找不到管理员角色'
        });
      }
    } else {
      return res.status(404).json({
        success: false,
        message: '找不到ID为84的用户'
      });
    }
  } catch (error) {
    console.error('修复用户角色关联失败:', error);
    return res.status(500).json({
      success: false,
      message: '修复用户角色关联时发生错误',
      error: error.message
    });
  }
});

module.exports = router; 
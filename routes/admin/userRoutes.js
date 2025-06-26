/**
 * 管理员用户管理路由
 */
const express = require('express');
const router = express.Router();
const userService = require('../../services/userService');
const { verifyToken, isAdmin } = require('../../middlewares/auth');
const ApiResponse = require('../../utils/response');
const { logger } = require('../../utils/logger');
const { query } = require('../../config/db');

/**
 * @swagger
 * tags:
 *   name: 用户管理
 *   description: 管理员用户管理相关API
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: 获取所有用户信息列表
 *     tags: [用户管理]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页条数
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: created_at
 *         description: 排序字段
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序方式
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词(用户名或邮箱)
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: 状态筛选(1:启用, 0:禁用)
 *     responses:
 *       200:
 *         description: 获取用户列表成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 获取用户列表成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
 *                           nickname:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                           status:
 *                             type: integer
 *                           created_at:
 *                             type: string
 *                           last_login:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { page, limit, sort, order, search, status } = req.query;
    
    // 调用服务方法获取用户列表
    const result = await userService.getAllUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sort: sort || 'created_at',
      order: order || 'desc',
      search: search || '',
      status: status !== undefined ? parseInt(status) : null
    });
    
    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
        data: {
          users: result.users,
          pagination: result.pagination
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    logger.error('获取用户列表失败:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: '获取用户列表时发生错误',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: 获取单个用户详情
 *     tags: [用户管理]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 获取用户详情成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 获取用户详情成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         nickname:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                         status:
 *                           type: integer
 *                         created_at:
 *                           type: string
 *                         updated_at:
 *                           type: string
 *                         last_login:
 *                           type: string
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器内部错误
 */
router.get('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID'
      });
    }
    
    // 查询用户信息
    const sql = `
      SELECT id, username, email, nickname, avatar, status, created_at, updated_at, last_login
      FROM public_users
      WHERE id = ?
    `;
    
    const users = await query(sql, [userId]);
    
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 获取用户角色
    const rolesSql = `
      SELECT r.code
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `;
    
    const roles = await query(rolesSql, [userId]);
    
    // 添加角色信息到用户对象
    const userWithRoles = {
      ...users[0],
      roles: roles.map(role => role.code)
    };
    
    return res.json({
      success: true,
      message: '获取用户详情成功',
      data: {
        user: userWithRoles
      }
    });
  } catch (error) {
    logger.error('获取用户详情失败:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: '获取用户详情时发生错误',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: 更新用户信息
 *     tags: [用户管理]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               nickname:
 *                 type: string
 *               email:
 *                 type: string
 *               avatar:
 *                 type: string
 *               status:
 *                 type: integer
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: 用户信息更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 用户信息更新成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器内部错误
 */
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID'
      });
    }
    
    const { username, nickname, email, avatar, status, roles } = req.body;
    
    // 检查用户是否存在
    const userCheck = await query(
      'SELECT id FROM public_users WHERE id = ?',
      [userId]
    );
    
    if (!userCheck || userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 开始事务
    await query('START TRANSACTION');
    
    try {
      // 构建更新字段和参数
      const updates = [];
      const params = [];
      
      if (username) {
        updates.push('username = ?');
        params.push(username);
      }
      
      if (nickname) {
        updates.push('nickname = ?');
        params.push(nickname);
      }
      
      if (email) {
        updates.push('email = ?');
        params.push(email);
      }
      
      if (avatar) {
        updates.push('avatar = ?');
        params.push(avatar);
      }
      
      if (status !== undefined) {
        updates.push('status = ?');
        params.push(parseInt(status));
      }
      
      // 如果有基本信息需要更新
      if (updates.length > 0) {
        // 添加用户ID到参数数组
        params.push(userId);
        
        // 执行更新
        const sql = `
          UPDATE public_users
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = ?
        `;
        
        const result = await query(sql, params);
        
        if (result.affectedRows === 0) {
          throw new Error('用户不存在或更新失败');
        }
      }
      
      // 如果提供了角色信息，则更新用户角色
      if (roles && roles.length > 0) {
        // 获取角色ID
        const permissionService = require('../../services/permissionService');
        const roleQuery = await query('SELECT id FROM roles WHERE code = ?', [roles[0]]);
        
        if (roleQuery && roleQuery.length > 0) {
          const roleId = roleQuery[0].id;
          // 分配角色给用户
          await permissionService.assignRoleToUser(userId, roleId);
        }
      }
      
      // 提交事务
      await query('COMMIT');
      
      // 获取更新后的用户信息
      const updatedUser = await query(
        'SELECT id, username, nickname, email, avatar, status FROM public_users WHERE id = ?',
        [userId]
      );
      
      // 获取用户角色
      const rolesSql = `
        SELECT r.code
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `;
      
      const userRoles = await query(rolesSql, [userId]);
      
      // 添加角色信息到用户对象
      const userWithRoles = {
        ...updatedUser[0],
        roles: userRoles.map(role => role.code)
      };
      
      return res.json({
        success: true,
        message: '用户信息更新成功',
        data: {
          user: userWithRoles
        }
      });
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('更新用户信息失败:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: '更新用户信息时发生错误',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   patch:
 *     summary: 更新用户状态
 *     tags: [用户管理]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: integer
 *                 enum: [0, 1]
 *                 description: 用户状态(1:启用, 0:禁用)
 *     responses:
 *       200:
 *         description: 用户状态更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 用户状态更新成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器内部错误
 */
router.patch('/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID'
      });
    }
    
    if (status === undefined || ![0, 1].includes(parseInt(status))) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值，必须是0或1'
      });
    }
    
    // 检查用户是否存在
    const userCheck = await query(
      'SELECT id FROM public_users WHERE id = ?',
      [userId]
    );
    
    if (!userCheck || userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 更新用户状态
    const result = await query(
      'UPDATE public_users SET status = ?, updated_at = NOW() WHERE id = ?',
      [parseInt(status), userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在或状态更新失败'
      });
    }
    
    return res.json({
      success: true,
      message: '用户状态更新成功',
      data: {
        status: parseInt(status)
      }
    });
  } catch (error) {
    logger.error('更新用户状态失败:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: '更新用户状态时发生错误',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/reset-password:
 *   post:
 *     summary: 重置用户密码
 *     tags: [用户管理]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: 新密码
 *     responses:
 *       200:
 *         description: 密码重置成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 密码重置成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器内部错误
 */
router.post('/:id/reset-password', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { password } = req.body;
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID'
      });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码不能为空且长度必须至少为6个字符'
      });
    }
    
    // 检查用户是否存在
    const userCheck = await query(
      'SELECT id FROM public_users WHERE id = ?',
      [userId]
    );
    
    if (!userCheck || userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 加密新密码
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 更新密码
    const result = await query(
      'UPDATE public_users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在或密码重置失败'
      });
    }
    
    return res.json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    logger.error('重置用户密码失败:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: '重置用户密码时发生错误',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: 删除指定用户
 *     tags: [用户管理]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 用户删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 用户删除成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedUser:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器内部错误
 */
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID'
      });
    }
    
    // 调用服务方法删除用户
    const result = await userService.deleteUser(userId);
    
    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
        data: {
          deletedUser: result.deletedUser
        }
      });
    } else {
      // 根据错误类型返回适当的状态码
      const statusCode = result.message.includes('不存在') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    logger.error('删除用户失败:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: '删除用户时发生错误',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
});

module.exports = router; 
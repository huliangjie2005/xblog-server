/**
 * 管理员认证路由
 */
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/admin/authController');
const { verifyToken, isAdmin } = require('../../middlewares/auth');
const { validate, adminLoginValidationRules, registerValidationRules } = require('../../middlewares/validation');

// 禁用管理员注册功能，改用拒绝请求的控制器方法
router.post('/register', authController.disableRegister);

// POST /api/admin/auth/login - 管理员登录
router.post('/login', adminLoginValidationRules, validate, authController.login);

// GET /api/admin/auth/me - 获取当前管理员信息
router.get('/me', verifyToken, isAdmin, authController.getCurrentAdmin);

// POST /api/admin/auth/logout - 管理员登出
router.post('/logout', verifyToken, authController.logout);

module.exports = router; 
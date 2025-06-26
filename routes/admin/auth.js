const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config');
const { verifyAdmin } = require('../../middlewares/unified-auth');
const ApiResponse = require('../../utils/response');
const { redisClient } = require('../../utils/redis');
const AdminModel = require('../../models/admin.model');
const { rateLimits, validationRules, handleValidationErrors } = require('../../middlewares/enhanced-validation');

// 管理员登录
router.post('/login',
  rateLimits.auth, // 登录限流
  [
    validationRules.email,
    validationRules.password,
    handleValidationErrors
  ],
  async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const admin = await AdminModel.findByEmail(email);
    if (!admin || !admin.comparePassword(password)) {
      return res.status(401).json(ApiResponse.error('邮箱或密码错误', 401));
    }

    const token = jwt.sign(
      { userId: admin.id, isAdmin: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json(ApiResponse.success({ token, user: admin.toJSON() }));
  } catch (error) {
    return res.status(500).json(ApiResponse.error('登录失败', 500));
  }
});

// 获取当前管理员信息
router.get('/me', adminAuth, async (req, res) => {
  try {
    const admin = await AdminModel.findById(req.user.id);
    if (!admin) {
      return res.status(404).json(ApiResponse.error('管理员不存在', 404));
    }
    return res.json(ApiResponse.success({ user: admin.toJSON() }));
  } catch (error) {
    return res.status(500).json(ApiResponse.error('获取信息失败', 500));
  }
});

// 管理员登出
router.post('/logout', adminAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    
    // 将token加入黑名单
    await redisClient.set(
      `bl_${token}`,
      '1',
      'EX',
      24 * 60 * 60 // 24小时后过期
    );

    return res.json(ApiResponse.success(null, '登出成功'));
  } catch (error) {
    return res.status(500).json(ApiResponse.error('登出失败', 500));
  }
});

module.exports = router; 
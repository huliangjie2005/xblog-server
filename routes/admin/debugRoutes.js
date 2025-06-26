/**
 * 调试路由 - 用于测试认证和评论API问题
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { directVerifyAdmin } = require('../../middlewares/directAuth');

// 使用与directAuth.js相同的JWT密钥
const JWT_SECRET = 'xblog-test-secret-key-12345';

/**
 * @route GET /api/admin/debug/status
 * @desc 检查服务器状态
 * @access Public
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '服务器正常运行',
    time: new Date().toISOString(),
    routes: {
      status: '/api/admin/debug/status',
      tokenTest: '/api/admin/debug/token-test',
      authTest: '/api/admin/debug/auth-test',
      commentTest: '/api/admin/debug/comment-test'
    }
  });
});

/**
 * @route POST /api/admin/debug/token-test
 * @desc 测试JWT令牌验证
 * @access Public
 */
router.post('/token-test', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: '未提供令牌'
      });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return res.status(200).json({
        status: 'success',
        message: '令牌验证成功',
        decoded,
        secretUsed: JWT_SECRET.substring(0, 5) + '...'
      });
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: '令牌验证失败',
        error: error.message,
        name: error.name
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '服务器错误',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/debug/auth-test
 * @desc 测试directVerifyAdmin中间件
 * @access Private (需要验证)
 */
router.get('/auth-test', directVerifyAdmin, (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: '认证中间件测试成功',
    user: req.user,
    admin: req.admin,
    headers: {
      authorization: req.headers.authorization ? '已提供' : '未提供'
    }
  });
});

/**
 * @route GET /api/admin/debug/comment-test
 * @desc 测试评论API认证
 * @access Private (需要验证)
 */
router.get('/comment-test', directVerifyAdmin, (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: '评论API认证测试成功',
    user: req.user,
    admin: req.admin,
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 
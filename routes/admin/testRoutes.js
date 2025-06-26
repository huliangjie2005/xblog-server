/**
 * 特殊测试路由
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// 环境变量中的JWT密钥
const JWT_SECRET = 'xblog-test-secret-key-12345';

/**
 * @route GET /api/admin/test/public
 * @desc 公开测试端点，无需认证
 * @access Public
 */
router.get('/public', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '公开测试端点',
    time: new Date().toISOString()
  });
});

/**
 * @route GET /api/admin/test/auth
 * @desc 简单认证测试端点
 * @access Private (管理员)
 */
router.get('/auth', (req, res) => {
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
    
    try {
      // 验证令牌
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // 返回成功
      return res.status(200).json({
        status: 'success',
        message: '认证成功',
        user: decoded,
        time: new Date().toISOString(),
        secretUsed: JWT_SECRET.substring(0, 5) + '...'
      });
    } catch (error) {
      console.error('令牌验证失败:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          status: 'error',
          message: '无效的令牌',
          details: error.message
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: '令牌已过期'
        });
      }
      
      return res.status(500).json({
        status: 'error',
        message: '服务器错误'
      });
    }
  } catch (error) {
    console.error('处理请求失败:', error.message);
    return res.status(500).json({
      status: 'error',
      message: '服务器错误'
    });
  }
});

/**
 * @route GET /api/admin/test/debug
 * @desc 调试测试端点
 * @access Public
 */
router.get('/debug', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: '调试信息',
    headers: req.headers,
    method: req.method,
    path: req.path,
    secret: JWT_SECRET.substring(0, 5) + '...',
    time: new Date().toISOString()
  });
});

module.exports = router;
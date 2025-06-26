/**
 * 直接的路由处理器
 * 用于处理前端直接访问的API
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const userController = require('../controllers/public/userController');
const { logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs-extra');

// 直接处理密码更新请求
router.put('/api/user/password', verifyToken, (req, res) => {
  logger.info('收到直接的密码更新请求');
  return userController.updatePassword(req, res);
});

/**
 * 图像直接访问路由 - 用于解决CORS问题
 */
router.get('/image/:folder/:filename', (req, res) => {
  try {
    const { folder, filename } = req.params;
    
    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || folder.includes('..')) {
      logger.warn(`可疑的图像访问请求，可能是路径遍历: ${folder}/${filename}`);
      return res.status(403).send('禁止访问');
    }
    
    // 构建图像路径
    const imagePath = path.join(__dirname, '../public/uploads', folder, filename);
    logger.info(`图像访问请求: ${imagePath}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      logger.warn(`请求的图像不存在: ${imagePath}`);
      return res.status(404).send('图像不存在');
    }
    
    // 设置CORS头
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    
    // 根据文件扩展名设置正确的MIME类型
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      default:
        contentType = 'application/octet-stream';
    }
    
    res.setHeader('Content-Type', contentType);
    
    // 发送文件
    res.sendFile(imagePath);
    
  } catch (error) {
    logger.error('图像访问错误:', error);
    res.status(500).send('服务器错误');
  }
});

/**
 * 健康检查端点 - 用于检查服务是否正常运行
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;

/**
 * 文件上传中间件
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

// 确保基础上传目录存在
const baseUploadDir = path.join(__dirname, '../public/uploads');
fs.ensureDirSync(baseUploadDir);

// 确保各类型上传子目录存在
const avatarDir = path.join(baseUploadDir, 'avatars');
const imagesDir = path.join(baseUploadDir, 'images');
const documentsDir = path.join(baseUploadDir, 'documents');

fs.ensureDirSync(avatarDir);
fs.ensureDirSync(imagesDir);
fs.ensureDirSync(documentsDir);

logger.info('上传目录已创建:');
logger.info(`- 基础目录: ${baseUploadDir}`);
logger.info(`- 头像目录: ${avatarDir}`);
logger.info(`- 图片目录: ${imagesDir}`);
logger.info(`- 文档目录: ${documentsDir}`);

// 对中文文件名进行处理的函数
const sanitizeFilename = (filename) => {
  // 保留原始文件名，但去除不安全字符
  return filename.replace(/[^\u4e00-\u9fa5a-zA-Z0-9.-]/g, '_');
};

// 设置存储引擎
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 根据文件类型选择不同的上传目录
    let uploadPath = baseUploadDir;
    
    if (file.fieldname === 'avatar') {
      uploadPath = avatarDir;
    } else if (file.mimetype.startsWith('image/')) {
      uploadPath = imagesDir;
    } else if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('application/')) {
      uploadPath = documentsDir;
    }
    
    logger.info(`文件上传目标目录: ${uploadPath}, 文件类型: ${file.mimetype}, 字段名: ${file.fieldname}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 对原始文件名进行解码，确保中文字符正确
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    // 使用UUID生成唯一文件名，并保留原始扩展名
    const uniqueFilename = `${uuidv4()}${path.extname(originalName)}`;
    
    // 将原始文件名保存到请求中，以便后续使用
    if (!req.fileData) req.fileData = {};
    req.fileData.originalName = originalName;
    
    // 记录文件名信息
    logger.info(`上传文件: 原始名=${originalName}, 保存为=${uniqueFilename}`);
    
    cb(null, uniqueFilename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的MIME类型
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'text/plain',
    'text/csv'
  ];

  // 记录MIME类型
  logger.info(`文件MIME类型: ${file.mimetype}`);

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 创建上传中间件
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// 错误处理中间件
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.error(`Multer上传错误: ${err.code} - ${err.message}`);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超过限制(5MB)'
      });
    }
    return res.status(400).json({
      success: false,
      message: `上传错误: ${err.message}`
    });
  }
  
  if (err) {
    logger.error('文件上传错误:', err);
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

// 手动创建目录函数，供外部使用
const ensureUploadDirs = () => {
  fs.ensureDirSync(baseUploadDir);
  fs.ensureDirSync(avatarDir);
  fs.ensureDirSync(imagesDir);
  fs.ensureDirSync(documentsDir);
  
  return {
    baseUploadDir,
    avatarDir,
    imagesDir,
    documentsDir
  };
};

module.exports = {
  upload,
  handleUploadError,
  sanitizeFilename,
  ensureUploadDirs
}; 
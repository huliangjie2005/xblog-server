const folderService = require('../../services/folderService');
const { validationResult } = require('express-validator');
const { logger } = require('../../utils/logger');

/**
 * 创建文件夹
 */
const createFolder = async (req, res) => {
  try {
    // 打印完整请求体以便调试
    logger.info(`创建文件夹请求体: ${JSON.stringify(req.body)}`);
    logger.info(`用户信息: ${JSON.stringify(req.user)}`);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`表单验证失败: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({
        success: false,
        message: '验证失败',
        errors: errors.array()
      });
    }
    
    const { name, parent_id } = req.body;
    // 从req.user或req.admin中获取ID
    const adminId = req.user?.id || req.admin?.id;
    
    if (!adminId) {
      logger.error('创建文件夹失败：无法获取管理员ID');
      return res.status(401).json({
        success: false,
        message: '无法识别管理员身份'
      });
    }
    
    const folderData = {
      name,
      parent_id: parent_id ? parseInt(parent_id, 10) : null,
      created_by: adminId
    };
    
    const folder = await folderService.createFolder(folderData);
    
    return res.status(201).json({
      success: true,
      message: '文件夹创建成功',
      data: folder
    });
  } catch (error) {
    logger.error(`创建文件夹失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '创建文件夹失败',
      error: error.message
    });
  }
};

/**
 * 获取文件夹列表
 */
const getFolders = async (req, res) => {
  try {
    const { parent_id } = req.query;
    const parsedParentId = parent_id ? parseInt(parent_id, 10) : null;
    
    logger.info(`获取文件夹列表，parent_id=${parent_id}, parsedParentId=${parsedParentId}`);
    
    const folders = await folderService.getFolders({ parent_id: parsedParentId });
    
    logger.info(`获取到${folders.length}个文件夹`);
    
    // 格式化返回数据，与前端期望的格式保持一致
    return res.status(200).json({
      success: true,
      data: {
        items: folders,
        total: folders.length
      }
    });
  } catch (error) {
    logger.error(`获取文件夹列表失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '获取文件夹列表失败',
      error: error.message
    });
  }
};

/**
 * 获取文件夹详情
 */
const getFolderById = async (req, res) => {
  try {
    const { id } = req.params;
    const folderId = parseInt(id, 10);
    
    logger.info(`获取文件夹详情，ID=${folderId}`);
    
    if (isNaN(folderId)) {
      logger.warn(`无效的文件夹ID: ${id}`);
      return res.status(400).json({
        success: false,
        message: '无效的文件夹ID'
      });
    }
    
    const folder = await folderService.getFolderById(folderId);
    
    if (!folder) {
      logger.warn(`找不到ID为${folderId}的文件夹`);
      return res.status(404).json({
        success: false,
        message: '文件夹不存在'
      });
    }
    
    logger.info(`找到文件夹: ${JSON.stringify(folder)}`);
    
    return res.status(200).json({
      success: true,
      data: folder
    });
  } catch (error) {
    logger.error(`获取文件夹详情失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '获取文件夹详情失败',
      error: error.message
    });
  }
};

/**
 * 更新文件夹
 */
const updateFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '验证失败',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const { name } = req.body;
    
    const success = await folderService.updateFolder(parseInt(id, 10), { name });
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: '文件夹不存在或更新失败'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: '文件夹更新成功'
    });
  } catch (error) {
    logger.error(`更新文件夹失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '更新文件夹失败',
      error: error.message
    });
  }
};

/**
 * 删除文件夹
 */
const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await folderService.deleteFolder(parseInt(id, 10));
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: '文件夹不存在或删除失败'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: '文件夹删除成功'
    });
  } catch (error) {
    logger.error(`删除文件夹失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '删除文件夹失败',
      error: error.message
    });
  }
};

/**
 * 获取文件夹路径
 */
const getFolderPath = async (req, res) => {
  try {
    const { id } = req.params;
    const folderId = parseInt(id, 10);
    
    logger.info(`获取文件夹路径，ID=${folderId}`);
    
    if (isNaN(folderId)) {
      // 静默处理无效ID，不输出警告
      return res.status(400).json({
        success: false,
        message: '无效的文件夹ID'
      });
    }
    
    const path = await folderService.getFolderPath(folderId);
    logger.info(`获取到路径: ${JSON.stringify(path)}`);
    
    return res.status(200).json({
      success: true,
      data: path
    });
  } catch (error) {
    logger.error(`获取文件夹路径失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '获取文件夹路径失败',
      error: error.message
    });
  }
};

module.exports = {
  createFolder,
  getFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  getFolderPath
}; 
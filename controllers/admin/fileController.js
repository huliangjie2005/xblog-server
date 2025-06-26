const path = require('path');
const fileService = require('../../services/fileService');
const { logger } = require('../../utils/logger');

/**
 * 上传文件
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未找到上传的文件'
      });
    }
    
    logger.info(`文件MIME类型: ${req.file.mimetype}`);
    logger.info(`上传文件: 原始名=${req.file.originalname}, 保存为=${req.file.filename}`);
    logger.info(`上传请求体: ${JSON.stringify(req.body)}`);
    
    // 处理文件信息
    const adminId = req.adminId;
    let { folder_id, folderId } = req.body;
    
    // 支持两种参数名称
    if (folderId !== undefined && folder_id === undefined) {
      logger.info(`检测到folderId参数: ${folderId}，转换为folder_id`);
      folder_id = folderId;
    }
    
    // 解析folder_id为整数
    let parsedFolderId = null;
    if (folder_id !== undefined && folder_id !== null && folder_id !== '') {
      parsedFolderId = parseInt(folder_id, 10);
      if (isNaN(parsedFolderId)) {
        logger.warn(`无效的folder_id: ${folder_id}`);
        parsedFolderId = null;
      } else {
        logger.info(`有效的folder_id: ${parsedFolderId}`);
      }
    }
    
    // 记录文件上传
    logger.info(`处理文件上传: ${req.file.originalname}, 大小: ${req.file.size}, 文件夹ID: ${parsedFolderId}`);
    
    // 根据文件类型确定存储路径和URL
    let relativePath = `public/uploads/${req.file.filename}`;
    let fileUrl = `/uploads/${req.file.filename}`;

    if (req.file.mimetype.startsWith('image/')) {
      relativePath = `public/uploads/images/${req.file.filename}`;
      fileUrl = `/uploads/images/${req.file.filename}`;
    } else if (req.file.mimetype === 'application/pdf' || req.file.mimetype.startsWith('application/')) {
      relativePath = `public/uploads/documents/${req.file.filename}`;
      fileUrl = `/uploads/documents/${req.file.filename}`;
    }

    // 创建文件记录
    const fileData = {
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      path: relativePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
      userId: adminId,
      folderId: parsedFolderId
    };

    const file = await fileService.createFile(fileData);

    // 添加完整的URL
    const fileWithUrl = {
      ...file,
      url: fileUrl
    };
    
    return res.status(201).json({
      success: true,
      message: '文件上传成功',
      data: fileWithUrl
    });
  } catch (error) {
    logger.error(`文件上传失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '文件上传失败',
      error: error.message
    });
  }
};

/**
 * 获取所有文件
 */
const getAllFiles = async (req, res) => {
  try {
    // 打印原始请求参数
    logger.info(`原始请求参数: ${JSON.stringify(req.query)}`);
    
    // 使用let变量接收查询参数
    let { page = 1, limit = 12, search = '', folder_id, folderId } = req.query;
    
    // 检查参数名称，支持folder_id和folderId两种形式
    if (folderId !== undefined && folder_id === undefined) {
      logger.info(`检测到folderId参数: ${folderId}，转换为folder_id`);
      folder_id = folderId;
    }
    
    // 确保数据类型正确
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 12;
    
    // 可选的folder_id处理
    let parsedFolderId = null;
    if (folder_id !== undefined && folder_id !== null && folder_id !== '') {
      parsedFolderId = parseInt(folder_id, 10);
      if (isNaN(parsedFolderId)) {
        logger.warn(`无效的folder_id: ${folder_id}`);
        parsedFolderId = null;
      } else {
        logger.info(`有效的folder_id: ${parsedFolderId}`);
      }
    }
    
    logger.info(`处理后的文件列表请求参数: page=${page}, limit=${limit}, search=${search}, folder_id=${parsedFolderId}`);
    
    const options = {
      page,
      limit,
      search,
      folder_id: parsedFolderId
    };
    
    const result = await fileService.getAllFiles(options);
    logger.info(`文件服务返回结果: 文件数量=${result.files.length}, 总数=${result.pagination.total}`);
    
    // 转换为前端期望的格式
    const formattedFiles = result.files.map(file => {
      // 根据文件类型生成正确的URL路径
      let fileUrl = `/uploads/${file.filename}`;
      if (file.mime_type && file.mime_type.startsWith('image/')) {
        fileUrl = `/uploads/images/${file.filename}`;
      } else if (file.mime_type === 'application/pdf' || file.mime_type.startsWith('application/')) {
        fileUrl = `/uploads/documents/${file.filename}`;
      }

      return {
        id: file.id,
        name: file.original_filename || file.filename,
        url: fileUrl,
        size: file.size,
        type: file.mime_type,
        created_at: file.created_at,
        uploader: file.uploader_name,
        folder_id: file.folder_id
      };
    });
    
    logger.info(`返回${formattedFiles.length}个文件，总数${result.pagination.total}`);
    
    return res.status(200).json({
      success: true,
      message: '获取文件列表成功',
      data: {
        items: formattedFiles,
        total: result.pagination.total
      }
    });
  } catch (error) {
    logger.error(`获取文件列表失败: ${error.message}, 堆栈: ${error.stack}`);
    return res.status(500).json({
      success: false,
      message: '获取文件列表失败',
      error: error.message
    });
  }
};

/**
 * 获取单个文件
 */
const getFileById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取文件信息
    const file = await fileService.getFileById(id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }
    
    // 格式化为前端期望的格式
    // 根据文件类型生成正确的URL路径
    let fileUrl = `/uploads/${file.filename}`;
    if (file.mime_type && file.mime_type.startsWith('image/')) {
      fileUrl = `/uploads/images/${file.filename}`;
    } else if (file.mime_type === 'application/pdf' || file.mime_type.startsWith('application/')) {
      fileUrl = `/uploads/documents/${file.filename}`;
    }

    const formattedFile = {
      id: file.id,
      name: file.original_filename || file.filename,
      url: fileUrl,
      size: file.size,
      type: file.mime_type,
      created_at: file.created_at,
      uploader: file.uploader_name
    };
    
    return res.status(200).json({
      success: true,
      message: '获取文件成功',
      data: {
        items: [formattedFile],
        total: 1
      }
    });
  } catch (error) {
    logger.error(`获取文件详情错误: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '获取文件详情失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 删除文件
 */
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 删除文件
    const deleted = await fileService.deleteFile(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: '文件不存在或删除失败'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    logger.error(`删除文件错误: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '删除文件失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 批量删除文件
 */
const deleteMultipleFiles = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的文件ID数组'
      });
    }
    
    // 删除多个文件
    const deletedCount = await fileService.deleteMultipleFiles(ids);
    
    return res.status(200).json({
      status: 'success',
      message: `成功删除${deletedCount}个文件`,
      data: {
        deletedCount,
        totalCount: ids.length
      }
    });
  } catch (error) {
    logger.error(`批量删除文件错误: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '批量删除文件失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 更新文件
 */
const updateFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, folder_id } = req.body;
    
    const fileData = {
      description,
      folder_id: folder_id ? parseInt(folder_id, 10) : null
    };
    
    const success = await fileService.updateFile(id, fileData);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: '文件不存在或更新失败'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: '文件更新成功'
    });
  } catch (error) {
    logger.error(`更新文件失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '更新文件失败',
      error: error.message
    });
  }
};

module.exports = {
  uploadFile,
  getAllFiles,
  getFileById,
  deleteFile,
  deleteMultipleFiles,
  updateFile
}; 
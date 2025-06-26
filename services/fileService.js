const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { query } = require('../config/db');
const { logger } = require('../utils/logger');

/**
 * 生成文件哈希值
 * @param {string} filename - 文件名
 * @param {number} size - 文件大小
 * @param {Date} timestamp - 时间戳
 * @returns {string} - 哈希值
 */
const generateFileHash = (filename, size, timestamp = new Date()) => {
  const data = `${filename}:${size}:${timestamp.getTime()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * 创建文件记录
 * @param {Object} fileData - 文件数据
 * @returns {Promise<Object>} - 创建的文件记录
 */
const createFile = async (fileData) => {
  try {
    const { filename, originalFilename, path, size, mimetype, userId, folderId } = fileData;
    
    // 记录原始文件名，帮助诊断中文问题
    logger.info(`准备创建文件记录 - 原始文件名: ${originalFilename}`);
    logger.info(`文件夹ID: ${folderId !== undefined ? folderId : '未指定'}`);
    
    // 生成文件哈希值
    const hash = generateFileHash(filename, size);
    
    const sql = `
      INSERT INTO files 
      (filename, original_filename, path, size, mime_type, uploaded_by, hash, storage_type, folder_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // 确保folderId是整数或null
    const parsedFolderId = folderId !== null && folderId !== undefined ? 
      parseInt(folderId, 10) || null : null;
    
    logger.info(`解析后的文件夹ID: ${parsedFolderId}`);
    
    const result = await query(sql, [
      filename,
      originalFilename, // 使用已经解码的原始文件名
      path,
      size,
      mimetype,
      userId || null,
      hash,
      'local', // 默认存储类型
      parsedFolderId // 文件夹ID
    ]);
    
    if (result.affectedRows === 0) {
      throw new Error('文件记录创建失败');
    }
    
    // 获取新创建的文件记录
    const newFile = await getFileById(result.insertId);
    logger.info(`文件记录创建成功，ID: ${result.insertId}, 文件夹ID: ${parsedFolderId}`);
    return newFile;
  } catch (error) {
    logger.error(`创建文件记录失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取文件记录
 * @param {number} fileId - 文件ID
 * @returns {Promise<Object|null>} - 文件记录
 */
const getFileById = async (fileId) => {
  try {
    const sql = `
      SELECT f.*, a.username as uploader_name 
      FROM files f
      LEFT JOIN admin_users a ON f.uploaded_by = a.id
      WHERE f.id = ?
    `;
    
    const files = await query(sql, [fileId]);
    
    return files.length > 0 ? files[0] : null;
  } catch (error) {
    logger.error(`获取文件记录失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取所有文件
 * @param {Object} options - 分页和筛选选项
 * @returns {Promise<Object>} - 文件记录数组和分页信息
 */
const getAllFiles = async (options = {}) => {
  try {
    // 使用let而不是const确保可以修改变量
    let { page = 1, limit = 10, search = '', folder_id = null } = options;
    
    // 确保page和limit是数字
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;
    
    // 计算偏移量
    let offset = (page - 1) * limit;
    
    logger.info(`查询文件列表参数: page=${page}, limit=${limit}, search=${search}, folder_id=${folder_id}`);
    
    let sql = `
      SELECT f.*, a.username as uploader_name 
      FROM files f
      LEFT JOIN admin_users a ON f.uploaded_by = a.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
      sql += ` AND (f.original_filename LIKE ? OR f.mime_type LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // 按文件夹筛选
    if (folder_id !== null && folder_id !== undefined) {
      sql += ` AND f.folder_id = ?`;
      params.push(parseInt(folder_id, 10));
    } else {
      // 默认显示根目录文件
      sql += ` AND f.folder_id IS NULL`;
    }
    
    sql += ` ORDER BY f.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    logger.info(`执行SQL: ${sql}, 参数: ${JSON.stringify(params)}`);
    
    const files = await query(sql, params);
    logger.info(`查询到${files.length}个文件记录`);
    
    // 获取总数
    let countSql = `
      SELECT COUNT(*) as total 
      FROM files 
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (search) {
      countSql += ` AND (original_filename LIKE ? OR mime_type LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (folder_id !== null && folder_id !== undefined) {
      countSql += ` AND folder_id = ?`;
      countParams.push(parseInt(folder_id, 10));
    } else {
      countSql += ` AND folder_id IS NULL`;
    }
    
    logger.info(`执行计数SQL: ${countSql}, 参数: ${JSON.stringify(countParams)}`);
    
    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;
    logger.info(`文件总数: ${total}`);
    
    return {
      files,
      pagination: {
        page,
        limit,
        total
      }
    };
  } catch (error) {
    logger.error(`获取所有文件失败: ${error.message}, 堆栈: ${error.stack}`);
    throw error;
  }
};

/**
 * 获取用户文件
 * @param {number} userId - 管理员ID
 * @param {Object} options - 分页和筛选选项
 * @returns {Promise<Array>} - 文件记录数组
 */
const getUserFiles = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 10, search = '' } = options;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT f.*, a.username as uploader_name 
      FROM files f
      LEFT JOIN admin_users a ON f.uploaded_by = a.id
      WHERE f.uploaded_by = ?
    `;
    
    const params = [userId];
    
    if (search) {
      sql += ` AND (f.original_filename LIKE ? OR f.mime_type LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ` ORDER BY f.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    return await query(sql, params);
  } catch (error) {
    logger.error(`获取管理员文件失败: ${error.message}`);
    throw error;
  }
};

/**
 * 删除文件
 * @param {number} fileId - 文件ID
 * @param {number|null} userId - 管理员ID（null表示超级管理员，可删除任何文件）
 * @returns {Promise<boolean>} - 是否删除成功
 */
const deleteFile = async (fileId, userId = null) => {
  try {
    // 先获取文件记录
    const file = await getFileById(fileId);
    
    if (!file) {
      throw new Error('文件不存在');
    }
    
    // 如果提供了userId，验证文件所有权（超级管理员可以删除任何文件）
    if (userId !== null && file.uploaded_by !== userId) {
      throw new Error('无权删除此文件');
    }
    
    try {
      // 删除物理文件，尝试各种可能的路径格式
      let filePath;
      
      // 尝试各种可能的路径格式
      if (file.path && file.path.startsWith('/')) {
        // 如果路径以斜杠开始，去掉前导斜杠
        filePath = path.join(__dirname, '..', file.path.substring(1));
      } else if (file.path) {
        // 直接使用路径
        filePath = path.join(__dirname, '..', file.path);
      } else {
        // 如果没有存储路径，使用filename构建路径
        filePath = path.join(__dirname, '..', 'public/uploads', file.filename);
      }

      // 检查文件是否存在
      if (fs.existsSync(filePath)) {
        await fs.remove(filePath);
        logger.info(`已删除文件: ${filePath}`);
      } else {
        logger.warn(`物理文件不存在，仅删除数据库记录: ${filePath}`);
      }
    } catch (fsError) {
      logger.error(`删除文件时出现文件系统错误: ${fsError.message}`);
      // 继续删除数据库记录，即使物理文件删除失败
    }
    
    // 删除数据库记录
    const sql = `DELETE FROM files WHERE id = ?`;
    const result = await query(sql, [fileId]);
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`删除文件失败: ${error.message}`);
    throw error;
  }
};

/**
 * 批量删除文件
 * @param {Array<number>} fileIds - 文件ID数组
 * @param {number|null} userId - 管理员ID（null表示超级管理员）
 * @returns {Promise<number>} - 成功删除的文件数量
 */
const deleteMultipleFiles = async (fileIds, userId = null) => {
  try {
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return 0;
    }
    
    let successCount = 0;
    
    for (const fileId of fileIds) {
      try {
        const deleted = await deleteFile(fileId, userId);
        if (deleted) {
          successCount++;
        }
      } catch (error) {
        logger.error(`删除文件ID=${fileId}失败: ${error.message}`);
        // 继续处理其他文件
      }
    }
    
    return successCount;
  } catch (error) {
    logger.error(`批量删除文件失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取文件总数
 * @param {Object} options - 筛选选项
 * @returns {Promise<number>} - 文件总数
 */
const getFilesCount = async (options = {}) => {
  try {
    const { search = '', userId = null, folderId = null } = options;
    
    let sql = `SELECT COUNT(*) as total FROM files WHERE 1=1`;
    const params = [];
    
    if (search) {
      sql += ` AND (original_filename LIKE ? OR mime_type LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (userId !== null) {
      sql += ` AND uploaded_by = ?`;
      params.push(userId);
    }
    
    if (folderId !== null) {
      sql += ` AND folder_id = ?`;
      params.push(folderId);
    }
    
    const result = await query(sql, params);
    return result[0].total;
  } catch (error) {
    logger.error(`获取文件总数失败: ${error.message}`);
    throw error;
  }
};

/**
 * 更新文件信息
 * @param {number} fileId - 文件ID
 * @param {Object} fileData - 更新的文件数据
 * @returns {Promise<boolean>} - 是否更新成功
 */
const updateFile = async (fileId, fileData) => {
  try {
    const { description, folder_id } = fileData;
    
    let sql = `UPDATE files SET `;
    const params = [];
    const updates = [];
    
    if (description !== undefined) {
      updates.push(`description = ?`);
      params.push(description);
    }
    
    if (folder_id !== undefined) {
      updates.push(`folder_id = ?`);
      params.push(folder_id);
    }
    
    if (updates.length === 0) {
      return false;
    }
    
    sql += updates.join(', ');
    sql += ` WHERE id = ?`;
    params.push(fileId);
    
    const result = await query(sql, params);
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`更新文件信息失败: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createFile,
  getFileById,
  getAllFiles,
  getUserFiles,
  deleteFile,
  deleteMultipleFiles,
  getFilesCount,
  updateFile
}; 
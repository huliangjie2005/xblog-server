const fs = require('fs-extra');
const path = require('path');
const { query } = require('../config/db');
const { logger } = require('../utils/logger');

// 基本上传目录
const BASE_UPLOAD_DIR = path.join(__dirname, '../public/uploads');

/**
 * 创建文件夹
 * @param {Object} folderData - 文件夹数据
 * @returns {Promise<Object>} - 创建的文件夹记录
 */
const createFolder = async (folderData) => {
  try {
    const { name, parentId, createdBy } = folderData;
    
    // 验证文件夹名称
    if (!name || name.trim() === '') {
      throw new Error('文件夹名称不能为空');
    }
    
    // 安全的文件夹名称（移除特殊字符）
    const safeName = name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]/g, '_');
    
    // 获取父文件夹路径
    let parentPath = '';
    let fullPath = '';
    
    if (parentId) {
      const parentFolder = await getFolderById(parentId);
      if (!parentFolder) {
        throw new Error('父文件夹不存在');
      }
      parentPath = parentFolder.path;
      fullPath = `${parentPath}/${safeName}`;
    } else {
      // 根文件夹
      fullPath = `/${safeName}`;
    }
    
    // 检查同名文件夹是否已存在
    const existingFolder = await getFolderByPath(fullPath);
    if (existingFolder) {
      throw new Error(`文件夹 "${name}" 已存在于此位置`);
    }
    
    // 创建物理文件夹
    const physicalPath = path.join(BASE_UPLOAD_DIR, fullPath);
    await fs.ensureDir(physicalPath);
    logger.info(`已创建物理文件夹: ${physicalPath}`);
    
    // 插入数据库记录
    const sql = `
      INSERT INTO folders (name, path, parent_id, created_by)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await query(sql, [safeName, fullPath, parentId || null, createdBy || null]);
    
    if (result.affectedRows === 0) {
      // 如果数据库插入失败，删除已创建的物理文件夹
      await fs.remove(physicalPath);
      throw new Error('文件夹记录创建失败');
    }
    
    return getFolderById(result.insertId);
  } catch (error) {
    logger.error(`创建文件夹失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取文件夹记录
 * @param {number} folderId - 文件夹ID
 * @returns {Promise<Object|null>} - 文件夹记录
 */
const getFolderById = async (folderId) => {
  try {
    logger.info(`获取文件夹详情，ID=${folderId}`);
    
    const sql = `
      SELECT f.*, a.username as creator_name 
      FROM folders f
      LEFT JOIN admin_users a ON f.created_by = a.id
      WHERE f.id = ?
    `;
    
    const folders = await query(sql, [folderId]);
    
    if (folders.length > 0) {
      logger.info(`找到文件夹: ID=${folders[0].id}, 名称=${folders[0].name}, 路径=${folders[0].path}`);
      return folders[0];
    } else {
      logger.warn(`未找到ID为${folderId}的文件夹`);
      return null;
    }
  } catch (error) {
    logger.error(`获取文件夹记录失败: ${error.message}`);
    throw error;
  }
};

/**
 * 根据路径获取文件夹
 * @param {string} folderPath - 文件夹路径
 * @returns {Promise<Object|null>} - 文件夹记录
 */
const getFolderByPath = async (folderPath) => {
  try {
    const sql = `
      SELECT f.*, a.username as creator_name 
      FROM folders f
      LEFT JOIN admin_users a ON f.created_by = a.id
      WHERE f.path = ?
    `;
    
    const folders = await query(sql, [folderPath]);
    
    return folders.length > 0 ? folders[0] : null;
  } catch (error) {
    logger.error(`根据路径获取文件夹失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取文件夹列表
 * @param {Object} params 查询参数
 * @returns {Promise<Array>} 文件夹列表
 */
async function getFolders(params = {}) {
  try {
    const { parent_id = null } = params;
    
    let sql = `
      SELECT f.*, a.username as creator_name,
      (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count
      FROM folders f
      LEFT JOIN admin_users a ON f.created_by = a.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (parent_id !== undefined && parent_id !== null) {
      sql += ` AND f.parent_id = ?`;
      queryParams.push(parent_id);
    } else {
      sql += ` AND (f.parent_id IS NULL OR f.parent_id = 1)`;
    }
    
    sql += ` ORDER BY f.name ASC`;
    
    const folders = await query(sql, queryParams);
    logger.info(`获取到${folders.length}个文件夹，带有文件计数`);
    return folders;
  } catch (error) {
    logger.error(`获取文件夹列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 更新文件夹
 * @param {number} id 文件夹ID
 * @param {Object} folderData 文件夹数据
 * @returns {Promise<boolean>} 更新结果
 */
async function updateFolder(id, folderData) {
  try {
    const { name } = folderData;
    
    // 获取当前文件夹信息
    const folder = await getFolderById(id);
    if (!folder) {
      throw new Error('文件夹不存在');
    }
    
    // 检查同级目录下是否有同名文件夹
    const checkSql = `
      SELECT COUNT(*) as count
      FROM folders
      WHERE parent_id ${folder.parent_id ? '= ?' : 'IS NULL'}
      AND name = ?
      AND id != ?
    `;
    
    const checkParams = folder.parent_id ? [folder.parent_id, name, id] : [name, id];
    const checkResult = await query(checkSql, checkParams);
    
    if (checkResult[0].count > 0) {
      throw new Error('同级目录下已存在同名文件夹');
    }
    
    // 更新文件夹名称
    const sql = `
      UPDATE folders
      SET name = ?
      WHERE id = ?
    `;
    
    const result = await query(sql, [name, id]);
    
    // 更新所有子文件夹的路径
    await updateChildrenPaths(id);
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`更新文件夹失败: ${error.message}`);
    throw error;
  }
}

/**
 * 更新子文件夹路径
 * @param {number} parentId 父文件夹ID
 */
async function updateChildrenPaths(parentId) {
  try {
    // 获取父文件夹信息
    const parentFolder = await getFolderById(parentId);
    if (!parentFolder) return;
    
    // 获取所有子文件夹
    const childrenSql = `
      SELECT id, name
      FROM folders
      WHERE parent_id = ?
    `;
    
    const children = await query(childrenSql, [parentId]);
    
    // 更新每个子文件夹的路径
    for (const child of children) {
      const newPath = parentFolder.path === '/' ? `/${child.name}` : `${parentFolder.path}/${child.name}`;
      
      const updateSql = `
        UPDATE folders
        SET path = ?
        WHERE id = ?
      `;
      
      await query(updateSql, [newPath, child.id]);
      
      // 递归更新子文件夹的子文件夹
      await updateChildrenPaths(child.id);
    }
  } catch (error) {
    logger.error(`更新子文件夹路径失败: ${error.message}`);
    throw error;
  }
}

/**
 * 删除文件夹
 * @param {number} id 文件夹ID
 * @returns {Promise<boolean>} 删除结果
 */
async function deleteFolder(id) {
  try {
    // 检查是否是根文件夹
    if (id === 1) {
      throw new Error('不能删除根文件夹');
    }
    
    // 检查文件夹是否存在
    const folder = await getFolderById(id);
    if (!folder) {
      throw new Error('文件夹不存在');
    }
    
    // 将该文件夹下的文件移动到父文件夹
    const updateFilesSql = `
      UPDATE files
      SET folder_id = ?
      WHERE folder_id = ?
    `;
    
    await query(updateFilesSql, [folder.parent_id, id]);
    
    // 删除文件夹
    const sql = `DELETE FROM folders WHERE id = ?`;
    const result = await query(sql, [id]);
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`删除文件夹失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取文件夹路径
 * @param {number} id 文件夹ID
 * @returns {Promise<Array>} 文件夹路径
 */
async function getFolderPath(id) {
  try {
    const path = [];
    let currentId = id;
    
    while (currentId) {
      const folder = await getFolderById(currentId);
      if (!folder) break;
      
      path.unshift({
        id: folder.id,
        name: folder.name
      });
      
      currentId = folder.parent_id;
    }
    
    return path;
  } catch (error) {
    logger.error(`获取文件夹路径失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createFolder,
  getFolderById,
  getFolderByPath,
  getFolders,
  updateFolder,
  deleteFolder,
  getFolderPath
}; 
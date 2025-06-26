const { query } = require('../config/db');
const { logger } = require('../utils/logger');
const fs = require('fs-extra');
const path = require('path');

/**
 * 创建特色图片文件夹
 */
async function createFeaturedImageFolder() {
  try {
    // 检查是否已存在"文章图片"文件夹
    const checkSql = `SELECT * FROM folders WHERE name = '文章图片'`;
    const existingFolders = await query(checkSql);
    
    if (existingFolders.length > 0) {
      logger.info('文章图片文件夹已存在，ID:', existingFolders[0].id);
      return existingFolders[0];
    }
    
    // 创建新文件夹
    const insertSql = `
      INSERT INTO folders (name, parent_id, created_at, updated_at)
      VALUES ('文章图片', NULL, NOW(), NOW())
    `;
    
    const result = await query(insertSql);
    
    if (result.affectedRows === 1) {
      logger.info('文章图片文件夹创建成功，ID:', result.insertId);
      
      // 创建实际的物理文件夹
      const uploadsDir = path.join(__dirname, '../public/uploads/文章图片');
      fs.ensureDirSync(uploadsDir);
      logger.info('物理文件夹创建成功:', uploadsDir);
      
      // 获取新创建的文件夹详情
      const newFolder = await query('SELECT * FROM folders WHERE id = ?', [result.insertId]);
      return newFolder[0];
    } else {
      throw new Error('文件夹创建失败');
    }
  } catch (error) {
    logger.error('创建文章图片文件夹失败:', error);
    throw error;
  }
}

// 执行创建操作
createFeaturedImageFolder()
  .then(folder => {
    console.log('文章图片文件夹创建成功:', folder);
    process.exit(0);
  })
  .catch(err => {
    console.error('文章图片文件夹创建失败:', err);
    process.exit(1);
  }); 
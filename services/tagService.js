/**
 * 标签服务
 */
const { query } = require('../config/db');
const { logger } = require('../utils/logger');
const slugify = require('slugify');

/**
 * 获取所有标签
 * @param {Object} options - 分页和排序选项
 * @returns {Promise<Array>} - 标签数组
 */
const getAllTags = async (options = {}) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = 'name' 
    } = options;
    
    // 确保数值类型正确
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // 简化查询，使用最基本的SQL语句，避免复杂的排序
    const sql = 'SELECT id, name, slug, description, count, created_at FROM tags ORDER BY name ASC LIMIT ? OFFSET ?';
    const tags = await query(sql, [limitNum, offset]);
    
    // 获取总数
    const countResult = await query('SELECT COUNT(*) as total FROM tags');
    const total = countResult[0].total;
    
    return { 
      tags, 
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  } catch (error) {
    logger.error(`获取所有标签失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取标签
 * @param {number|string} tagId - 标签ID
 * @returns {Promise<Object|null>} - 标签记录
 */
const getTagById = async (tagId) => {
  try {
    // 确保tagId是数字
    const id = parseInt(tagId, 10);
    if (isNaN(id)) {
      logger.error(`无效的标签ID: ${tagId}`);
      return null;
    }
    
    const sql = 'SELECT id, name, slug, description, count, created_at FROM tags WHERE id = ?';
    const tags = await query(sql, [id]);
    
    if (tags.length === 0) {
      return null;
    }
    
    return tags[0];
  } catch (error) {
    logger.error(`获取标签失败: ${error.message}`);
    throw error;
  }
};

/**
 * 通过slug获取标签
 * @param {string} slug - 标签slug
 * @returns {Promise<Object|null>} - 标签记录
 */
const getTagBySlug = async (slug) => {
  try {
    const sql = 'SELECT id, name, slug, description, count, created_at FROM tags WHERE slug = ?';
    const tags = await query(sql, [slug]);
    
    if (tags.length === 0) {
      return null;
    }
    
    return tags[0];
  } catch (error) {
    logger.error(`通过slug获取标签失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取热门标签
 * @param {number} limit - 返回标签数量
 * @returns {Promise<Array>} - 热门标签数组
 */
const getPopularTags = async (limit = 10) => {
  try {
    // 确保limit是数字
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum)) {
      throw new Error(`无效的limit参数: ${limit}`);
    }
    
    const sql = `
      SELECT id, name, slug, count 
      FROM tags 
      ORDER BY count DESC, name ASC 
      LIMIT ?
    `;
    
    return await query(sql, [limitNum]);
  } catch (error) {
    logger.error(`获取热门标签失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取标签下的文章
 * @param {number|string} tagId - 标签ID
 * @param {Object} options - 分页和排序选项
 * @returns {Promise<Object>} - 文章数组和分页信息
 */
const getTagArticles = async (tagId, options = {}) => {
  try {
    // 确保tagId是数字
    const id = parseInt(tagId, 10);
    if (isNaN(id)) {
      throw new Error(`无效的标签ID: ${tagId}`);
    }
    
    const { 
      page = 1, 
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;
    
    // 确保数值类型正确
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // 检查标签是否存在
    const tag = await getTagById(id);
    if (!tag) {
      throw new Error(`标签不存在: ID=${id}`);
    }
    
    // 获取文章列表，避免直接在SQL中使用变量
    let sql;
    if (sortBy === 'created_at' && sortOrder === 'DESC') {
      sql = `
        SELECT p.id, p.title, p.slug, p.excerpt, p.featured_image, 
               p.view_count, p.like_count, p.created_at, p.updated_at,
               p.author_id, u.username as author_name
        FROM posts p
        JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN public_users u ON p.author_id = u.id
        WHERE pt.tag_id = ? AND p.status = 'published'
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
    } else if (sortBy === 'created_at' && sortOrder === 'ASC') {
      sql = `
        SELECT p.id, p.title, p.slug, p.excerpt, p.featured_image, 
               p.view_count, p.like_count, p.created_at, p.updated_at,
               p.author_id, u.username as author_name
        FROM posts p
        JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN public_users u ON p.author_id = u.id
        WHERE pt.tag_id = ? AND p.status = 'published'
        ORDER BY p.created_at ASC
        LIMIT ? OFFSET ?
      `;
    } else if (sortBy === 'updated_at' && sortOrder === 'DESC') {
      sql = `
        SELECT p.id, p.title, p.slug, p.excerpt, p.featured_image, 
               p.view_count, p.like_count, p.created_at, p.updated_at,
               p.author_id, u.username as author_name
        FROM posts p
        JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN public_users u ON p.author_id = u.id
        WHERE pt.tag_id = ? AND p.status = 'published'
        ORDER BY p.updated_at DESC
        LIMIT ? OFFSET ?
      `;
    } else {
      // 默认排序
      sql = `
        SELECT p.id, p.title, p.slug, p.excerpt, p.featured_image, 
               p.view_count, p.like_count, p.created_at, p.updated_at,
               p.author_id, u.username as author_name
        FROM posts p
        JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN public_users u ON p.author_id = u.id
        WHERE pt.tag_id = ? AND p.status = 'published'
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
    }
    
    const articles = await query(sql, [id, limitNum, offset]);
    
    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total 
      FROM posts p 
      JOIN post_tags pt ON p.id = pt.post_id 
      WHERE pt.tag_id = ? AND p.status = 'published'
    `;
    
    const countResult = await query(countSql, [id]);
    const total = countResult[0].total;
    
    return {
      tag,
      articles,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  } catch (error) {
    logger.error(`获取标签文章失败: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getAllTags,
  getTagById,
  getTagBySlug,
  getPopularTags,
  getTagArticles
}; 
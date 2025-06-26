const { query, queryWithCache } = require('../config/db');
const { logger } = require('../utils/logger');
const slugify = require('slugify');

/**
 * 创建分类
 * @param {Object} categoryData - 分类数据
 * @returns {Promise<Object>} - 创建的分类记录
 */
const createCategory = async (categoryData) => {
  try {
    const { name, description, parentId } = categoryData;
    
    // 生成slug
    let slug = slugify(name, {
      lower: true,      // 转换为小写
      strict: true,     // 移除特殊字符
      trim: true        // 移除首尾空格
    });
    
    // 确保slug唯一
    slug = await ensureUniqueSlug(slug);
    
    const sql = `
      INSERT INTO categories 
      (name, slug, description, parent_id)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      name,
      slug,
      description || null,
      parentId || null
    ]);
    
    if (result.affectedRows === 0) {
      throw new Error('分类创建失败');
    }
    
    return getCategoryById(result.insertId);
  } catch (error) {
    logger.error(`创建分类失败: ${error.message}`);
    throw error;
  }
};

/**
 * 确保分类slug唯一
 * @param {string} slug - 初始slug
 * @returns {Promise<string>} - 唯一的slug
 */
const ensureUniqueSlug = async (slug) => {
  try {
    let uniqueSlug = slug;
    let counter = 1;
    let exists = true;
    
    while (exists) {
      const checkSql = 'SELECT COUNT(*) as count FROM categories WHERE slug = ?';
      const results = await query(checkSql, [uniqueSlug]);
      
      if (results[0].count === 0) {
        exists = false;
      } else {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
    }
    
    return uniqueSlug;
  } catch (error) {
    logger.error(`生成唯一slug失败: ${error.message}`);
    throw error;
  }
};

/**
 * 根据ID获取分类
 * @param {number} id - 分类ID
 * @returns {Promise<Object>} - 分类对象
 */
const getCategoryById = async (id) => {
  try {
    // 确保id是整数
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      throw new Error(`无效的分类ID: ${id}`);
    }
    
    const sql = `
      SELECT * FROM categories 
      WHERE id = ? 
      LIMIT 1
    `;
    
    const result = await query(sql, [categoryId]);
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  } catch (error) {
    logger.error(`获取分类详情失败: ${error.message}`);
    throw error;
  }
};

/**
 * 通过slug获取分类
 * @param {string} slug - 分类slug
 * @returns {Promise<Object|null>} - 分类记录
 */
const getCategoryBySlug = async (slug) => {
  try {
    const sql = `
      SELECT c.*, parent.name as parent_name 
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      WHERE c.slug = ?
    `;
    
    const categories = await query(sql, [slug]);
    
    if (categories.length === 0) {
      return null;
    }
    
    return categories[0];
  } catch (error) {
    logger.error(`通过slug获取分类失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取所有分类
 * @returns {Promise<Array>} - 分类记录数组
 */
const getAllCategories = async () => {
  try {
    const sql = `
      SELECT c.*, parent.name as parent_name
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      ORDER BY c.name ASC
    `;

    // 使用缓存查询，缓存5分钟
    return await queryWithCache(sql, [], {
      cache: true,
      cacheTTL: 300,
      cacheKey: 'categories:all'
    });
  } catch (error) {
    logger.error(`获取所有分类失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取分类层级结构
 * @returns {Promise<Array>} - 分类层级结构数组
 */
const getCategoryHierarchy = async () => {
  try {
    // 先获取所有分类
    const categories = await getAllCategories();
    
    // 构建分类映射
    const categoryMap = new Map();
    categories.forEach(category => {
      category.children = [];
      categoryMap.set(category.id, category);
    });
    
    // 构建分类树
    const rootCategories = [];
    categories.forEach(category => {
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(category);
        } else {
          rootCategories.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });
    
    return rootCategories;
  } catch (error) {
    logger.error(`获取分类层级结构失败: ${error.message}`);
    throw error;
  }
};

/**
 * 更新分类
 * @param {number} categoryId - 分类ID
 * @param {Object} categoryData - 更新的分类数据
 * @returns {Promise<Object|null>} - 更新后的分类记录
 */
const updateCategory = async (categoryId, categoryData) => {
  try {
    const { name, description, parentId } = categoryData;
    
    // 检查分类是否存在
    const existingCategory = await getCategoryById(categoryId);
    if (!existingCategory) {
      throw new Error('分类不存在');
    }
    
    // 验证父级分类不是自己
    if (parentId && parseInt(parentId) === parseInt(categoryId)) {
      throw new Error('分类不能将自己设为父级分类');
    }
    
    // 验证父级分类不是自己的子分类
    if (parentId) {
      const isChildCategory = await isChildOfCategory(parentId, categoryId);
      if (isChildCategory) {
        throw new Error('不能将子分类设为父级分类');
      }
    }
    
    // 准备更新字段
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
      
      // 如果名称改变，更新slug
      if (name !== existingCategory.name) {
        const newSlug = await ensureUniqueSlug(slugify(name, {
          lower: true,
          strict: true,
          trim: true
        }));
        
        updates.push('slug = ?');
        params.push(newSlug);
      }
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    
    if (parentId !== undefined) {
      updates.push('parent_id = ?');
      params.push(parentId || null);
    }
    
    if (updates.length === 0) {
      return existingCategory; // 没有更新
    }
    
    // 添加分类ID
    params.push(categoryId);
    
    const sql = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`;
    
    const result = await query(sql, params);
    
    if (result.affectedRows === 0) {
      throw new Error('分类更新失败');
    }
    
    return getCategoryById(categoryId);
  } catch (error) {
    logger.error(`更新分类失败: ${error.message}`);
    throw error;
  }
};

/**
 * 检查一个分类是否是另一个分类的子分类
 * @param {number} potentialChildId - 潜在子分类ID
 * @param {number} parentId - 父分类ID
 * @returns {Promise<boolean>} - 是否是子分类
 */
const isChildOfCategory = async (potentialChildId, parentId) => {
  try {
    const category = await getCategoryById(potentialChildId);
    if (!category) return false;
    
    if (category.parent_id === null) return false;
    if (parseInt(category.parent_id) === parseInt(parentId)) return true;
    
    // 递归检查更高层级的父分类
    return await isChildOfCategory(category.parent_id, parentId);
  } catch (error) {
    logger.error(`检查分类关系失败: ${error.message}`);
    throw error;
  }
};

/**
 * 删除分类
 * @param {number} categoryId - 分类ID
 * @returns {Promise<boolean>} - 是否删除成功
 */
const deleteCategory = async (categoryId) => {
  try {
    // 将子分类的parent_id设为null
    await query('UPDATE categories SET parent_id = NULL WHERE parent_id = ?', [categoryId]);
    
    // 删除分类与文章的关联
    await query('DELETE FROM post_categories WHERE category_id = ?', [categoryId]);
    
    // 删除分类
    const result = await query('DELETE FROM categories WHERE id = ?', [categoryId]);
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`删除分类失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取分类中的文章
 * @param {number|string} categoryId - 分类ID
 * @param {Object} options - 分页和筛选选项
 * @returns {Promise<Array>} - 文章记录数组
 */
const getCategoryPosts = async (categoryId, options = {}) => {
  try {
    // 确保categoryId是数字
    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      logger.error(`无效的分类ID: ${categoryId}`);
      return [];
    }
    
    const { 
      page = 1, 
      limit = 10, 
      status = 'published' 
    } = options;
    
    const offset = (page - 1) * limit;
    
    const sql = `
      SELECT p.*, u.username as author_name 
      FROM posts p
      JOIN post_categories pc ON p.id = pc.post_id
      LEFT JOIN public_users u ON p.author_id = u.id
      WHERE pc.category_id = ? AND p.status = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    return await query(sql, [id, status, limit, offset]);
  } catch (error) {
    logger.error(`获取分类文章失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取分类中的文章数
 * @param {number|string} categoryId - 分类ID
 * @param {string} status - 文章状态
 * @returns {Promise<number>} - 文章数量
 */
const getCategoryPostCount = async (categoryId, status = 'published') => {
  try {
    // 确保categoryId是数字
    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      logger.error(`无效的分类ID: ${categoryId}`);
      return 0;
    }
    
    const sql = `
      SELECT COUNT(*) as count
      FROM posts p
      JOIN post_categories pc ON p.id = pc.post_id
      WHERE pc.category_id = ? AND p.status = ?
    `;
    
    const result = await query(sql, [id, status]);
    return result[0].count;
  } catch (error) {
    logger.error(`获取分类文章数失败: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createCategory,
  getCategoryById,
  getCategoryBySlug,
  getAllCategories,
  getCategoryHierarchy,
  updateCategory,
  deleteCategory,
  getCategoryPosts,
  getCategoryPostCount
}; 
const { query, queryWithCache } = require('../config/db');
const { logger } = require('../utils/logger');
const slugify = require('slugify');
const aiService = require('./aiService');

/**
 * 创建文章
 * @param {Object} postData - 文章数据
 * @returns {Promise<Object>} - 创建的文章记录
 */
const createPost = async (postData) => {
  try {
    const { 
      title, 
      content, 
      excerpt, 
      featuredImage, 
      status, 
      authorId, 
      generateAiSummary = false 
    } = postData;
    
    // 生成slug
    let slug = slugify(title, {
      lower: true,      // 转换为小写
      strict: true,     // 移除特殊字符
      trim: true        // 移除首尾空格
    });
    
    // 确保slug唯一
    slug = await ensureUniqueSlug(slug);
    
    // 如果需要生成AI摘要
    let finalExcerpt = excerpt;
    if (generateAiSummary && content) {
      try {
        finalExcerpt = await generateAISummary(content);
      } catch (summaryError) {
        logger.error(`生成AI摘要失败，使用默认摘要: ${summaryError.message}`);
        // 生成简单摘要，取文章前100个字符
        finalExcerpt = content.length > 100 ? content.substring(0, 100) + '...' : content;
      }
    }
    
    const sql = `
      INSERT INTO posts 
      (title, slug, content, excerpt, featured_image, status, author_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      title,
      slug,
      content,
      finalExcerpt || null,
      featuredImage || null,
      status || 'draft',
      authorId || null
    ]);
    
    if (result.affectedRows === 0) {
      throw new Error('文章创建失败');
    }
    
    return getPostById(result.insertId);
  } catch (error) {
    logger.error(`创建文章失败: ${error.message}`);
    throw error;
  }
};

/**
 * 确保文章slug唯一
 * @param {string} slug - 初始slug
 * @returns {Promise<string>} - 唯一的slug
 */
const ensureUniqueSlug = async (slug) => {
  try {
    let uniqueSlug = slug;
    let counter = 1;
    let exists = true;
    
    while (exists) {
      const checkSql = 'SELECT COUNT(*) as count FROM posts WHERE slug = ?';
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
 * 获取文章
 * @param {number|string} postId - 文章ID
 * @returns {Promise<Object|null>} - 文章记录
 */
const getPostById = async (postId) => {
  try {
    // 确保postId是数字
    const id = parseInt(postId, 10);
    if (isNaN(id)) {
      logger.error(`无效的文章ID: ${postId}`);
      return null;
    }

    const sql = `
      SELECT p.*, u.username as author_name 
      FROM posts p
      LEFT JOIN public_users u ON p.author_id = u.id
      WHERE p.id = ?
    `;
    
    const posts = await query(sql, [id]);
    
    if (posts.length === 0) {
      return null;
    }
    
    const post = posts[0];
    
    // 获取文章的分类
    const categoriesSql = `
      SELECT c.id, c.name, c.slug
      FROM categories c
      JOIN post_categories pc ON c.id = pc.category_id
      WHERE pc.post_id = ?
    `;

    const categories = await query(categoriesSql, [id]);
    post.categories = categories;

    // 获取文章的标签
    const tagsSql = `
      SELECT t.id, t.name, t.slug
      FROM tags t
      JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
    `;

    const tags = await query(tagsSql, [id]);
    post.tags = tags;

    // 为了兼容前端，添加category_id字段
    post.category_id = categories.length > 0 ? categories[0].id : null;

    return post;
  } catch (error) {
    logger.error(`获取文章失败: ${error.message}`);
    throw error;
  }
};

/**
 * 通过slug获取文章
 * @param {string} slug - 文章slug
 * @returns {Promise<Object|null>} - 文章记录
 */
const getPostBySlug = async (slug) => {
  try {
    const sql = `
      SELECT p.*, u.username as author_name 
      FROM posts p
      LEFT JOIN public_users u ON p.author_id = u.id
      WHERE p.slug = ?
    `;
    
    const posts = await query(sql, [slug]);
    
    if (posts.length === 0) {
      return null;
    }
    
    const post = posts[0];
    
    // 获取文章的分类
    const categoriesSql = `
      SELECT c.id, c.name, c.slug
      FROM categories c
      JOIN post_categories pc ON c.id = pc.category_id
      WHERE pc.post_id = ?
    `;
    
    const categories = await query(categoriesSql, [post.id]);
    post.categories = categories;
    
    return post;
  } catch (error) {
    logger.error(`通过slug获取文章失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取所有文章
 * @param {Object} options - 分页和筛选选项
 * @returns {Promise<Array>} - 文章记录数组
 */
const getAllPosts = async (options = {}) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = null,
      categoryId = null,
      authorId = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;
    
    // 确保数值类型正确
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // 验证categoryId (如果存在)
    let categoryIdParam = null;
    if (categoryId !== null) {
      categoryIdParam = parseInt(categoryId, 10);
      if (isNaN(categoryIdParam)) {
        logger.warn(`无效的分类ID: ${categoryId}, 使用null替代`);
      }
    }
    
    // 验证authorId (如果存在)
    let authorIdParam = null;
    if (authorId !== null) {
      authorIdParam = parseInt(authorId, 10);
      if (isNaN(authorIdParam)) {
        logger.warn(`无效的作者ID: ${authorId}, 使用null替代`);
      }
    }
    
    // 构建SQL查询 - 修复分类关联
    let sql = `
      SELECT p.*,
             u.username as author_name,
             c.name as category_name,
             c.slug as category_slug
      FROM posts p
      LEFT JOIN public_users u ON p.author_id = u.id
      LEFT JOIN post_categories pc ON p.id = pc.post_id
      LEFT JOIN categories c ON pc.category_id = c.id
    `;
    
    const whereConditions = [];
    const params = [];
    
    if (categoryIdParam && !isNaN(categoryIdParam)) {
      whereConditions.push('pc.category_id = ?');
      params.push(categoryIdParam);
    }
    
    if (search) {
      whereConditions.push('(p.title LIKE ? OR p.content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (status) {
      whereConditions.push('p.status = ?');
      params.push(status);
    }
    
    if (authorIdParam && !isNaN(authorIdParam)) {
      whereConditions.push('p.author_id = ?');
      params.push(authorIdParam);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // 确保排序字段安全
    const safeSortBy = ['id', 'title', 'created_at', 'updated_at', 'view_count', 'like_count'].includes(sortBy) 
      ? sortBy 
      : 'created_at';
    
    // 确保排序方向安全  
    const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : 'DESC';
    
    // 添加排序
    sql += ` ORDER BY p.${safeSortBy} ${safeSortOrder}`;
    
    // 添加分页，使用简单的字符串插值而不是参数化查询处理LIMIT/OFFSET
    sql += ` LIMIT ${limitNum} OFFSET ${offset}`;
    
    logger.debug(`执行查询: ${sql}`);
    logger.debug(`参数: ${JSON.stringify(params)}`);
    
    const posts = await query(sql, params);

    // 获取每篇文章的分类和标签
    for (const post of posts) {
      // 获取分类（保持原有逻辑）
      const categoriesSql = `
        SELECT c.id, c.name, c.slug
        FROM categories c
        JOIN post_categories pc ON c.id = pc.category_id
        WHERE pc.post_id = ?
      `;

      const categories = await query(categoriesSql, [post.id]);
      post.categories = categories;

      // 获取标签
      const tagsSql = `
        SELECT t.id, t.name, t.slug
        FROM tags t
        JOIN post_tags pt ON t.id = pt.tag_id
        WHERE pt.post_id = ?
        ORDER BY t.name
      `;

      const tags = await query(tagsSql, [post.id]);
      post.tags = tags || [];

      // 静默模式下不输出标签信息
    }

    // 静默模式下不输出详细信息
    return posts;
  } catch (error) {
    logger.error(`获取文章列表失败: ${error.message}`);
    throw error;
  }
};

/**
 * 更新文章
 * @param {number} postId - 文章ID
 * @param {Object} postData - 更新的文章数据
 * @returns {Promise<Object|null>} - 更新后的文章记录
 */
const updatePost = async (postId, postData) => {
  try {
    const { title, content, excerpt, featuredImage, status } = postData;
    
    // 检查文章是否存在
    const existingPost = await getPostById(postId);
    if (!existingPost) {
      throw new Error('文章不存在');
    }
    
    // 准备更新字段
    const updates = [];
    const params = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
      
      // 如果标题改变，更新slug
      if (title !== existingPost.title) {
        const newSlug = await ensureUniqueSlug(slugify(title, {
          lower: true,
          strict: true,
          trim: true
        }));
        
        updates.push('slug = ?');
        params.push(newSlug);
      }
    }
    
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    
    if (excerpt !== undefined) {
      updates.push('excerpt = ?');
      params.push(excerpt);
    }
    
    if (featuredImage !== undefined) {
      updates.push('featured_image = ?');
      params.push(featuredImage);
    }
    
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    
    if (updates.length === 0) {
      return existingPost; // 没有更新
    }
    
    // 添加文章ID
    params.push(postId);
    
    const sql = `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`;
    
    const result = await query(sql, params);
    
    if (result.affectedRows === 0) {
      throw new Error('文章更新失败');
    }
    
    // 如果有分类更新
    if (postData.categories && Array.isArray(postData.categories)) {
      await updatePostCategories(postId, postData.categories);
    }
    
    return getPostById(postId);
  } catch (error) {
    logger.error(`更新文章失败: ${error.message}`);
    throw error;
  }
};

/**
 * 更新文章分类
 * @param {number} postId - 文章ID
 * @param {Array<number>} categoryIds - 分类ID数组
 * @returns {Promise<boolean>} - 是否成功
 */
const updatePostCategories = async (postId, categoryIds) => {
  try {
    // 删除原有分类关联
    await query('DELETE FROM post_categories WHERE post_id = ?', [postId]);
    
    // 添加新分类关联
    if (categoryIds.length > 0) {
      const values = categoryIds.map(categoryId => [postId, categoryId]);
      const placeholders = values.map(() => '(?, ?)').join(', ');
      
      const sql = `INSERT INTO post_categories (post_id, category_id) VALUES ${placeholders}`;
      
      // 扁平化参数数组
      const params = values.flat();
      
      await query(sql, params);
    }
    
    return true;
  } catch (error) {
    logger.error(`更新文章分类失败: ${error.message}`);
    throw error;
  }
};

/**
 * 更新文章标签
 * @param {number} postId - 文章ID
 * @param {Array<number>} tagIds - 标签ID数组
 * @returns {Promise<boolean>} - 是否成功
 */
const updatePostTags = async (postId, tagIds) => {
  try {
    // 删除原有标签关联
    await query('DELETE FROM post_tags WHERE post_id = ?', [postId]);
    
    // 添加新标签关联
    if (tagIds.length > 0) {
      const values = tagIds.map(tagId => [postId, tagId]);
      const placeholders = values.map(() => '(?, ?)').join(', ');
      
      const sql = `INSERT INTO post_tags (post_id, tag_id) VALUES ${placeholders}`;
      
      // 扁平化参数数组
      const params = values.flat();
      
      await query(sql, params);
    }
    
    return true;
  } catch (error) {
    logger.error(`更新文章标签失败: ${error.message}`);
    throw error;
  }
};

/**
 * 删除文章
 * @param {number} postId - 文章ID
 * @returns {Promise<boolean>} - 是否删除成功
 */
const deletePost = async (postId) => {
  try {
    // 删除文章的分类关联
    await query('DELETE FROM post_categories WHERE post_id = ?', [postId]);
    
    // 删除文章
    const result = await query('DELETE FROM posts WHERE id = ?', [postId]);
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`删除文章失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取文章总数
 * @param {Object} options - 筛选选项
 * @returns {Promise<number>} - 文章总数
 */
const getPostsCount = async (options = {}) => {
  try {
    const { 
      search = '', 
      status = null,
      categoryId = null,
      authorId = null 
    } = options;
    
    let sql = 'SELECT COUNT(*) as count FROM posts p';
    
    const whereConditions = [];
    const params = [];
    
    if (categoryId) {
      sql += ' JOIN post_categories pc ON p.id = pc.post_id';
      whereConditions.push('pc.category_id = ?');
      params.push(categoryId);
    }
    
    if (search) {
      whereConditions.push('(p.title LIKE ? OR p.content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (status) {
      whereConditions.push('p.status = ?');
      params.push(status);
    }
    
    if (authorId) {
      whereConditions.push('p.author_id = ?');
      params.push(authorId);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    const result = await query(sql, params);
    return result[0].count;
  } catch (error) {
    logger.error(`获取文章总数失败: ${error.message}`);
    throw error;
  }
};

/**
 * 增加文章浏览次数
 * @param {number} postId - 文章ID
 * @returns {Promise<boolean>} - 是否成功
 */
const incrementViewCount = async (postId) => {
  try {
    const sql = 'UPDATE posts SET view_count = view_count + 1 WHERE id = ?';
    const result = await query(sql, [postId]);
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`增加文章浏览次数失败: ${error.message}`);
    throw error;
  }
};

/**
 * 搜索文章
 * @param {string} keyword - 搜索关键词
 * @param {Object} options - 分页选项
 * @returns {Promise<Array>} - 搜索结果
 */
const searchPosts = async (keyword, options = {}) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'published' 
    } = options;
    
    // 确保数值类型正确
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // 构建SQL查询
    let sql = `
      SELECT p.*, u.username as author_name
      FROM posts p
      LEFT JOIN public_users u ON p.author_id = u.id
      WHERE (p.title LIKE ? OR p.content LIKE ? OR p.excerpt LIKE ?)
    `;
    
    const params = [
      `%${keyword}%`, 
      `%${keyword}%`, 
      `%${keyword}%`
    ];
    
    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    
    // 添加排序和分页
    sql += ` ORDER BY p.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
    
    logger.debug(`执行搜索查询: ${sql}`);
    logger.debug(`参数: ${JSON.stringify(params)}`);
    
    const posts = await query(sql, params);
    
    // 获取每篇文章的分类
    for (const post of posts) {
      const categoriesSql = `
        SELECT c.id, c.name, c.slug
        FROM categories c
        JOIN post_categories pc ON c.id = pc.category_id
        WHERE pc.post_id = ?
      `;
      
      const categories = await query(categoriesSql, [post.id]);
      post.categories = categories;
    }
    
    return posts;
  } catch (error) {
    logger.error(`搜索文章失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取热门文章
 * @param {number} limit - 返回文章数量
 * @returns {Promise<Array>} - 热门文章数组
 */
const getHotPosts = async (limit = 5) => {
  try {
    const limitNumber = Number(limit);
    if (isNaN(limitNumber) || limitNumber <= 0) {
      throw new Error('无效的limit参数');
    }
    
    // 确保limitNumber是整数
    const limitInt = Math.floor(limitNumber);
    
    // 使用字符串拼接而不是参数化查询处理LIMIT
    const sql = `
      SELECT p.*, u.username as author_name 
      FROM posts p
      LEFT JOIN public_users u ON p.author_id = u.id
      WHERE p.status = 'published'
      ORDER BY p.view_count DESC
      LIMIT ${limitInt}
    `;
    
    const posts = await query(sql, []);
    
    // 获取每篇文章的分类
    for (const post of posts) {
      const categoriesSql = `
        SELECT c.id, c.name, c.slug, c.description
        FROM categories c
        JOIN post_categories pc ON c.id = pc.category_id
        WHERE pc.post_id = ?
      `;
      
      const categories = await query(categoriesSql, [post.id]);
      post.categories = categories;
    }
    
    return posts;
  } catch (error) {
    logger.error(`获取热门文章失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取最近发表的文章
 * @param {number} limit - 返回文章数量
 * @returns {Promise<Array>} - 最近文章数组
 */
const getRecentPosts = async (limit = 5) => {
  try {
    const limitNumber = Number(limit);
    if (isNaN(limitNumber) || limitNumber <= 0) {
      throw new Error('无效的limit参数');
    }
    
    // 确保limitNumber是整数
    const limitInt = Math.floor(limitNumber);
    
    const sql = `
      SELECT p.*, u.username as author_name 
      FROM posts p
      LEFT JOIN public_users u ON p.author_id = u.id
      WHERE p.status = 'published'
      ORDER BY 
        CASE WHEN p.publish_time IS NULL THEN 0 ELSE 1 END DESC,
        p.publish_time DESC,
        p.created_at DESC
      LIMIT ${limitInt}
    `;
    
    const posts = await query(sql, []);
    
    // 获取每篇文章的分类
    for (const post of posts) {
      const categoriesSql = `
        SELECT c.id, c.name, c.slug, c.description
        FROM categories c
        JOIN post_categories pc ON c.id = pc.category_id
        WHERE pc.post_id = ?
      `;
      
      const categories = await query(categoriesSql, [post.id]);
      post.categories = categories;
    }
    
    return posts;
  } catch (error) {
    logger.error(`获取最近文章失败: ${error.message}`);
    throw error;
  }
};

/**
 * 使用AI服务生成文章摘要
 * @param {string} content - 文章内容
 * @returns {Promise<string>} - 生成的摘要
 */
const generateAISummary = async (content) => {
  try {
    // 获取AI服务实例
    const service = await aiService.getAIService();
    
    // 默认摘要生成模板
    const summaryTemplate = '请为以下文章生成一个简洁的摘要（不超过200字）：\n\n{content}';
    
    // 限制内容长度，避免超出AI模型的输入限制
    const truncatedContent = content.length > 3000 
      ? content.substring(0, 3000) + '...' 
      : content;
    
    // 生成摘要
    const summary = await service.generateSummary(truncatedContent, summaryTemplate);
    
    return summary;
  } catch (error) {
    logger.error(`AI摘要生成失败: ${error.message}`);
    throw new Error(`AI摘要生成失败: ${error.message}`);
  }
};

/**
 * 更新文章摘要（使用AI生成）
 * @param {number} postId - 文章ID
 * @returns {Promise<Object>} - 更新后的文章记录
 */
const updatePostWithAISummary = async (postId) => {
  try {
    // 获取文章内容
    const post = await getPostById(postId);
    
    if (!post) {
      throw new Error('文章不存在');
    }
    
    // 生成AI摘要
    const aiSummary = await generateAISummary(post.content);
    
    // 更新文章摘要
    const sql = `
      UPDATE posts
      SET excerpt = ?,
          updated_at = NOW()
      WHERE id = ?
    `;
    
    await query(sql, [aiSummary, postId]);
    
    // 返回更新后的文章
    return getPostById(postId);
  } catch (error) {
    logger.error(`更新文章AI摘要失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取分类下的文章
 * @param {number} categoryId - 分类ID
 * @param {Object} options - 分页选项
 * @returns {Promise<Array>} - 文章数组
 */
const getPostsByCategory = async (categoryId, options = {}) => {
  try {
    if (!categoryId) {
      throw new Error('分类ID不能为空');
    }
    
    // 确保categoryId是数字
    const categoryIdNum = parseInt(categoryId, 10);
    if (isNaN(categoryIdNum)) {
      throw new Error(`无效的分类ID: ${categoryId}`);
    }
    
    const { 
      page = 1, 
      limit = 10, 
      status = 'published' 
    } = options;
    
    // 确保分页参数是数字
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // 构建SQL查询
    const sql = `
      SELECT p.*, u.username as author_name
      FROM posts p
      JOIN post_categories pc ON p.id = pc.post_id
      LEFT JOIN public_users u ON p.author_id = u.id
      WHERE pc.category_id = ?
      ${status ? 'AND p.status = ?' : ''}
      ORDER BY p.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    const params = [categoryIdNum];
    if (status) {
      params.push(status);
    }
    
    logger.debug(`执行分类文章查询: ${sql}`);
    logger.debug(`参数: ${JSON.stringify(params)}`);
    
    const posts = await query(sql, params);
    
    // 获取每篇文章的所有分类
    for (const post of posts) {
      const categoriesSql = `
        SELECT c.id, c.name, c.slug
        FROM categories c
        JOIN post_categories pc ON c.id = pc.category_id
        WHERE pc.post_id = ?
      `;
      
      const categories = await query(categoriesSql, [post.id]);
      post.categories = categories;
    }
    
    return posts;
  } catch (error) {
    logger.error(`获取分类文章失败: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createPost,
  ensureUniqueSlug,
  getPostById,
  getPostBySlug,
  getAllPosts,
  updatePost,
  updatePostCategories,
  updatePostTags,
  deletePost,
  getPostsCount,
  incrementViewCount,
  searchPosts,
  getHotPosts,
  getRecentPosts,
  generateAISummary,
  updatePostWithAISummary,
  getPostsByCategory
}; 
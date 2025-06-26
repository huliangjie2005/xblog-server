/**
 * 文章模型
 * 处理与posts表相关的数据操作
 */
const { query } = require('../config/db');

class PostModel {
  /**
   * 查找所有文章
   * @param {Object} options 查询选项
   * @returns {Promise<Array>} 文章列表
   */
  static async find(conditions = {}, options = {}) {
    const { skip = 0, limit = 10, sort = {} } = options;

    // 首先获取基本文章信息
    let sql = `SELECT p.*,
              u.username as author_name,
              u.avatar as author_avatar,
              c.name as category_name,
              c.slug as category_slug
              FROM posts p
              LEFT JOIN public_users u ON p.author_id = u.id
              LEFT JOIN categories c ON p.category_id = c.id`;
    
    const params = [];
    let whereClause = '';
    
    // 构建WHERE子句
    if (Object.keys(conditions).length > 0) {
      whereClause = ' WHERE ';
      const clauses = [];
      
      if (conditions.author) {
        clauses.push('p.author_id = ?');
        params.push(conditions.author);
      }
      
      if (conditions.status) {
        clauses.push('p.status = ?');
        params.push(conditions.status);
      }
      
      whereClause += clauses.join(' AND ');
    }
    
    sql += whereClause;
    
    // 排序
    if (Object.keys(sort).length > 0) {
      const sortKey = Object.keys(sort)[0];
      const sortOrder = sort[sortKey] === -1 ? 'DESC' : 'ASC';
      sql += ` ORDER BY p.${sortKey} ${sortOrder}`;
    } else {
      sql += ' ORDER BY p.created_at DESC';
    }
    
    // 分页
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(skip));

    // 执行主查询
    const posts = await query(sql, params);

    // 为每篇文章查询标签
    if (posts.length > 0) {
      const postIds = posts.map(post => post.id);
      const placeholders = postIds.map(() => '?').join(',');

      const tagsQuery = `
        SELECT pt.post_id, t.id, t.name, t.slug
        FROM post_tags pt
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${placeholders})
        ORDER BY pt.post_id, t.name
      `;

      const tagsResult = await query(tagsQuery, postIds);

      // 将标签数据组织到文章中
      const tagsMap = {};
      tagsResult.forEach(tag => {
        if (!tagsMap[tag.post_id]) {
          tagsMap[tag.post_id] = [];
        }
        tagsMap[tag.post_id].push({
          id: tag.id,
          name: tag.name,
          slug: tag.slug
        });
      });

      // 将标签添加到文章数据中
      posts.forEach(post => {
        post.tags = tagsMap[post.id] || [];
      });
    }

    return posts;
  }
  
  /**
   * 查找单个文章
   * @param {string} id 文章ID
   * @returns {Promise<Object>} 文章数据
   */
  static async findById(id) {
    const sql = `SELECT p.*,
                u.username as author_name,
                u.avatar as author_avatar,
                c.name as category_name,
                c.slug as category_slug
                FROM posts p
                LEFT JOIN public_users u ON p.author_id = u.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.id = ?`;

    const results = await query(sql, [id]);
    if (results.length === 0) {
      return null;
    }

    const post = results[0];

    // 查询文章标签
    const tagsQuery = `
      SELECT t.id, t.name, t.slug
      FROM post_tags pt
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE pt.post_id = ?
      ORDER BY t.name
    `;

    const tags = await query(tagsQuery, [id]);
    post.tags = tags || [];

    return post;
  }
  
  /**
   * 统计文章数量
   * @param {Object} conditions 查询条件
   * @returns {Promise<number>} 文章数量
   */
  static async countDocuments(conditions = {}) {
    let sql = 'SELECT COUNT(*) as total FROM posts';
    
    const params = [];
    let whereClause = '';
    
    // 构建WHERE子句
    if (Object.keys(conditions).length > 0) {
      whereClause = ' WHERE ';
      const clauses = [];
      
      if (conditions.author) {
        clauses.push('author_id = ?');
        params.push(conditions.author);
      }
      
      if (conditions.status) {
        clauses.push('status = ?');
        params.push(conditions.status);
      }
      
      whereClause += clauses.join(' AND ');
    }
    
    sql += whereClause;
    
    const results = await query(sql, params);
    return results[0].total;
  }
  
  /**
   * 创建文章
   * @param {Object} data 文章数据
   * @returns {Promise<Object>} 创建的文章
   */
  static async create(data) {
    const {
      title,
      slug,
      content,
      excerpt = '',
      featured_image = null,
      status = 'draft',
      author_id,
      category_id = null,
      tags = []
    } = data;

    // 基本验证
    if (!title || !content) {
      throw new Error('标题和内容不能为空');
    }

    if (!author_id) {
      throw new Error('作者ID不能为空');
    }

    // 生成发布时间
    const publish_time = status === 'published' ? new Date() : null;

    const sql = `
      INSERT INTO posts (title, slug, content, excerpt, featured_image, status, author_id, category_id, publish_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [title, slug, content, excerpt, featured_image, status, author_id, category_id, publish_time];

    console.log('执行SQL:', sql);
    console.log('参数:', params);

    const result = await query(sql, params);

    // 处理标签关联（如果有标签）
    if (tags && tags.length > 0) {
      console.log('处理文章标签关联:', tags);
      for (const tagId of tags) {
        try {
          await query(
            'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)',
            [result.insertId, tagId]
          );
        } catch (tagError) {
          console.warn('标签关联失败:', tagError.message);
        }
      }
    }

    return {
      id: result.insertId,
      title,
      slug,
      content,
      excerpt,
      featured_image,
      status,
      author_id,
      category_id,
      tags,
      publish_time,
      created_at: new Date(),
      updated_at: new Date()
    };
  }
  
  /**
   * 更新文章
   * @param {string} id 文章ID
   * @param {Object} data 更新数据
   * @param {Object} options 更新选项
   * @returns {Promise<Object>} 更新后的文章
   */
  static async findByIdAndUpdate(id, data, options = {}) {
    // 获取当前文章状态，检查是否需要更新发布时间
    const currentPost = await this.findById(id);
    if (!currentPost) {
      return null;
    }
    
    const updateFields = [];
    const updateParams = [];
    
    Object.keys(data).forEach(key => {
      if (key !== 'id' && key !== 'created_at') {
        if (key === 'status' && data.status === 'published' && currentPost.status !== 'published') {
          // 如果文章状态从非发布变为发布，设置发布时间
          updateFields.push('publish_time = ?');
          updateParams.push(new Date());
        }
        
        updateFields.push(`${key} = ?`);
        updateParams.push(data[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return currentPost;
    }
    
    updateParams.push(id);
    
    const sql = `
      UPDATE posts 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;
    
    await query(sql, updateParams);
    
    return this.findById(id);
  }
  
  /**
   * 删除文章
   * @param {string} id 文章ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async findByIdAndDelete(id) {
    const sql = 'DELETE FROM posts WHERE id = ?';
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = PostModel; 
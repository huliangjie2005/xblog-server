/**
 * 管理员标签控制器
 * 处理管理员对标签的管理操作
 */

const { query } = require('../../config/db');
const { logger } = require('../../utils/logger');
const slugify = require('slugify');

/**
 * 获取所有标签
 */
const getAllTags = async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'name', keyword } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let conditions = [];
    let params = [];
    
    if (keyword) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 排序方式
    let orderBy = 'name ASC';
    if (sort === 'count') {
      orderBy = 'count DESC, name ASC';
    } else if (sort === 'recent') {
      orderBy = 'created_at DESC, name ASC';
    }
    
    // 查询标签列表
    const tags = await query(
      `SELECT id, name, slug, description, 
              IFNULL(count, 0) as count, 
              created_at
       FROM tags
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    
    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM tags ${whereClause}`;
    const [{ total }] = await query(countQuery, params);
    
    return res.status(200).json({
      status: 'success',
      message: '获取标签列表成功',
      data: {
        tags,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error(`获取标签列表失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '获取标签列表失败'
    });
  }
};

/**
 * 获取单个标签
 */
const getTagById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [tag] = await query(
      'SELECT id, name, slug, description, IFNULL(count, 0) as count, created_at FROM tags WHERE id = ?',
      [id]
    );
    
    if (!tag) {
      return res.status(404).json({
        status: 'error',
        message: '标签不存在'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: '获取标签成功',
      data: { tag }
    });
  } catch (error) {
    logger.error(`获取标签失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '获取标签失败'
    });
  }
};

/**
 * 创建标签
 */
const createTag = async (req, res) => {
  try {
    const { name, slug: customSlug, description } = req.body;
    
    // 检查标签名是否已存在
    const [existingTagName] = await query('SELECT id FROM tags WHERE name = ?', [name]);
    
    if (existingTagName) {
      return res.status(400).json({
        status: 'error',
        message: '标签名已存在'
      });
    }
    
    // 生成或检查别名
    const slug = customSlug || slugify(name, { lower: true, strict: true });
    
    // 检查别名是否已存在
    const [existingTagSlug] = await query('SELECT id FROM tags WHERE slug = ?', [slug]);
    
    if (existingTagSlug) {
      return res.status(400).json({
        status: 'error',
        message: '标签别名已存在'
      });
    }
    
    // 插入标签
    const result = await query(
      'INSERT INTO tags (name, slug, description) VALUES (?, ?, ?)',
      [name, slug, description || null]
    );
    
    const tagId = result.insertId;
    
    // 获取新创建的标签
    const [newTag] = await query(
      'SELECT id, name, slug, description, IFNULL(count, 0) as count, created_at FROM tags WHERE id = ?',
      [tagId]
    );
    
    return res.status(201).json({
      status: 'success',
      message: '创建标签成功',
      data: { tag: newTag }
    });
  } catch (error) {
    logger.error(`创建标签失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '创建标签失败'
    });
  }
};

/**
 * 更新标签
 */
const updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug: customSlug, description } = req.body;
    
    // 检查标签是否存在
    const [existingTag] = await query(
      'SELECT id, name, slug FROM tags WHERE id = ?',
      [id]
    );
    
    if (!existingTag) {
      return res.status(404).json({
        status: 'error',
        message: '标签不存在'
      });
    }
    
    // 如果修改了名称，检查是否与其他标签冲突
    if (name !== existingTag.name) {
      const [existingTagName] = await query(
        'SELECT id FROM tags WHERE name = ? AND id != ?',
        [name, id]
      );
      
      if (existingTagName) {
        return res.status(400).json({
          status: 'error',
          message: '标签名已存在'
        });
      }
    }
    
    // 生成或检查别名
    const slug = customSlug || slugify(name, { lower: true, strict: true });
    
    // 如果修改了别名，检查是否与其他标签冲突
    if (slug !== existingTag.slug) {
      const [existingTagSlug] = await query(
        'SELECT id FROM tags WHERE slug = ? AND id != ?',
        [slug, id]
      );
      
      if (existingTagSlug) {
        return res.status(400).json({
          status: 'error',
          message: '标签别名已存在'
        });
      }
    }
    
    // 更新标签
    await query(
      'UPDATE tags SET name = ?, slug = ?, description = ? WHERE id = ?',
      [name, slug, description || null, id]
    );
    
    // 获取更新后的标签
    const [updatedTag] = await query(
      'SELECT id, name, slug, description, IFNULL(count, 0) as count, created_at FROM tags WHERE id = ?',
      [id]
    );
    
    return res.status(200).json({
      status: 'success',
      message: '更新标签成功',
      data: { tag: updatedTag }
    });
  } catch (error) {
    logger.error(`更新标签失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '更新标签失败'
    });
  }
};

/**
 * 删除标签
 */
const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查标签是否存在
    const [existingTag] = await query('SELECT id FROM tags WHERE id = ?', [id]);
    
    if (!existingTag) {
      return res.status(404).json({
        status: 'error',
        message: '标签不存在'
      });
    }
    
    // 开始事务
    await query('START TRANSACTION');
    
    try {
      // 删除文章标签关联
      await query('DELETE FROM post_tags WHERE tag_id = ?', [id]);
      
      // 删除标签
      await query('DELETE FROM tags WHERE id = ?', [id]);
      
      // 提交事务
      await query('COMMIT');
      
      return res.status(200).json({
        status: 'success',
        message: '删除标签成功'
      });
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`删除标签失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '删除标签失败'
    });
  }
};

/**
 * 获取标签下的文章
 */
const getTagArticles = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // 检查标签是否存在
    const [tag] = await query('SELECT id, name FROM tags WHERE id = ?', [id]);
    
    if (!tag) {
      return res.status(404).json({
        status: 'error',
        message: '标签不存在'
      });
    }
    
    // 查询标签下的文章
    const articles = await query(
      `SELECT p.id, p.title, p.status, p.created_at, 
              IFNULL(p.view_count, 0) as view_count, 
              IFNULL(p.like_count, 0) as like_count,
              u.id as author_id, u.username as author_name
       FROM posts p
       JOIN post_tags pt ON p.id = pt.post_id
       JOIN admin_users u ON p.author_id = u.id
       WHERE pt.tag_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, parseInt(limit), offset]
    );
    
    // 获取总数
    const [{ total }] = await query(
      'SELECT COUNT(*) as total FROM posts p JOIN post_tags pt ON p.id = pt.post_id WHERE pt.tag_id = ?',
      [id]
    );
    
    return res.status(200).json({
      status: 'success',
      message: '获取标签文章成功',
      data: {
        tag,
        articles,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error(`获取标签文章失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '获取标签文章失败'
    });
  }
};

/**
 * 批量创建标签
 */
const batchCreateTags = async (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的标签数组'
      });
    }
    
    const createdTags = [];
    const failedTags = [];
    
    // 开始事务
    await query('START TRANSACTION');
    
    try {
      for (const tag of tags) {
        const { name, description } = tag;
        
        // 检查必填字段
        if (!name) {
          failedTags.push({
            name: name || '未知',
            error: '标签名称不能为空'
          });
          continue;
        }
        
        // 检查标签名是否已存在
        const [existingTagName] = await query('SELECT id FROM tags WHERE name = ?', [name]);
        
        if (existingTagName) {
          failedTags.push({
            name,
            error: '标签名已存在'
          });
          continue;
        }
        
        // 生成别名
        const slug = slugify(name, { lower: true, strict: true });
        
        // 检查别名是否已存在
        const [existingTagSlug] = await query('SELECT id FROM tags WHERE slug = ?', [slug]);
        
        if (existingTagSlug) {
          failedTags.push({
            name,
            error: '标签别名已存在'
          });
          continue;
        }
        
        // 插入标签
        const result = await query(
          'INSERT INTO tags (name, slug, description) VALUES (?, ?, ?)',
          [name, slug, description || null]
        );
        
        const tagId = result.insertId;
        
        // 获取新创建的标签
        const [newTag] = await query(
          'SELECT id, name, slug, description, IFNULL(count, 0) as count, created_at FROM tags WHERE id = ?',
          [tagId]
        );
        
        createdTags.push(newTag);
      }
      
      // 提交事务
      await query('COMMIT');
      
      return res.status(201).json({
        status: 'success',
        message: `成功创建 ${createdTags.length} 个标签，失败 ${failedTags.length} 个`,
        data: {
          created: createdTags,
          failed: failedTags
        }
      });
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`批量创建标签失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '批量创建标签失败'
    });
  }
};

/**
 * 批量删除标签
 */
const batchDeleteTags = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的标签ID列表'
      });
    }
    
    // 将所有id转换为数字类型
    const numericIds = ids.map(id => parseInt(id, 10));
    
    // 开始事务
    await query('START TRANSACTION');
    
    try {
      // 删除文章标签关联
      await query('DELETE FROM post_tags WHERE tag_id IN (?)', [numericIds]);
      
      // 删除标签
      const deleteResult = await query('DELETE FROM tags WHERE id IN (?)', [numericIds]);
      
      // 提交事务
      await query('COMMIT');
      
      if (deleteResult.affectedRows === 0) {
        return res.status(404).json({
          status: 'error',
          message: '没有找到匹配的标签'
        });
      }
      
      return res.status(200).json({
        status: 'success',
        message: `成功删除 ${deleteResult.affectedRows} 个标签`,
        data: { count: deleteResult.affectedRows }
      });
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`批量删除标签失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '批量删除标签失败'
    });
  }
};

module.exports = {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  getTagArticles,
  batchCreateTags,
  batchDeleteTags
}; 
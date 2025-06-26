/**
 * 管理员评论控制器
 * 处理管理员对评论的管理操作
 */

const { query } = require('../../config/db');
const { logger } = require('../../utils/logger');

/**
 * 获取所有评论列表
 */
const getAllComments = async (req, res) => {
  try {
    logger.info('开始获取评论列表...');
    logger.info(`管理员ID: ${req.admin?.id || '未知'}`);
    logger.info(`查询参数: ${JSON.stringify(req.query)}`);
    
    const { page = 1, limit = 10, status, article_id, user_id, keyword } = req.query;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let whereClause = '';
    let params = [];
    
    if (status !== undefined) {
      whereClause += 'WHERE c.status = ?';
      params.push(status);
    } else {
      whereClause += 'WHERE 1=1';
    }
    
    if (article_id) {
      whereClause += ' AND c.post_id = ?';
      params.push(article_id);
    }
    
    if (user_id) {
      whereClause += ' AND c.author_id = ?';
      params.push(user_id);
    }
    
    if (keyword) {
      whereClause += ' AND (c.content LIKE ? OR u.username LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    logger.info(`构建的WHERE子句: ${whereClause}`);
    logger.info(`查询参数: ${JSON.stringify(params)}`);
    
    // 构建评论列表查询 - 移除不存在的likes字段
    const commentsQuery = `
      SELECT c.id, c.post_id, c.author_id, c.content, c.parent_id, 
             c.created_at, c.status, 
             u.username, u.avatar, p.title as post_title
      FROM comments c
      LEFT JOIN public_users u ON c.author_id = u.id
      LEFT JOIN posts p ON c.post_id = p.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    logger.info(`评论列表查询SQL: ${commentsQuery}`);
    
    try {
      // 查询评论列表
      const comments = await query(
        commentsQuery,
        [...params, parseInt(limit), offset]
      );
      
      logger.info(`评论列表查询成功，返回${comments.length}条记录`);
      
      // 构建计数查询
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM comments c
        LEFT JOIN public_users u ON c.author_id = u.id
        ${whereClause}
      `;
      
      logger.info(`计数查询SQL: ${countQuery}`);
      
      // 获取总数
      const countResults = await query(countQuery, params);
      logger.info(`计数查询结果: ${JSON.stringify(countResults)}`);
      
      const total = countResults[0]?.total || 0;
      
      return res.status(200).json({
        status: 'success',
        message: '获取评论列表成功',
        data: {
          comments,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (dbError) {
      logger.error(`数据库查询失败: ${dbError.message}`);
      logger.error(`数据库错误代码: ${dbError.code}`);
      logger.error(`数据库错误SQL状态: ${dbError.sqlState}`);
      throw new Error(`数据库查询失败: ${dbError.message}`);
    }
  } catch (error) {
    logger.error(`获取评论列表失败: ${error.message}`);
    logger.error(`错误堆栈: ${error.stack}`);
    return res.status(500).json({
      status: 'error',
      message: '获取评论列表失败',
      error: error.message
    });
  }
};

/**
 * 获取单个评论详情
 */
const getCommentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 移除不存在的likes字段
    const [comment] = await query(
      `SELECT c.id, c.post_id, c.author_id, c.content, c.parent_id, 
              c.created_at, c.status, 
              u.username, u.avatar, p.title as post_title
       FROM comments c
       LEFT JOIN public_users u ON c.author_id = u.id
       LEFT JOIN posts p ON c.post_id = p.id
       WHERE c.id = ?`,
      [id]
    );
    
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: '评论不存在'
      });
    }
    
    // 如果有父评论，获取父评论信息
    if (comment.parent_id) {
      const [parentComment] = await query(
        `SELECT c.id, c.content, u.username, u.avatar
         FROM comments c
         LEFT JOIN public_users u ON c.author_id = u.id
         WHERE c.id = ?`,
        [comment.parent_id]
      );
      
      if (parentComment) {
        comment.parent_comment = parentComment;
      }
    }
    
    // 获取子评论 - 移除不存在的likes字段
    const replies = await query(
      `SELECT c.id, c.content, c.created_at, c.status,
              u.username, u.avatar
       FROM comments c
       LEFT JOIN public_users u ON c.author_id = u.id
       WHERE c.parent_id = ?
       ORDER BY c.created_at ASC`,
      [comment.id]
    );
    
    comment.replies = replies;
    
    return res.status(200).json({
      status: 'success',
      message: '获取评论详情成功',
      data: { comment }
    });
  } catch (error) {
    logger.error(`获取评论详情失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '获取评论详情失败',
      error: error.message
    });
  }
};

/**
 * 审核通过评论
 */
const approveComment = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.admin.id;
    
    // 检查评论是否存在
    const [comment] = await query('SELECT id, status FROM comments WHERE id = ?', [id]);
    
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: '评论不存在'
      });
    }
    
    // 更新评论状态
    await query(
      "UPDATE comments SET status = 'approved' WHERE id = ?",
      [id]
    );
    
    // 记录审核日志
    await query(
      'INSERT INTO comment_audit_logs (comment_id, admin_id, action, created_at) VALUES (?, ?, ?, NOW())',
      [id, admin_id, 'approve']
    );
    
    return res.status(200).json({
      status: 'success',
      message: '评论审核通过成功'
    });
  } catch (error) {
    logger.error(`审核评论失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '审核评论失败'
    });
  }
};

/**
 * 拒绝评论
 */
const rejectComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '内容不符合规范' } = req.body;
    const admin_id = req.admin.id;
    
    // 检查评论是否存在
    const [comment] = await query('SELECT id, status FROM comments WHERE id = ?', [id]);
    
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: '评论不存在'
      });
    }
    
    // 更新评论状态
    await query(
      "UPDATE comments SET status = 'rejected' WHERE id = ?",
      [id]
    );
    
    // 记录审核日志
    await query(
      'INSERT INTO comment_audit_logs (comment_id, admin_id, action, reason, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, admin_id, 'reject', reason]
    );
    
    return res.status(200).json({
      status: 'success',
      message: '评论已拒绝'
    });
  } catch (error) {
    logger.error(`拒绝评论失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '拒绝评论失败'
    });
  }
};

/**
 * 删除评论
 */
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.admin.id;
    
    // 检查评论是否存在
    const [comment] = await query('SELECT id FROM comments WHERE id = ?', [id]);
    
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: '评论不存在'
      });
    }
    
    // 删除评论
    await query('DELETE FROM comments WHERE id = ?', [id]);
    
    // 记录审核日志
    await query(
      'INSERT INTO comment_audit_logs (comment_id, admin_id, action, created_at) VALUES (?, ?, ?, NOW())',
      [id, admin_id, 'delete']
    );
    
    return res.status(200).json({
      status: 'success',
      message: '评论删除成功'
    });
  } catch (error) {
    logger.error(`删除评论失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '删除评论失败'
    });
  }
};

/**
 * 获取待审核评论
 */
const getPendingComments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // 移除不存在的likes字段
    const pendingComments = await query(
      `SELECT c.id, c.post_id, c.author_id, c.content, c.parent_id, 
              c.created_at, c.status, 
              u.username, u.avatar, p.title as post_title
       FROM comments c
       LEFT JOIN public_users u ON c.author_id = u.id
       LEFT JOIN posts p ON c.post_id = p.id
       WHERE c.status = 'pending'
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );
    
    // 获取总数
    const [{ total }] = await query(
      `SELECT COUNT(*) as total 
       FROM comments c
       WHERE c.status = 'pending'`
    );
    
    return res.status(200).json({
      status: 'success',
      message: '获取待审核评论成功',
      data: {
        comments: pendingComments,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error(`获取待审核评论失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '获取待审核评论失败',
      error: error.message
    });
  }
};

/**
 * 批量审核通过评论
 */
const batchApproveComments = async (req, res) => {
  try {
    const { ids } = req.body;
    const admin_id = req.admin.id;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的评论ID列表'
      });
    }
    
    // 批量更新评论状态
    await query(
      "UPDATE comments SET status = 'approved' WHERE id IN (?)",
      [ids]
    );
    
    // 批量记录审核日志
    const values = ids.map(id => [id, admin_id, 'approve', new Date()]);
    await query(
      'INSERT INTO comment_audit_logs (comment_id, admin_id, action, created_at) VALUES ?',
      [values]
    );
    
    return res.status(200).json({
      status: 'success',
      message: `成功批量通过 ${ids.length} 条评论`,
      data: { count: ids.length }
    });
  } catch (error) {
    logger.error(`批量审核评论失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '批量审核评论失败'
    });
  }
};

/**
 * 批量拒绝评论
 */
const batchRejectComments = async (req, res) => {
  try {
    const { ids, reason = '内容不符合规范' } = req.body;
    const admin_id = req.admin.id;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的评论ID列表'
      });
    }
    
    // 批量更新评论状态
    await query(
      "UPDATE comments SET status = 'rejected' WHERE id IN (?)",
      [ids]
    );
    
    // 批量记录审核日志
    const values = ids.map(id => [id, admin_id, 'reject', reason, new Date()]);
    await query(
      'INSERT INTO comment_audit_logs (comment_id, admin_id, action, reason, created_at) VALUES ?',
      [values]
    );
    
    return res.status(200).json({
      status: 'success',
      message: `成功批量拒绝 ${ids.length} 条评论`,
      data: { count: ids.length }
    });
  } catch (error) {
    logger.error(`批量拒绝评论失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '批量拒绝评论失败'
    });
  }
};

module.exports = {
  getAllComments,
  getCommentById,
  approveComment,
  rejectComment,
  deleteComment,
  getPendingComments,
  batchApproveComments,
  batchRejectComments
}; 
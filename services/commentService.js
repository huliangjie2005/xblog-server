const { query } = require('../config/db');
const { logger } = require('../utils/logger');

/**
 * 获取文章的评论
 * @param {number} postId - 文章ID
 * @param {object} options - 分页选项
 * @returns {Promise<Array>} - 评论数组
 */
const getCommentsByPostId = async (postId, options = {}) => {
  try {
    // 确保postId是数字
    const postIdNum = parseInt(postId, 10);
    if (isNaN(postIdNum)) {
      throw new Error(`无效的文章ID: ${postId}`);
    }
    
    const { page = 1, limit = 10, includeReplies = true } = options;
    
    // 确保分页参数是数字
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // 先获取顶级评论
    const sql = `
      SELECT c.*, u.username, u.avatar 
      FROM comments c
      LEFT JOIN public_users u ON c.author_id = u.id
      WHERE c.post_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const comments = await query(sql, [postIdNum, limitNum, offset]);
    
    // 如果需要包含回复，则为每个评论获取回复
    if (includeReplies && comments.length > 0) {
      for (const comment of comments) {
        comment.replies = await getRepliesByCommentId(comment.id);
      }
    }
    
    return comments;
  } catch (error) {
    logger.error(`获取文章评论失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取评论的回复
 * @param {number} commentId - 父评论ID
 * @returns {Promise<Array>} - 回复数组
 */
const getRepliesByCommentId = async (commentId) => {
  try {
    const sql = `
      SELECT c.*, u.username, u.avatar 
      FROM comments c
      LEFT JOIN public_users u ON c.author_id = u.id
      WHERE c.parent_id = ?
      ORDER BY c.created_at ASC
    `;
    
    return await query(sql, [commentId]);
  } catch (error) {
    logger.error(`获取评论回复失败: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getCommentsByPostId,
  getRepliesByCommentId
}; 
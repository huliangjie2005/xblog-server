/**
 * 管理员评论路由
 * 处理管理员对评论的管理操作
 */

const express = require('express');
const router = express.Router();
const commentController = require('../../controllers/admin/commentController');
// 使用统一认证中间件
const { verifyAdmin } = require('../../middlewares/unified-auth');
const ApiResponse = require('../../utils/response');
const { query } = require('../../config/db');

/**
 * @route GET /api/admin/comments/pending
 * @desc 获取待审核评论
 * @access Private (管理员)
 */
router.get('/pending', verifyAdmin, commentController.getPendingComments);

/**
 * @route PUT /api/admin/comments/batch/approve
 * @desc 批量审核通过评论
 * @access Private (管理员)
 */
router.put('/batch/approve', verifyAdmin, commentController.batchApproveComments);

/**
 * @route PUT /api/admin/comments/batch/reject
 * @desc 批量拒绝评论
 * @access Private (管理员)
 */
router.put('/batch/reject', verifyAdmin, commentController.batchRejectComments);

/**
 * @route GET /api/admin/comments
 * @desc 获取所有评论列表
 * @access Private (管理员)
 */
router.get('/', verifyAdmin, commentController.getAllComments);

/**
 * @route GET /api/admin/comments/:id
 * @desc 获取单个评论详情
 * @access Private (管理员)
 */
router.get('/:id', verifyAdmin, commentController.getCommentById);

/**
 * @route PUT /api/admin/comments/:id/approve
 * @desc 审核通过评论
 * @access Private (管理员)
 */
router.put('/:id/approve', verifyAdmin, commentController.approveComment);

/**
 * @route PUT /api/admin/comments/:id/reject
 * @desc 拒绝评论
 * @access Private (管理员)
 */
router.put('/:id/reject', verifyAdmin, commentController.rejectComment);

/**
 * @route DELETE /api/admin/comments/:id
 * @desc 删除评论
 * @access Private (管理员)
 */
router.delete('/:id', verifyAdmin, commentController.deleteComment);

// 获取评论数量
router.get('/count', verifyAdmin, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM comments');
    return res.json({ success: true, data: { count: result[0].count } });
  } catch (error) {
    return res.status(500).json({ success: false, message: '获取评论数量失败', code: 500 });
  }
});

module.exports = router; 
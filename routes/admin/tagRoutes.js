/**
 * 管理员标签路由
 * 处理管理员对标签的管理操作
 */

const express = require('express');
const router = express.Router();
const tagController = require('../../controllers/admin/tagController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { validateTag } = require('../../middlewares/validators');
const ApiResponse = require('../../utils/response');
const { query } = require('../../config/db');
const { directVerifyAdmin } = require('../../middlewares/directAuth');

/**
 * @route GET /api/admin/tags
 * @desc 获取所有标签
 * @access Private (管理员)
 */
router.get('/', authMiddleware, tagController.getAllTags);

/**
 * @route GET /api/admin/tags/:id
 * @desc 获取单个标签
 * @access Private (管理员)
 */
router.get('/:id', authMiddleware, tagController.getTagById);

/**
 * @route POST /api/admin/tags
 * @desc 创建标签
 * @access Private (管理员)
 */
router.post('/', authMiddleware, validateTag, tagController.createTag);

/**
 * @route PUT /api/admin/tags/:id
 * @desc 更新标签
 * @access Private (管理员)
 */
router.put('/:id', authMiddleware, validateTag, tagController.updateTag);

/**
 * @route DELETE /api/admin/tags/:id
 * @desc 删除标签
 * @access Private (管理员)
 */
router.delete('/:id', authMiddleware, tagController.deleteTag);

/**
 * @route GET /api/admin/tags/:id/articles
 * @desc 获取标签下的文章
 * @access Private (管理员)
 */
router.get('/:id/articles', authMiddleware, tagController.getTagArticles);

/**
 * @route POST /api/admin/tags/batch
 * @desc 批量创建标签
 * @access Private (管理员)
 */
router.post('/batch', authMiddleware, tagController.batchCreateTags);

/**
 * @route DELETE /api/admin/tags/batch
 * @desc 批量删除标签
 * @access Private (管理员)
 */
router.delete('/batch', authMiddleware, tagController.batchDeleteTags);

// 获取标签数量
router.get('/count', directVerifyAdmin, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM tags');
    return res.json({ success: true, data: { count: result[0].count } });
  } catch (error) {
    return res.status(500).json({ success: false, message: '获取标签数量失败', code: 500 });
  }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const postController = require('../../controllers/admin/postController');
const { verifyAdmin } = require('../../middlewares/unified-auth');
const { postValidationRules } = require('../../middlewares/validators');
const ApiResponse = require('../../utils/response');
const PostModel = require('../../models/post.model');

/**
 * @route POST /api/admin/posts
 * @desc 创建文章
 * @access Private (Admin)
 */
router.post(
  '/',
  verifyAdmin,
  postValidationRules(),
  postController.createPost
);

/**
 * @route GET /api/admin/posts
 * @desc 获取所有文章
 * @access Private (Admin)
 */
router.get(
  '/',
  verifyAdmin,
  postController.getAllPosts
);

/**
 * @route GET /api/admin/posts/my-posts
 * @desc 获取用户自己的文章
 * @access Private (Admin)
 */
router.get(
  '/my-posts',
  verifyAdmin,
  postController.getMyPosts
);

/**
 * @route GET /api/admin/posts/:id
 * @desc 获取单个文章
 * @access Private (Admin)
 */
router.get(
  '/:id',
  verifyAdmin,
  postController.getPostById
);

/**
 * @route PUT /api/admin/posts/:id
 * @desc 更新文章
 * @access Private (Admin)
 */
router.put(
  '/:id',
  verifyAdmin,
  postValidationRules(true),
  postController.updatePost
);

/**
 * @route DELETE /api/admin/posts/:id
 * @desc 删除文章
 * @access Private (Admin)
 */
router.delete(
  '/:id',
  verifyAdmin,
  postController.deletePost
);

// 获取文章数量
router.get('/count', verifyAdmin, async (req, res) => {
  try {
    const count = await PostModel.countDocuments();
    return res.json({ success: true, data: { count } });
  } catch (error) {
    return res.status(500).json({ success: false, message: '获取文章数量失败', code: 500 });
  }
});

module.exports = router; 
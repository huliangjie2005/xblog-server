const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/admin/categoryController');
const { verifyAdmin } = require('../../middlewares/unified-auth');
const { categoryValidationRules } = require('../../middlewares/validators');
const ApiResponse = require('../../utils/response');
const { createInvalidationMiddleware } = require('../../services/cacheInvalidationService');
const { query } = require('../../config/db');
const { directVerifyAdmin } = require('../../middlewares/directAuth');

/**
 * @route POST /api/admin/categories
 * @desc 创建分类
 * @access Private (Admin)
 */
router.post(
  '/',
  verifyAdmin,
  categoryValidationRules(),
  categoryController.createCategory
);

/**
 * @route GET /api/admin/categories
 * @desc 获取所有分类
 * @access Private (Admin)
 */
router.get(
  '/',
  verifyAdmin,
  categoryController.getAllCategories
);

/**
 * @route GET /api/admin/categories/hierarchy
 * @desc 获取分类层级结构
 * @access Private (Admin)
 */
router.get(
  '/hierarchy',
  verifyAdmin,
  categoryController.getCategoryHierarchy
);

/**
 * @route GET /api/admin/categories/:id
 * @desc 获取单个分类
 * @access Private (Admin)
 */
router.get(
  '/:id',
  verifyAdmin,
  categoryController.getCategoryById
);

/**
 * @route PUT /api/admin/categories/:id
 * @desc 更新分类
 * @access Private (Admin)
 */
router.put(
  '/:id',
  verifyAdmin,
  categoryValidationRules(true),
  categoryController.updateCategory
);

/**
 * @route DELETE /api/admin/categories/:id
 * @desc 删除分类
 * @access Private (Admin)
 */
router.delete(
  '/:id',
  verifyAdmin,
  categoryController.deleteCategory
);

// 获取分类数量
router.get('/count', directVerifyAdmin, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM categories');
    return res.json({ success: true, data: { count: result[0].count } });
  } catch (error) {
    return res.status(500).json({ success: false, message: '获取分类数量失败', code: 500 });
  }
});

module.exports = router; 
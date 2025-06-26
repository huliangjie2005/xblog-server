const { body, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');

/**
 * 文章验证规则
 * @param {boolean} isUpdate - 是否是更新操作
 * @returns {Array} - 验证规则数组
 */
const postValidationRules = (isUpdate = false) => {
  const rules = [
    body('title')
      .if((value, { req }) => !isUpdate || value !== undefined)
      .notEmpty()
      .withMessage('标题不能为空')
      .isLength({ min: 3, max: 255 })
      .withMessage('标题长度应在3-255个字符之间'),
    
    body('content')
      .if((value, { req }) => !isUpdate || value !== undefined)
      .notEmpty()
      .withMessage('内容不能为空'),
    
    body('excerpt')
      .optional()
      .isLength({ max: 500 })
      .withMessage('摘要不能超过500个字符'),
    
    body('featuredImage')
      .optional()
      .custom((value) => {
        // 如果值为空字符串或null，则允许通过
        if (!value || value === '') {
          return true;
        }
        // 如果有值，则验证是否为有效URL
        try {
          new URL(value);
          return true;
        } catch {
          throw new Error('特色图片必须是有效的URL');
        }
      }),
    
    body('status')
      .optional()
      .isIn(['draft', 'published', 'archived'])
      .withMessage('状态必须是draft、published或archived'),
    
    body('categories')
      .optional()
      .isArray()
      .withMessage('分类必须是数组')
  ];

  return rules;
};

/**
 * 分类验证规则
 * @param {boolean} isUpdate - 是否是更新操作
 * @returns {Array} - 验证规则数组
 */
const categoryValidationRules = (isUpdate = false) => {
  const rules = [
    body('name')
      .if((value, { req }) => !isUpdate || value !== undefined)
      .notEmpty()
      .withMessage('分类名称不能为空')
      .isLength({ min: 2, max: 100 })
      .withMessage('分类名称长度应在2-100个字符之间'),
    
    body('description')
      .optional()
      .isLength({ max: 255 })
      .withMessage('描述不能超过255个字符'),
    
    body('parentId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('父分类ID必须是有效的整数')
  ];

  return rules;
};

// 显示验证错误
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(`验证错误: ${JSON.stringify(errors.array())}`);
    return res.status(400).json({
      status: 'error',
      message: '请求数据验证失败',
      errors: errors.array()
    });
  }
  next();
};

// 验证文件上传请求
const validateFileUpload = [
  body('description').optional().isString().withMessage('描述必须是字符串').trim(),
  body('category').optional().isString().withMessage('分类必须是字符串').trim(),
  validateRequest
];

// 验证评论创建
const validateCommentCreate = [
  body(['article_id', 'post_id']).custom((value, { req }) => {
    // 检查是否至少提供了article_id或post_id中的一个
    if (!req.body.article_id && !req.body.post_id) {
      throw new Error('文章ID不能为空');
    }
    return true;
  }),
  body(['article_id', 'post_id']).optional()
    .isInt().withMessage('文章ID必须是整数'),
  body('content').notEmpty().withMessage('评论内容不能为空')
    .isString().withMessage('评论内容必须是字符串')
    .isLength({ min: 2, max: 1000 }).withMessage('评论内容长度必须在2-1000个字符之间')
    .trim(),
  body('parent_id').optional()
    .isInt().withMessage('父评论ID必须是整数'),
  validateRequest
];

// 验证评论更新
const validateCommentUpdate = [
  body('content').notEmpty().withMessage('评论内容不能为空')
    .isString().withMessage('评论内容必须是字符串')
    .isLength({ min: 2, max: 1000 }).withMessage('评论内容长度必须在2-1000个字符之间')
    .trim(),
  validateRequest
];

// 验证文章
const validateArticle = [
  body('title').notEmpty().withMessage('标题不能为空')
    .isString().withMessage('标题必须是字符串')
    .isLength({ min: 5, max: 200 }).withMessage('标题长度必须在5-200个字符之间')
    .trim(),
  body('content').notEmpty().withMessage('内容不能为空')
    .isString().withMessage('内容必须是字符串')
    .isLength({ min: 10 }).withMessage('内容长度必须至少10个字符')
    .trim(),
  body('category_id').notEmpty().withMessage('分类ID不能为空')
    .isInt().withMessage('分类ID必须是整数'),
  body('tags').optional()
    .isArray().withMessage('标签必须是数组'),
  body('status').optional()
    .isIn([0, 1, 2]).withMessage('状态值无效'),
  validateRequest
];

// 验证分类
const validateCategory = [
  body('name').notEmpty().withMessage('分类名称不能为空')
    .isString().withMessage('分类名称必须是字符串')
    .isLength({ min: 2, max: 50 }).withMessage('分类名称长度必须在2-50个字符之间')
    .trim(),
  body('description').optional()
    .isString().withMessage('描述必须是字符串')
    .isLength({ max: 200 }).withMessage('描述长度不能超过200个字符')
    .trim(),
  validateRequest
];

// 验证标签
const validateTag = [
  body('name').notEmpty().withMessage('标签名称不能为空')
    .isString().withMessage('标签名称必须是字符串')
    .isLength({ min: 2, max: 50 }).withMessage('标签名称长度必须在2-50个字符之间')
    .trim(),
  body('slug').optional()
    .isString().withMessage('标签别名必须是字符串')
    .isLength({ min: 2, max: 50 }).withMessage('标签别名长度必须在2-50个字符之间')
    .matches(/^[a-z0-9-]+$/).withMessage('标签别名只能包含小写字母、数字和连字符')
    .trim(),
  body('description').optional()
    .isString().withMessage('描述必须是字符串')
    .isLength({ max: 200 }).withMessage('描述长度不能超过200个字符')
    .trim(),
  validateRequest
];

module.exports = {
  postValidationRules,
  categoryValidationRules,
  validateFileUpload,
  validateComment: validateCommentCreate, // 保持向后兼容
  validateCommentCreate,
  validateCommentUpdate,
  validateArticle,
  validateCategory,
  validateTag
}; 
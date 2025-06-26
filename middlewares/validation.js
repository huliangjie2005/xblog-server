/**
 * 请求验证中间件
 */
const { body, validationResult } = require('express-validator');
const { responseError } = require('../utils/response');
const { logger } = require('../utils/logger');

// 验证结果处理中间件
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('请求验证失败', { errors: errors.array() });
    return responseError(res, '请求数据验证失败', 400, errors.array());
  }
  next();
};

// 普通用户登录验证规则 (支持email或username)
const loginValidationRules = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('请提供有效的电子邮箱')
    .normalizeEmail(),
  body('username')
    .optional()
    .isLength({ min: 2 })
    .withMessage('请提供有效的用户名')
    .trim(),
  body()
    .custom(body => {
      // 检查至少提供了email或username中的一个
      if (!(body.email || body.username)) {
        throw new Error('请提供用户名或电子邮箱');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少需要6个字符')
];

// 管理员登录验证规则 (使用username字段)
const adminLoginValidationRules = [
  body('username')
    .isLength({ min: 2 })
    .withMessage('请提供有效的用户名')
    .trim(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少需要6个字符')
];

// 注册验证规则
const registerValidationRules = [
  body('username')
    .isLength({ min: 2, max: 30 })
    .withMessage('用户名长度应为2-30个字符')
    .trim()
    .escape(),
  body('email')
    .isEmail()
    .withMessage('请提供有效的电子邮箱')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少需要6个字符'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('两次输入的密码不一致');
      }
      return true;
    })
];

// 文章验证规则
const articleValidationRules = [
  body('title')
    .isLength({ min: 5, max: 100 })
    .withMessage('文章标题长度应为5-100个字符')
    .trim(),
  body('content')
    .isLength({ min: 10 })
    .withMessage('文章内容至少需要10个字符'),
  body('categoryId')
    .isInt({ min: 1 })
    .withMessage('请选择有效的文章分类')
];

// 评论验证规则
const commentValidationRules = [
  body('content')
    .isLength({ min: 2, max: 1000 })
    .withMessage('评论内容长度应为2-1000个字符')
    .trim(),
  body('articleId')
    .isInt({ min: 1 })
    .withMessage('请提供有效的文章ID')
];

module.exports = {
  validate,
  loginValidationRules,
  registerValidationRules,
  articleValidationRules,
  commentValidationRules,
  adminLoginValidationRules
}; 
/**
 * AI服务路由
 * 处理AI相关的请求
 */

const express = require('express');
const router = express.Router();
const aiController = require('../../controllers/admin/aiController');
const { verifyAdmin } = require('../../middlewares/auth');

/**
 * @route POST /api/admin/ai/summary
 * @desc 生成文章摘要
 * @access Private (管理员)
 */
router.post('/summary', verifyAdmin, aiController.generateSummary);

/**
 * @route POST /api/admin/ai/writing-suggestion
 * @desc 生成写作建议
 * @access Private (管理员)
 */
router.post('/writing-suggestion', verifyAdmin, aiController.generateWritingSuggestion);

/**
 * @route POST /api/admin/ai/seo
 * @desc 生成文章SEO信息
 * @access Private (管理员)
 */
router.post('/seo', verifyAdmin, aiController.generateSEO);

/**
 * @route GET /api/admin/ai/config
 * @desc 获取AI配置
 * @access Private (管理员)
 */
router.get('/config', verifyAdmin, aiController.getAIConfig);

/**
 * @route POST /api/admin/ai/config
 * @desc 更新AI配置
 * @access Private (管理员)
 */
router.post('/config', verifyAdmin, aiController.updateAIConfig);

/**
 * @route POST /api/admin/ai/test-connection
 * @desc 测试AI服务连接
 * @access Private (管理员)
 */
router.post('/test-connection', verifyAdmin, aiController.testAIConnection);

/**
 * @route GET /api/admin/ai/history
 * @desc 获取AI生成历史记录
 * @access Private (管理员)
 */
router.get('/history', verifyAdmin, aiController.getGenerationHistory);

/**
 * @route GET /api/admin/ai/status
 * @desc 检查AI服务状态
 * @access Private (管理员)
 */
router.get('/status', verifyAdmin, aiController.checkAIStatus);

/**
 * @route GET /api/admin/ai/performance
 * @desc 获取AI性能统计
 * @access Private (管理员)
 */
router.get('/performance', verifyAdmin, aiController.getAIPerformance);

/**
 * @route POST /api/admin/ai/performance/reset
 * @desc 重置AI性能统计
 * @access Private (管理员)
 */
router.post('/performance/reset', verifyAdmin, aiController.resetAIPerformance);

module.exports = router;
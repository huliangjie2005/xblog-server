/**
 * 系统公告路由 - 管理员
 */
const express = require('express');
const router = express.Router();
const announcementController = require('../../controllers/admin/announcementController');
const { verifyAdmin } = require('../../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: 系统公告
 *   description: 系统公告管理API
 */

/**
 * @swagger
 * /api/admin/announcements:
 *   get:
 *     summary: 获取所有系统公告
 *     tags: [系统公告]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 每页条数
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/', verifyAdmin, announcementController.getAnnouncements);

/**
 * @swagger
 * /api/admin/announcements/{id}:
 *   get:
 *     summary: 获取单个系统公告
 *     tags: [系统公告]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 公告ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:id', verifyAdmin, announcementController.getAnnouncement);

/**
 * @swagger
 * /api/admin/announcements:
 *   post:
 *     summary: 创建系统公告
 *     tags: [系统公告]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: 公告内容
 *               type:
 *                 type: string
 *                 enum: [info, warning, error]
 *                 description: 公告类型
 *               status:
 *                 type: integer
 *                 enum: [0, 1]
 *                 description: 是否启用(0-禁用,1-启用)
 *               priority:
 *                 type: integer
 *                 description: 显示优先级
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 description: 生效开始时间
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 description: 生效结束时间
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', verifyAdmin, announcementController.createAnnouncement);

/**
 * @swagger
 * /api/admin/announcements/{id}:
 *   put:
 *     summary: 更新系统公告
 *     tags: [系统公告]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 公告ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: 公告内容
 *               type:
 *                 type: string
 *                 enum: [info, warning, error]
 *                 description: 公告类型
 *               status:
 *                 type: integer
 *                 enum: [0, 1]
 *                 description: 是否启用(0-禁用,1-启用)
 *               priority:
 *                 type: integer
 *                 description: 显示优先级
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 description: 生效开始时间
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 description: 生效结束时间
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', verifyAdmin, announcementController.updateAnnouncement);

/**
 * @swagger
 * /api/admin/announcements/{id}:
 *   delete:
 *     summary: 删除系统公告
 *     tags: [系统公告]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 公告ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:id', verifyAdmin, announcementController.deleteAnnouncement);

module.exports = router; 
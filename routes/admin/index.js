const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const postRoutes = require('./postRoutes');
const commentRoutes = require('./commentRoutes');
const categoryRoutes = require('./categoryRoutes');
const tagRoutes = require('./tagRoutes');
const fileRoutes = require('./fileRoutes');
const folderRoutes = require('./folderRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const aiRoutes = require('./aiRoutes');
const settingRoutes = require('./settingRoutes');
const announcementRoutes = require('./announcementRoutes'); // 添加公告路由
const userRoutes = require('./userRoutes'); // 添加用户管理路由
const roleRoutes = require('./roleRoutes'); // 添加角色管理路由
const { logger } = require('../../utils/logger');

// 注册各模块路由
router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/categories', categoryRoutes);
router.use('/tags', tagRoutes);
router.use('/files', fileRoutes);
router.use('/folders', folderRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiRoutes);
router.use('/settings', settingRoutes);
router.use('/announcements', announcementRoutes); // 注册公告路由
router.use('/users', userRoutes); // 注册用户管理路由
router.use('/roles', roleRoutes); // 注册角色管理路由

logger.info('已加载路由: /admin/settings');
logger.info('已加载路由: /admin/announcements');
logger.info('已加载路由: /admin/users');
logger.info('已加载路由: /admin/roles');

module.exports = router; 
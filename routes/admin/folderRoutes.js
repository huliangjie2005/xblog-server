const express = require('express');
const router = express.Router();
const folderController = require('../../controllers/admin/folderController');
const { body } = require('express-validator');
const { directVerifyAdmin } = require('../../middlewares/directAuth');

/**
 * @route POST /api/admin/folders
 * @desc 创建文件夹
 * @access Private (Admin)
 */
router.post(
  '/',
  directVerifyAdmin,
  [
    body('name').notEmpty().withMessage('文件夹名称不能为空'),
  ],
  folderController.createFolder
);

/**
 * @route GET /api/admin/folders
 * @desc 获取文件夹列表
 * @access Private (Admin)
 */
router.get(
  '/',
  directVerifyAdmin,
  folderController.getFolders
);

/**
 * @route GET /api/admin/folders/:id
 * @desc 获取文件夹详情
 * @access Private (Admin)
 */
router.get(
  '/:id',
  directVerifyAdmin,
  folderController.getFolderById
);

/**
 * @route GET /api/admin/folders/:id/path
 * @desc 获取文件夹路径
 * @access Private (Admin)
 */
router.get(
  '/:id/path',
  directVerifyAdmin,
  folderController.getFolderPath
);

/**
 * @route PUT /api/admin/folders/:id
 * @desc 更新文件夹
 * @access Private (Admin)
 */
router.put(
  '/:id',
  directVerifyAdmin,
  [
    body('name').notEmpty().withMessage('文件夹名称不能为空'),
  ],
  folderController.updateFolder
);

/**
 * @route DELETE /api/admin/folders/:id
 * @desc 删除文件夹
 * @access Private (Admin)
 */
router.delete(
  '/:id',
  directVerifyAdmin,
  folderController.deleteFolder
);

module.exports = router; 
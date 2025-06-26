const express = require('express');
const router = express.Router();
const fileController = require('../../controllers/admin/fileController');
const { directVerifyAdmin } = require('../../middlewares/directAuth');
const { upload, handleUploadError } = require('../../middlewares/upload');

/**
 * @route POST /api/admin/files/upload
 * @desc 上传文件
 * @access Private (Admin)
 */
router.post(
  '/upload',
  directVerifyAdmin,
  upload.single('file'),
  handleUploadError,
  fileController.uploadFile
);

/**
 * @route GET /api/admin/files
 * @desc 获取所有文件
 * @access Private (Admin)
 */
router.get(
  '/',
  directVerifyAdmin,
  fileController.getAllFiles
);

/**
 * @route GET /api/admin/files/:id
 * @desc 获取单个文件
 * @access Private (Admin)
 */
router.get(
  '/:id',
  directVerifyAdmin,
  fileController.getFileById
);

/**
 * @route DELETE /api/admin/files/:id
 * @desc 删除文件
 * @access Private (Admin)
 */
router.delete(
  '/:id',
  directVerifyAdmin,
  fileController.deleteFile
);

/**
 * @route DELETE /api/admin/files
 * @desc 批量删除文件
 * @access Private (Admin)
 */
router.delete(
  '/',
  directVerifyAdmin,
  fileController.deleteMultipleFiles
);

/**
 * @route PUT /api/admin/files/:id
 * @desc 更新文件
 * @access Private (Admin)
 */
router.put('/:id', directVerifyAdmin, fileController.updateFile);

module.exports = router; 
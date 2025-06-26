const express = require('express');
const router = express.Router();
const fileController = require('../../controllers/admin/fileController');
const { directVerifyAdmin } = require('../../middlewares/directAuth');
const { upload, handleUploadError } = require('../../middlewares/upload');

/**
 * @route POST /api/files/upload
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
 * @route GET /api/files
 * @desc 获取所有文件
 * @access Private (Admin)
 */
router.get(
  '/',
  directVerifyAdmin,
  fileController.getAllFiles
);

/**
 * @route GET /api/files/:id
 * @desc 获取单个文件
 * @access Private (Admin)
 */
router.get(
  '/:id',
  directVerifyAdmin,
  fileController.getFileById
);

module.exports = router; 
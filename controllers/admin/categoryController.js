const categoryService = require('../../services/categoryService');
const { logger } = require('../../utils/logger');
const { validationResult } = require('express-validator');

/**
 * 创建分类
 */
const createCategory = async (req, res) => {
  try {
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '验证失败',
        errors: errors.array()
      });
    }

    // 准备分类数据
    const categoryData = {
      name: req.body.name,
      description: req.body.description,
      parentId: req.body.parentId
    };

    // 创建分类
    const category = await categoryService.createCategory(categoryData);

    return res.status(201).json({
      status: 'success',
      message: '分类创建成功',
      data: {
        category
      }
    });
  } catch (error) {
    logger.error(`创建分类失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '创建分类失败',
      error: error.message
    });
  }
};

/**
 * 获取所有分类
 */
const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();

    return res.status(200).json({
      status: 'success',
      message: '获取分类列表成功',
      data: {
        categories
      }
    });
  } catch (error) {
    logger.error(`获取分类列表失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '获取分类列表失败',
      error: error.message
    });
  }
};

/**
 * 获取分类层级结构
 */
const getCategoryHierarchy = async (req, res) => {
  try {
    const categoryHierarchy = await categoryService.getCategoryHierarchy();

    return res.status(200).json({
      status: 'success',
      message: '获取分类层级结构成功',
      data: {
        categories: categoryHierarchy
      }
    });
  } catch (error) {
    logger.error(`获取分类层级结构失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '获取分类层级结构失败',
      error: error.message
    });
  }
};

/**
 * 获取单个分类
 */
const getCategoryById = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await categoryService.getCategoryById(categoryId);

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: '分类不存在'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: '获取分类成功',
      data: {
        category
      }
    });
  } catch (error) {
    logger.error(`获取分类失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '获取分类失败',
      error: error.message
    });
  }
};

/**
 * 更新分类
 */
const updateCategory = async (req, res) => {
  try {
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '验证失败',
        errors: errors.array()
      });
    }

    const categoryId = req.params.id;
    
    // 检查分类是否存在
    const existingCategory = await categoryService.getCategoryById(categoryId);
    if (!existingCategory) {
      return res.status(404).json({
        status: 'error',
        message: '分类不存在'
      });
    }

    // 准备更新数据
    const categoryData = {
      name: req.body.name,
      description: req.body.description,
      parentId: req.body.parentId
    };

    // 更新分类
    const updatedCategory = await categoryService.updateCategory(categoryId, categoryData);

    return res.status(200).json({
      status: 'success',
      message: '分类更新成功',
      data: {
        category: updatedCategory
      }
    });
  } catch (error) {
    logger.error(`更新分类失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '更新分类失败',
      error: error.message
    });
  }
};

/**
 * 删除分类
 */
const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    // 检查分类是否存在
    const existingCategory = await categoryService.getCategoryById(categoryId);
    if (!existingCategory) {
      return res.status(404).json({
        status: 'error',
        message: '分类不存在'
      });
    }

    // 获取分类中的文章数量
    const postCount = await categoryService.getCategoryPostCount(categoryId);
    
    // 删除分类
    const result = await categoryService.deleteCategory(categoryId);

    if (!result) {
      return res.status(500).json({
        status: 'error',
        message: '分类删除失败'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: '分类删除成功',
      data: {
        affectedPosts: postCount
      }
    });
  } catch (error) {
    logger.error(`删除分类失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '删除分类失败',
      error: error.message
    });
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryHierarchy,
  getCategoryById,
  updateCategory,
  deleteCategory
}; 
const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../../middlewares/unified-auth');
const ApiResponse = require('../../utils/response');
const PostModel = require('../../models/post.model');

// 获取所有文章
router.get('/', verifyAdmin, async (req, res) => {
  try {
    console.log('收到文章列表请求:', req.query);

    const { page = 1, limit = 10, search, status, categoryId } = req.query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const conditions = {};
    if (status) {
      conditions.status = status;
    }

    // 构建查询选项
    const options = {
      skip: parseInt(skip),
      limit: parseInt(limit),
      sort: { created_at: -1 }
    };

    console.log('查询条件:', conditions);
    console.log('查询选项:', options);

    const [posts, total] = await Promise.all([
      PostModel.find(conditions, options),
      PostModel.countDocuments(conditions)
    ]);

    console.log(`查询到 ${posts.length} 篇文章，总计 ${total} 篇`);
    if (posts.length > 0) {
      console.log('第一篇文章数据:', posts[0]);
    }

    // 返回标准格式，确保前端能正确解析
    const responseData = {
      posts: posts,  // 使用posts字段名
      pagination: {
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };

    console.log('返回的响应数据结构:', {
      postsCount: posts.length,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    return res.json({
      status: 'success',
      message: '获取文章列表成功',
      data: responseData
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return res.status(500).json(ApiResponse.error('获取文章列表失败: ' + error.message, 500));
  }
});

// 获取管理员自己的文章
router.get('/my-posts', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const conditions = { author: req.user.id };

    // 构建查询选项
    const options = {
      skip: parseInt(skip),
      limit: parseInt(limit),
      sort: { created_at: -1 }
    };

    const [posts, total] = await Promise.all([
      PostModel.find(conditions, options),
      PostModel.countDocuments(conditions)
    ]);

    // 返回标准格式，确保前端能正确解析
    const responseData = {
      posts: posts,  // 使用posts字段名
      pagination: {
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };

    return res.json({
      status: 'success',
      message: '获取个人文章列表成功',
      data: responseData
    });
  } catch (error) {
    console.error('获取个人文章列表失败:', error);
    return res.status(500).json(ApiResponse.error('获取个人文章列表失败: ' + error.message, 500));
  }
});

// 获取单个文章
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.id);
    if (!post) {
      return res.status(404).json(ApiResponse.error('文章不存在', 404));
    }
    return res.json(ApiResponse.success({ post }));
  } catch (error) {
    return res.status(500).json(ApiResponse.error('获取文章失败', 500));
  }
});

// 创建文章
router.post('/', verifyAdmin, async (req, res) => {
  try {
    console.log('收到创建文章请求:', req.body);
    console.log('用户信息:', req.user);

    const postData = {
      ...req.body,
      author_id: req.user.id // 使用author_id而不是author
    };

    console.log('处理后的文章数据:', postData);

    const post = await PostModel.create(postData);
    console.log('文章创建成功:', post);

    return res.status(201).json(ApiResponse.success({ post }, '文章创建成功'));
  } catch (error) {
    console.error('创建文章失败:', error);
    return res.status(500).json(ApiResponse.error('创建文章失败: ' + error.message, 500));
  }
});

// 更新文章
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.id);
    if (!post) {
      return res.status(404).json(ApiResponse.error('文章不存在', 404));
    }

    // 检查是否是作者或超级管理员
    if (post.author_id.toString() !== req.user.id && !req.user.isSuper) {
      return res.status(403).json(ApiResponse.error('无权更新此文章', 403));
    }

    const updatedPost = await PostModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    return res.json(ApiResponse.success({ post: updatedPost }, '文章更新成功'));
  } catch (error) {
    return res.status(500).json(ApiResponse.error('更新文章失败', 500));
  }
});

// 删除文章
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.id);
    if (!post) {
      return res.status(404).json(ApiResponse.error('文章不存在', 404));
    }

    // 检查是否是作者或超级管理员
    if (post.author.toString() !== req.user.id && !req.user.isSuper) {
      return res.status(403).json(ApiResponse.error('无权删除此文章', 403));
    }

    await PostModel.findByIdAndDelete(req.params.id);
    return res.json(ApiResponse.success(null, '文章删除成功'));
  } catch (error) {
    return res.status(500).json(ApiResponse.error('删除文章失败', 500));
  }
});

module.exports = router; 
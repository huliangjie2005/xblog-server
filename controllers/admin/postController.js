const postService = require('../../services/postService');
const { logger } = require('../../utils/logger');
const { validationResult } = require('express-validator');

/**
 * 创建文章
 */
const createPost = async (req, res) => {
  try {
    // 打印接收到的请求数据用于调试
    console.log('📝 创建文章 - 接收到的数据:', JSON.stringify(req.body, null, 2));

    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ 验证失败:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: '验证失败',
        errors: errors.array()
      });
    }

    // 准备文章数据
    const postData = {
      title: req.body.title,
      content: req.body.content,
      excerpt: req.body.excerpt,
      featuredImage: req.body.featuredImage,
      status: req.body.isDraft ? 'draft' : 'published',
      authorId: req.user?.id, // 管理员ID作为作者
      generateAiSummary: req.body.generateAiSummary // 是否生成AI摘要
    };

    // 如果存在发布时间
    if (req.body.publishTime) {
      postData.publishedAt = new Date(req.body.publishTime);
    }

    // 添加分类 - 支持多种格式
    let categories = [];
    if (req.body.categories && Array.isArray(req.body.categories)) {
      categories = req.body.categories.filter(id => id); // 过滤空值
    } else if (req.body.categoryId) {
      categories = [req.body.categoryId];
    }

    // 添加标签 - 支持多种格式
    let tags = [];
    if (req.body.tags && Array.isArray(req.body.tags)) {
      tags = req.body.tags.filter(id => id); // 过滤空值
    } else if (req.body.tagIds && Array.isArray(req.body.tagIds)) {
      tags = req.body.tagIds.filter(id => id);
    }

    console.log('📂 处理分类:', categories);
    console.log('🏷️ 处理标签:', tags);

    // 创建文章
    const post = await postService.createPost(postData);

    // 如果有分类，更新文章分类
    if (categories.length > 0) {
      await postService.updatePostCategories(post.id, categories);
    }

    // 如果有标签，更新文章标签
    if (tags.length > 0) {
      await postService.updatePostTags(post.id, tags);
    }

    // 重新获取带有分类的文章
    const updatedPost = await postService.getPostById(post.id);

    return res.status(201).json({
      status: 'success',
      message: '文章创建成功',
      data: {
        id: updatedPost.id,
        title: updatedPost.title,
        slug: updatedPost.slug
      }
    });
  } catch (error) {
    logger.error(`创建文章失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '创建文章失败',
      error: error.message
    });
  }
};

/**
 * 获取所有文章
 */
const getAllPosts = async (req, res) => {
  try {
    // 获取查询参数
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      search: req.query.search || '',
      status: req.query.status || null,
      categoryId: req.query.categoryId || null,
      authorId: req.query.authorId || null,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: (req.query.sortOrder || 'DESC').toUpperCase()
    };

    // 获取文章列表
    const posts = await postService.getAllPosts(options);
    
    // 获取文章总数
    const total = await postService.getPostsCount({
      search: options.search,
      status: options.status,
      categoryId: options.categoryId,
      authorId: options.authorId
    });

    // 计算分页信息
    const totalPages = Math.ceil(total / options.limit);

    // 格式化文章数据，包含分类和标签信息
    const formattedPosts = posts.map(post => {
      // 静默模式下不输出格式化信息

      return {
        id: post.id,
        title: post.title,
        status: post.status,
        author: {
          id: post.author_id,
          username: post.author_name
        },
        createdAt: post.created_at,
        publishedAt: post.publish_time,
        commentCount: post.comment_count || 0,
        viewCount: post.view_count || 0,
        // 添加分类信息
        category_id: post.category_id,
        category_name: post.category_name,
        category_slug: post.category_slug,
        // 添加标签信息
        tags: post.tags || [],
        // 添加作者信息
        author_name: post.author_name,
        author_id: post.author_id
      };
    });

    return res.status(200).json({
      status: 'success',
      message: '获取文章列表成功',
      data: {
        posts: formattedPosts,
        pagination: {
          total: total,
          page: options.page,
          limit: options.limit,
          totalPages: totalPages
        }
      }
    });
  } catch (error) {
    logger.error(`获取文章列表失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '获取文章列表失败',
      error: error.message
    });
  }
};

/**
 * 获取单个文章
 */
const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await postService.getPostById(postId);

    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: '文章不存在'
      });
    }

    // 格式化响应数据
    const formattedPost = {
      id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      slug: post.slug,
      status: post.status,
      featuredImage: post.featured_image,
      categoryId: post.categories && post.categories.length > 0 ? post.categories[0].id : null,
      category_id: post.categories && post.categories.length > 0 ? post.categories[0].id : null, // 兼容字段
      categories: post.categories || [], // 完整的分类信息
      tags: post.tags || [], // 完整的标签信息
      createdAt: post.created_at,
      publishedAt: post.publish_time,
      author: {
        id: post.author_id,
        username: post.author_name
      }
    };

    return res.status(200).json({
      status: 'success',
      message: '获取文章详情成功',
      data: {
        post: formattedPost
      }
    });
  } catch (error) {
    logger.error(`获取文章失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '获取文章失败',
      error: error.message
    });
  }
};

/**
 * 更新文章
 */
const updatePost = async (req, res) => {
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

    const postId = req.params.id;
    
    // 检查文章是否存在
    const existingPost = await postService.getPostById(postId);
    if (!existingPost) {
      return res.status(404).json({
        status: 'error',
        message: '文章不存在'
      });
    }

    // 准备更新数据
    const postData = {
      title: req.body.title,
      content: req.body.content,
      excerpt: req.body.excerpt,
      featuredImage: req.body.featuredImage,
      status: req.body.isDraft ? 'draft' : 'published',
      categories: req.body.categories || [], // 正确的分类字段
      tags: req.body.tags || [] // 正确的标签字段
    };

    console.log('📝 更新文章数据:', postData);
    console.log('📂 分类数据:', postData.categories);
    console.log('🏷️ 标签数据:', postData.tags);

    // 如果存在发布时间
    if (req.body.publishTime) {
      postData.publishedAt = new Date(req.body.publishTime);
    }

    // 如果请求包含生成AI摘要的标志
    if (req.body.generateAiSummary) {
      try {
        const aiSummary = await postService.generateAISummary(postData.content);
        postData.excerpt = aiSummary;
      } catch (summaryError) {
        logger.error(`更新文章时生成AI摘要失败: ${summaryError.message}`);
        // 继续使用原始摘要，不中断更新流程
      }
    }

    // 更新文章
    const updatedPost = await postService.updatePost(postId, postData);

    return res.status(200).json({
      status: 'success',
      message: '文章更新成功',
      data: {
        id: updatedPost.id
      }
    });
  } catch (error) {
    logger.error(`更新文章失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '更新文章失败',
      error: error.message
    });
  }
};

/**
 * 删除文章
 */
const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    
    // 检查文章是否存在
    const existingPost = await postService.getPostById(postId);
    if (!existingPost) {
      return res.status(404).json({
        status: 'error',
        message: '文章不存在'
      });
    }

    // 删除文章
    const result = await postService.deletePost(postId);

    if (!result) {
      return res.status(500).json({
        status: 'error',
        message: '文章删除失败'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: '文章删除成功'
    });
  } catch (error) {
    logger.error(`删除文章失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '删除文章失败',
      error: error.message
    });
  }
};

/**
 * 获取管理员自己的文章
 */
const getMyPosts = async (req, res) => {
  try {
    // 确保管理员已登录
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: 'error',
        message: '请先登录'
      });
    }

    // 获取查询参数
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status || null,
      authorId: req.user.id, // 只获取管理员自己的文章
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: (req.query.sortOrder || 'DESC').toUpperCase()
    };

    // 获取文章列表
    const posts = await postService.getAllPosts(options);
    
    // 获取文章总数
    const total = await postService.getPostsCount({
      status: options.status,
      authorId: req.user.id
    });

    // 计算分页信息
    const totalPages = Math.ceil(total / options.limit);
    
    // 格式化文章数据，符合API文档规范
    const formattedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      status: post.status,
      author: {
        id: post.author_id,
        username: post.author_name
      },
      createdAt: post.created_at,
      publishedAt: post.publish_time,
      commentCount: post.comment_count || 0,
      viewCount: post.view_count || 0
    }));

    return res.status(200).json({
      status: 'success',
      message: '获取我的文章列表成功',
      data: {
        posts: formattedPosts,
        pagination: {
          page: options.page,
          limit: options.limit,
          total: total,
          totalPages: totalPages
        }
      }
    });
  } catch (error) {
    logger.error(`获取我的文章列表失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '获取我的文章列表失败',
      error: error.message
    });
  }
};

/**
 * 生成文章摘要
 */
const generateAISummary = async (req, res) => {
  try {
    const { postId } = req.params;

    // 检查文章是否存在
    const existingPost = await postService.getPostById(postId);
    if (!existingPost) {
      return res.status(404).json({
        status: 'error',
        message: '文章不存在'
      });
    }

    // 更新文章摘要
    const updatedPost = await postService.updatePostWithAISummary(postId);

    return res.status(200).json({
      status: 'success',
      message: 'AI摘要生成成功',
      data: {
        post: updatedPost
      }
    });
  } catch (error) {
    logger.error(`生成AI摘要失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: '生成AI摘要失败',
      error: error.message
    });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  generateAISummary,
  getMyPosts
}; 
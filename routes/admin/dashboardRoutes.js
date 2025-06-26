const express = require('express');
const router = express.Router();
const { directVerifyAdmin } = require('../../middlewares/directAuth');
const ApiResponse = require('../../utils/response');
const { query } = require('../../config/db');
const { responseSuccess, responseError } = require('../../utils/response');
const dayjs = require('dayjs');

// 获取仪表盘统计数据
router.get('/stats', directVerifyAdmin, async (req, res) => {
  try {
    // 查询文章总数
    const postCountResult = await query('SELECT COUNT(*) as count FROM posts');
    const postCount = postCountResult[0].count;

    // 查询分类总数
    const categoryCountResult = await query('SELECT COUNT(*) as count FROM categories');
    const categoryCount = categoryCountResult[0].count;

    // 查询标签总数
    const tagCountResult = await query('SELECT COUNT(*) as count FROM tags');
    const tagCount = tagCountResult[0].count;

    // 查询评论总数
    const commentCountResult = await query('SELECT COUNT(*) as count FROM comments');
    const commentCount = commentCountResult[0].count;

    // 查询用户总数
    const userCountResult = await query('SELECT COUNT(*) as count FROM public_users');
    const userCount = userCountResult[0].count;
    
    // 查询浏览总量 (从posts表获取)
    const viewCountResult = await query('SELECT SUM(view_count) as total FROM posts');
    const viewCount = viewCountResult[0].total || 0;
    
    // 计算增长率 (假设与上个月相比)
    // 获取上个月的文章数
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthDateStr = dayjs(lastMonthDate).format('YYYY-MM-DD');
    
    const lastMonthPostsResult = await query(
      'SELECT COUNT(*) as count FROM posts WHERE created_at < ?',
      [lastMonthDateStr]
    );
    const lastMonthPosts = lastMonthPostsResult[0].count;
    const postChangeRate = lastMonthPosts > 0 ? ((postCount - lastMonthPosts) / lastMonthPosts * 100).toFixed(1) : 0;
    
    // 获取上个月的评论数
    const lastMonthCommentsResult = await query(
      'SELECT COUNT(*) as count FROM comments WHERE created_at < ?',
      [lastMonthDateStr]
    );
    const lastMonthComments = lastMonthCommentsResult[0].count;
    const commentChangeRate = lastMonthComments > 0 ? ((commentCount - lastMonthComments) / lastMonthComments * 100).toFixed(1) : 0;
    
    // 获取上个月的用户数
    const lastMonthUsersResult = await query(
      'SELECT COUNT(*) as count FROM public_users WHERE created_at < ?',
      [lastMonthDateStr]
    );
    const lastMonthUsers = lastMonthUsersResult[0].count;
    const userChangeRate = lastMonthUsers > 0 ? ((userCount - lastMonthUsers) / lastMonthUsers * 100).toFixed(1) : 0;
    
    // 假设有一个历史浏览记录表或者其他方式计算浏览量变化
    // 这里简单返回一个模拟值
    const viewChangeRate = 15.8;

    return responseSuccess(res, '获取仪表盘统计数据成功', {
        postCount,
        categoryCount,
        tagCount,
      commentCount,
      userCount,
      viewCount,
      postChangeRate: parseFloat(postChangeRate),
      commentChangeRate: parseFloat(commentChangeRate),
      userChangeRate: parseFloat(userChangeRate),
      viewChangeRate
    });
  } catch (error) {
    console.error('获取仪表盘统计数据失败:', error);
    return responseError(res, '获取仪表盘统计数据失败', 500);
  }
});

// 获取最近文章
router.get('/recent-posts', directVerifyAdmin, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const sql = `
      SELECT p.id, p.title, p.slug, p.status, p.created_at, 
      u.username as author_name, 
      u.avatar as author_avatar,
      c.name as category_name
      FROM posts p 
      LEFT JOIN public_users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    
    const posts = await query(sql, [parseInt(limit)]);
    
    return responseSuccess(res, '获取最近文章成功', posts);
  } catch (error) {
    console.error('获取最近文章失败:', error);
    return responseError(res, '获取最近文章失败', 500);
  }
});

// 获取热门文章
router.get('/hot-posts', directVerifyAdmin, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const sql = `
      SELECT p.id, p.title, p.view_count, 
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments,
      p.created_at
      FROM posts p 
      ORDER BY p.view_count DESC, comments DESC
      LIMIT ?
    `;
    
    const posts = await query(sql, [parseInt(limit)]);
    
    // 格式化日期
    const formattedPosts = posts.map(post => ({
      ...post,
      created_at: dayjs(post.created_at).format('YYYY-MM-DD')
    }));
    
    return responseSuccess(res, '获取热门文章成功', formattedPosts);
  } catch (error) {
    console.error('获取热门文章失败:', error);
    return responseError(res, '获取热门文章失败', 500);
  }
});

// 获取最近评论
router.get('/recent-comments', directVerifyAdmin, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const sql = `
      SELECT c.id, c.content, c.status, c.created_at,
      u.username as author, u.avatar,
      p.id as articleId, p.title as articleTitle
      FROM comments c
      LEFT JOIN public_users u ON c.author_id = u.id
      LEFT JOIN posts p ON c.post_id = p.id
      ORDER BY c.created_at DESC
      LIMIT ?
    `;
    
    const comments = await query(sql, [parseInt(limit)]);
    
    // 格式化评论数据
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      author: comment.author || '匿名用户',
      avatar: comment.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
      time: dayjs(comment.created_at).format('YYYY-MM-DD HH:mm'),
      articleId: comment.articleId,
      articleTitle: comment.articleTitle,
      status: comment.status
    }));
    
    return responseSuccess(res, '获取最近评论成功', formattedComments);
  } catch (error) {
    console.error('获取最近评论失败:', error);
    return responseError(res, '获取最近评论失败', 500);
  }
});

// 获取系统通知
router.get('/notifications', directVerifyAdmin, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const sql = `
      SELECT id, content, type, status, priority, created_at
      FROM announcements
      WHERE status = 1
      ORDER BY priority DESC, created_at DESC
      LIMIT ?
    `;
    
    const notifications = await query(sql, [parseInt(limit)]);
    
    // 格式化通知数据
    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      title: notification.content.substring(0, 20) + (notification.content.length > 20 ? '...' : ''),
      content: notification.content,
      createdAt: dayjs(notification.created_at).format('YYYY-MM-DD'),
      type: notification.type || 'info'
    }));
    
    return responseSuccess(res, '获取系统通知成功', formattedNotifications);
  } catch (error) {
    console.error('获取系统通知失败:', error);
    return responseError(res, '获取系统通知失败', 500);
  }
});

// 获取数据趋势
router.get('/trend', directVerifyAdmin, async (req, res) => {
  try {
    const { timeRange = '30days' } = req.query;
    
    // 根据时间范围确定查询的天数
    let days = 30;
    if (timeRange === '7days') days = 7;
    else if (timeRange === '90days') days = 90;
    else if (timeRange === 'year') days = 365;
    
    // 生成日期数组
    const dates = [];
    const views = [];
    const comments = [];
    const posts = [];
    
    // 获取当前日期
    const currentDate = new Date();
    
    // 查询每天的数据
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      const formattedDate = dayjs(date).format('YYYY-MM-DD');
      
      // 添加日期标签
      dates.push(timeRange === 'year' ? dayjs(date).format('YYYY-MM') : dayjs(date).format('MM-DD'));
      
      // 查询当天的浏览量 - 直接从posts表获取总浏览量
      const viewsResult = await query(
        `SELECT SUM(view_count) as total FROM posts WHERE DATE(created_at) <= ?`,
        [formattedDate]
      );
      // 为避免null值，使用0
      views.push(viewsResult[0].total || 0);
      
      // 查询当天的评论数
      const commentsResult = await query(
        `SELECT COUNT(*) as count FROM comments WHERE DATE(created_at) = ?`,
        [formattedDate]
      );
      comments.push(commentsResult[0].count || 0);
      
      // 查询当天的文章数
      const postsResult = await query(
        `SELECT COUNT(*) as count FROM posts WHERE DATE(created_at) = ?`,
        [formattedDate]
      );
      posts.push(postsResult[0].count || 0);
    }
    
    return responseSuccess(res, '获取数据趋势成功', {
      dates,
      views,
      comments,
      posts
    });
  } catch (error) {
    console.error('获取数据趋势失败:', error);
    return responseError(res, '获取数据趋势失败', 500);
  }
});

// 获取分类统计
router.get('/category-stats', directVerifyAdmin, async (req, res) => {
  try {
    // 使用post_categories表来获取文章和分类的关联
    const sql = `
      SELECT c.name, COUNT(pc.post_id) as value
      FROM categories c
      LEFT JOIN post_categories pc ON c.id = pc.category_id
      GROUP BY c.id, c.name
      ORDER BY value DESC
      LIMIT 10
    `;
    
    const categories = await query(sql);
    
    // 确保没有null值
    const formattedCategories = categories.map(category => ({
      name: category.name,
      value: category.value || 0
    }));
    
    return responseSuccess(res, '获取分类统计成功', formattedCategories);
  } catch (error) {
    console.error('获取分类统计失败:', error);
    return responseError(res, '获取分类统计失败', 500);
  }
});

// 获取文章计数
router.get('/posts/count', directVerifyAdmin, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM posts');
    return responseSuccess(res, '获取文章计数成功', { count: result[0].count });
  } catch (error) {
    console.error('获取文章计数失败:', error);
    return responseError(res, '获取文章计数失败', 500);
  }
});

// 获取分类计数
router.get('/categories/count', directVerifyAdmin, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM categories');
    return responseSuccess(res, '获取分类计数成功', { count: result[0].count });
  } catch (error) {
    console.error('获取分类计数失败:', error);
    return responseError(res, '获取分类计数失败', 500);
  }
});

// 获取标签计数
router.get('/tags/count', directVerifyAdmin, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM tags');
    return responseSuccess(res, '获取标签计数成功', { count: result[0].count });
  } catch (error) {
    console.error('获取标签计数失败:', error);
    return responseError(res, '获取标签计数失败', 500);
  }
});

// 获取评论计数
router.get('/comments/count', directVerifyAdmin, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM comments');
    return responseSuccess(res, '获取评论计数成功', { count: result[0].count });
  } catch (error) {
    console.error('获取评论计数失败:', error);
    return responseError(res, '获取评论计数失败', 500);
  }
});

module.exports = router; 
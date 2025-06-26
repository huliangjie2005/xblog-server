/**
 * 系统公告控制器 - 管理员
 * 处理系统公告的CRUD操作
 */

const { query } = require('../../config/db');
const { logger } = require('../../utils/logger');

/**
 * 获取所有公告列表
 */
const getAnnouncements = async (req, res) => {
  try {
    // 获取查询参数，设置默认值
    let pageNum = 1;
    let limitNum = 10;
    
    try {
      if (req.query.page) {
        pageNum = Math.max(1, parseInt(req.query.page, 10));
      }
      
      if (req.query.limit) {
        limitNum = Math.max(1, Math.min(100, parseInt(req.query.limit, 10)));
      }
    } catch (e) {
      // 如果解析失败，使用默认值
      pageNum = 1;
      limitNum = 10;
    }
    
    const offset = (pageNum - 1) * limitNum;
    
    // 查询公告列表
    const announcements = await query(
      `SELECT id, content, type, status, priority, 
              start_time, end_time, created_by, created_at
       FROM announcements
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limitNum, offset]
    );
    
    // 获取总数
    const [count] = await query(
      'SELECT COUNT(*) as total FROM announcements'
    );
    
    const total = count ? count.total : 0;
    
    return res.status(200).json({
      success: true,
      message: '获取公告列表成功',
      data: {
        announcements,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error(`获取公告列表失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '获取公告列表失败',
      details: error.message
    });
  }
};

/**
 * 获取单个公告
 */
const getAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [announcement] = await query(
      'SELECT * FROM announcements WHERE id = ?',
      [id]
    );
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: '公告不存在'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: '获取公告成功',
      data: announcement
    });
  } catch (error) {
    logger.error(`获取公告详情失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '获取公告详情失败',
      details: error.message
    });
  }
};

/**
 * 创建公告
 */
const createAnnouncement = async (req, res) => {
  try {
    const { 
      content, 
      type = 'info',
      status = 1, 
      priority = 0,
      start_time = null,
      end_time = null
    } = req.body;
    
    // 验证必填字段
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '公告内容不能为空'
      });
    }
    
    // 验证公告类型
    if (!['info', 'warning', 'error'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的公告类型，应为info/warning/error之一'
      });
    }
    
    // 获取当前用户ID
    const created_by = req.user.id;
    
    // 创建公告
    const result = await query(
      `INSERT INTO announcements 
       (content, type, status, priority, start_time, end_time, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [content, type, status, priority, start_time, end_time, created_by]
    );
    
    // 查询刚刚创建的公告
    const [announcement] = await query(
      'SELECT * FROM announcements WHERE id = ?',
      [result.insertId]
    );
    
    return res.status(201).json({
      success: true,
      message: '创建公告成功',
      data: announcement
    });
  } catch (error) {
    logger.error(`创建公告失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '创建公告失败',
      details: error.message
    });
  }
};

/**
 * 更新公告
 */
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      content, 
      type, 
      status,
      priority,
      start_time,
      end_time
    } = req.body;
    
    // 检查公告是否存在
    const [existingAnnouncement] = await query(
      'SELECT * FROM announcements WHERE id = ?',
      [id]
    );
    
    if (!existingAnnouncement) {
      return res.status(404).json({
        success: false,
        message: '公告不存在'
      });
    }
    
    // 构建更新字段
    const updateFields = [];
    const updateValues = [];
    
    if (content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(content);
    }
    
    if (type !== undefined) {
      // 验证公告类型
      if (!['info', 'warning', 'error'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: '无效的公告类型，应为info/warning/error之一'
        });
      }
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    
    if (priority !== undefined) {
      updateFields.push('priority = ?');
      updateValues.push(priority);
    }
    
    if (start_time !== undefined) {
      updateFields.push('start_time = ?');
      updateValues.push(start_time);
    }
    
    if (end_time !== undefined) {
      updateFields.push('end_time = ?');
      updateValues.push(end_time);
    }
    
    // 如果没有要更新的字段，直接返回
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供任何要更新的字段'
      });
    }
    
    // 添加ID作为WHERE条件
    updateValues.push(id);
    
    // 执行更新
    await query(
      `UPDATE announcements SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    // 获取更新后的公告
    const [updatedAnnouncement] = await query(
      'SELECT * FROM announcements WHERE id = ?',
      [id]
    );
    
    return res.status(200).json({
      success: true,
      message: '更新公告成功',
      data: updatedAnnouncement
    });
  } catch (error) {
    logger.error(`更新公告失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '更新公告失败',
      details: error.message
    });
  }
};

/**
 * 删除公告
 */
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查公告是否存在
    const [existingAnnouncement] = await query(
      'SELECT * FROM announcements WHERE id = ?',
      [id]
    );
    
    if (!existingAnnouncement) {
      return res.status(404).json({
        success: false,
        message: '公告不存在'
      });
    }
    
    // 删除公告
    await query(
      'DELETE FROM announcements WHERE id = ?',
      [id]
    );
    
    return res.status(200).json({
      success: true,
      message: '删除公告成功'
    });
  } catch (error) {
    logger.error(`删除公告失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '删除公告失败',
      details: error.message
    });
  }
};

module.exports = {
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
}; 
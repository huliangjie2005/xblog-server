/**
 * 统一响应工具模块
 */
const { logger } = require('./logger');

/**
 * 统一API响应格式工具类
 */

class ApiResponse {
  /**
   * 成功响应
   * @param {any} data - 响应数据
   * @param {string} message - 成功消息
   */
  static success(data = null, message = '操作成功') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 错误响应
   * @param {string} message - 错误消息
   * @param {number} code - 错误代码
   * @param {any} details - 错误详情
   */
  static error(message = '操作失败', code = 400, details = null) {
    return {
      success: false,
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 分页数据响应
   * @param {Array} items - 分页数据项
   * @param {number} total - 总数
   * @param {number} page - 当前页码
   * @param {number} limit - 每页数量
   */
  static paginate(items, total, page, limit) {
    return this.success({
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  }
}

/**
 * 发送成功响应
 * @param {object} res - Express响应对象
 * @param {string} message - 成功消息
 * @param {any} data - 响应数据
 * @param {number} status - HTTP状态码
 */
const responseSuccess = (res, message = '操作成功', data = null, status = 200) => {
  const response = ApiResponse.success(data, message);
  return res.status(status).json(response);
};

/**
 * 发送错误响应
 * @param {object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} status - HTTP状态码
 * @param {any} details - 错误详情
 */
const responseError = (res, message = '操作失败', status = 400, details = null) => {
  const response = ApiResponse.error(message, status, details);
  return res.status(status).json(response);
};

module.exports = {
  ApiResponse,
  responseSuccess,
  responseError
}; 
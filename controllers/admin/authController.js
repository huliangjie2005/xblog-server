const jwt = require('jsonwebtoken');
const userService = require('../../services/userService');
const { responseSuccess, responseError } = require('../../utils/response');
const jwtConfig = require('../../config/jwt');
const { logger } = require('../../utils/logger');
const { query } = require('../../utils/db');

/**
 * 管理员认证控制器
 */

/**
 * 禁用管理员注册
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Object} JSON响应
 */
async function disableRegister(req, res) {
  console.log('===== 控制端管理员注册尝试被拦截 =====');
  console.log('请求IP:', req.ip);
  console.log('请求体:', req.body);
  
  logger.warn('尝试在控制端注册管理员账户被拒绝', {
    ip: req.ip,
    body: req.body
  });
  
  return res.status(403).json({
    success: false,
    code: 403,
    message: '管理员账户注册功能已禁用，请联系系统管理员创建账户',
    errors: null
  });
}

/**
 * 管理员注册
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Object} JSON响应
 */
async function register(req, res) {
  try {
    logger.info('收到管理员注册请求:', req.body);
    
    const { username, email, password, confirmPassword, role = 'admin' } = req.body;
    
    // 验证密码匹配
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '两次输入的密码不匹配',
        errors: null
      });
    }
    
    // 注册管理员
    const result = await userService.registerAdminUser({
      username,
      email,
      password,
      role
    });
    
    if (!result.success) {
      logger.error('管理员注册处理失败:', result.message);
      return res.status(400).json({
        success: false,
        code: 400,
        message: result.message,
        errors: null
      });
    }
    
    logger.info('管理员注册成功处理完成:', username);
    return res.json({
      success: true,
      code: 200,
      message: '管理员注册成功',
      data: { adminId: result.adminId }
    });
  } catch (error) {
    logger.error('管理员注册异常:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      code: 500,
      message: '服务器内部错误',
      errors: null
    });
  }
}

/**
 * 管理员登录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Object} JSON响应
 */
async function login(req, res) {
  try {
    logger.info('收到管理员登录请求:', { username: req.body.username });
    console.log('收到管理员登录请求:', { username: req.body.username, password: req.body.password });
    
    const { username, password } = req.body;
    
    // 参数验证
    if (!username || !password) {
      logger.warn('管理员登录缺少参数');
      return res.status(400).json({
        success: false,
        code: 400,
        message: '用户名和密码不能为空',
        errors: null
      });
    }
    
    // 登录处理
    const result = await userService.loginAdminUser(username, password);
    
    if (!result.success) {
      logger.error('管理员登录失败:', result.message);
      return res.status(401).json({
        success: false,
        code: 401,
        message: result.message,
        errors: null
      });
    }
    
    logger.info('管理员登录成功:', username);
    return res.json({
      success: true,
      code: 200,
      message: '登录成功',
      data: {
        token: result.token,
        admin: result.user // 修改为 admin 符合文档
      }
    });
  } catch (error) {
    logger.error('管理员登录异常:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      code: 500,
      message: '登录时发生错误',
      errors: null
    });
  }
}

/**
 * 获取当前管理员信息
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
const getCurrentAdmin = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    
    if (role !== 'admin') {
      return responseError(res, '权限不足', 403);
    }
    
    const result = await userService.getCurrentUser(userId, 'admin');
    
    if (result.success) {
      return responseSuccess(res, '获取管理员信息成功', result.user);
    } else {
      return responseError(res, result.message, 404);
    }
  } catch (err) {
    logger.error('获取管理员信息错误:', err.message);
    return responseError(res, '获取管理员信息时出现错误', 500);
  }
};

/**
 * 管理员登出
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
const logout = (req, res) => {
  try {
    // 清除cookie
    if (process.env.USE_COOKIE === 'true') {
      res.clearCookie('admin_token');
    }
    
    return responseSuccess(res, '登出成功', null);
  } catch (err) {
    logger.error('管理员登出控制器错误:', err.message);
    return responseError(res, '登出过程中出现错误', 500);
  }
};

module.exports = {
  register,
  login,
  getCurrentAdmin,
  logout,
  disableRegister
}; 
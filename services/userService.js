const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const jwtConfig = require('../config/jwt');
const { logger } = require('../utils/logger');

/**
 * 根据用户名查找普通用户
 * @param {string} username - 用户名
 * @returns {Promise<Object|null>} 用户对象或null
 */
const findPublicUserByUsername = async (username) => {
  try {
    const sql = 'SELECT * FROM public_users WHERE username = ?';
    const users = await query(sql, [username]);
    return users.length ? users[0] : null;
  } catch (error) {
    logger.error('查找用户失败:', error.message);
    throw error;
  }
};

/**
 * 根据邮箱查找普通用户
 * @param {string} email - 邮箱
 * @returns {Promise<Object|null>} 用户对象或null
 */
const findPublicUserByEmail = async (email) => {
  try {
    const sql = 'SELECT * FROM public_users WHERE email = ?';
    const users = await query(sql, [email]);
    return users.length ? users[0] : null;
  } catch (error) {
    logger.error('查找用户失败:', error.message);
    throw error;
  }
};

/**
 * 创建普通用户
 * @param {Object} userData - 用户数据
 * @param {string} userData.username - 用户名
 * @param {string} userData.password - 密码
 * @param {string} userData.email - 邮箱
 * @param {string} [userData.avatar] - 头像URL
 * @returns {Promise<Object>} 创建结果
 */
const createPublicUser = async (userData) => {
  try {
    const { username, password, email, avatar = '' } = userData;
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const sql = `
      INSERT INTO public_users (username, password, email, avatar, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    
    const result = await query(sql, [username, hashedPassword, email, avatar]);
    return { id: result.insertId };
  } catch (error) {
    logger.error('创建用户失败:', error.message);
    throw error;
  }
};

/**
 * 根据用户名查找管理员
 * @param {string} username - 用户名
 * @returns {Promise<Object|null>} 管理员对象或null
 */
const findAdminByUsername = async (username) => {
  try {
    const sql = `
      SELECT a.*, r.name as role_name 
      FROM admin_users a
      JOIN roles r ON a.role_id = r.id
      WHERE a.username = ?
    `;
    const admins = await query(sql, [username]);
    return admins.length ? admins[0] : null;
  } catch (error) {
    logger.error('查找管理员失败:', error.message);
    throw error;
  }
};

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hashedPassword - 加密后的密码
 * @returns {Promise<boolean>} 是否匹配
 */
const validatePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * 更新用户登录时间
 * @param {number} userId - 用户ID
 * @param {string} userType - 用户类型 ('public' 或 'admin')
 * @returns {Promise<Object>} 更新结果
 */
const updateLastLogin = async (userId, userType = 'public') => {
  try {
    const tableName = userType === 'admin' ? 'admin_users' : 'public_users';
    const sql = `UPDATE ${tableName} SET last_login = NOW() WHERE id = ?`;
    return await query(sql, [userId]);
  } catch (error) {
    logger.error('更新登录时间失败:', error.message);
    throw error;
  }
};

/**
 * 注册普通用户
 * @param {Object} userData - 用户数据
 * @returns {Promise<Object>} 注册结果
 */
async function registerPublicUser(userData) {
  const { username, email, password, nickname } = userData;
  
  try {
    console.log(`尝试注册用户: ${username}, 邮箱: ${email}`);
    
    // 检查电子邮箱是否已被使用
    const existingUser = await query(
      'SELECT id FROM public_users WHERE email = ?', 
      [email]
    );
    
    console.log(`检查邮箱是否存在: ${email}, 结果: ${existingUser && existingUser.length > 0 ? '已存在' : '不存在'}`);
    
    if (existingUser && existingUser.length > 0) {
      console.log(`注册失败: 邮箱 ${email} 已被注册`);
      return { success: false, message: '该电子邮箱已被注册' };
    }
    
    // 哈希密码
    console.log('开始哈希密码...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(`密码哈希结果: ${hashedPassword.substring(0, 20)}...`);
    
    // 插入用户数据
    const sql = 'INSERT INTO public_users (username, email, password, nickname, created_at) VALUES (?, ?, ?, ?, NOW())';
    console.log('执行SQL插入:', sql);
    console.log('参数:', username, email, hashedPassword.substring(0, 10) + '...', nickname || username);
    
    const result = await query(sql, [username, email, hashedPassword, nickname || username]);
    
    console.log(`用户注册成功! ID: ${result.insertId}`);
    
    return { 
      success: true, 
      message: '注册成功', 
      userId: result.insertId 
    };
  } catch (error) {
    logger.error('用户注册失败:', error.message);
    console.error('用户注册失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return { success: false, message: '注册时发生错误' };
  }
}

/**
 * 注册管理员用户
 * @param {Object} adminData - 管理员数据
 * @returns {Promise<Object>} 注册结果
 */
async function registerAdminUser(adminData) {
  const { username, email, password, role = 'admin' } = adminData;
  
  try {
    // 打印完整的请求数据
    logger.info('管理员注册数据:', JSON.stringify(adminData));
    
    // 检查电子邮箱是否已被使用
    const existingAdmin = await query(
      'SELECT id FROM admin_users WHERE email = ?', 
      [email]
    );
    
    if (existingAdmin && existingAdmin.length > 0) {
      return { success: false, message: '该电子邮箱已被注册' };
    }
    
    // 根据角色名称获取对应的role_id
    let roleId = null;
    try {
      const roleResult = await query('SELECT id FROM roles WHERE name = ?', [role]);
      if (roleResult && roleResult.length > 0) {
        roleId = roleResult[0].id;
        logger.info(`找到角色ID: ${roleId} (角色名: ${role})`);
      } else {
        logger.warn(`未找到角色: ${role}, 将使用默认的null值`);
      }
    } catch (roleError) {
      logger.error('查询角色时出错:', roleError.message);
    }
    
    // 打印调试信息
    logger.info(`准备注册管理员: ${username}, 邮箱: ${email}, 角色: ${role}, 角色ID: ${roleId || 'null'}`);
    
    // 哈希密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 使用预处理SQL语句插入管理员数据
    const insertSql = `
      INSERT INTO admin_users 
      (username, email, password, role_id, status, created_at) 
      VALUES (?, ?, ?, ?, 1, NOW())
    `;
    
    logger.info('执行SQL插入:', insertSql.replace(/\s+/g, ' '));
    
    const result = await query(insertSql, [
      username, 
      email, 
      hashedPassword, 
      roleId
    ]);
    
    logger.info(`管理员注册成功: ID=${result.insertId}, 用户名=${username}`);
    
    return { 
      success: true, 
      message: '管理员注册成功', 
      adminId: result.insertId 
    };
  } catch (error) {
    // 详细记录错误
    logger.error('管理员注册失败:', error.message);
    logger.error('错误堆栈:', error.stack);
    
    // 检查是否为SQL错误
    if (error.code && error.sqlMessage) {
      logger.error(`SQL错误 ${error.code}: ${error.sqlMessage}`);
      return { 
        success: false, 
        message: `注册时发生数据库错误: ${error.sqlMessage}` 
      };
    }
    
    return { success: false, message: '注册时发生错误' };
  }
}

/**
 * 普通用户登录
 * @param {string} email - 用户邮箱或用户名
 * @param {string} password - 用户密码
 * @returns {Promise<Object>} 登录结果
 */
async function loginPublicUser(email, password) {
  try {
    logger.info(`尝试用户登录: ${email}`);
    console.log(`尝试用户登录: ${email}, 密码前3位: ${password.substring(0, 3)}***`);
    
    // 判断输入的是邮箱还是用户名
    const isEmail = email.includes('@');
    
    // 根据输入类型查找用户
    let sql;
    if (isEmail) {
      sql = 'SELECT id, username, email, password, status, nickname, avatar, email_verified FROM public_users WHERE email = ?';
    } else {
      sql = 'SELECT id, username, email, password, status, nickname, avatar, email_verified FROM public_users WHERE username = ?';
    }
    
    console.log('执行SQL查询:', sql);
    const users = await query(sql, [email]);
    
    console.log(`查询结果数量: ${users ? users.length : 0}`);
    if (users && users.length > 0) {
      console.log(`找到用户: ID=${users[0].id}, 用户名=${users[0].username}, 密码哈希=${users[0].password.substring(0, 20)}...`);
    }
    
    if (!users || users.length === 0) {
      const errorMsg = isEmail ? '邮箱不存在' : '用户名不存在';
      logger.warn(`登录尝试失败: ${errorMsg} ${email}`);
      console.log(`登录尝试失败: ${errorMsg} ${email}`);
      return { success: false, message: '用户名/邮箱或密码不正确' };
    }
    
    const user = users[0];
    logger.info(`找到用户: ID=${user.id}, 用户名=${user.username}`);
    
    // 检查账户状态
    if (user.status !== 1) {
      logger.warn(`登录尝试失败: 账户已禁用 ${email}`);
      console.log(`登录尝试失败: 账户已禁用 ${email}`);
      return { success: false, message: '账户已被禁用' };
    }
    
    // 验证密码
    console.log('开始验证密码, 输入密码:', password, '哈希密码:', user.password);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`密码验证结果: ${isMatch ? '匹配' : '不匹配'}`);
    
    if (!isMatch) {
      logger.warn(`登录尝试失败: 密码不匹配 ${email}`);
      console.log(`登录尝试失败: 密码不匹配 ${email}`);
      return { success: false, message: '用户名/邮箱或密码不正确' };
    }
    
    logger.info(`用户登录成功: ${email}`);
    console.log(`用户登录成功: ${email}`);
    
    // 生成JWT令牌
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: 'user'
    };
    
    const token = jwt.sign(payload, jwtConfig.JWT_SECRET, { expiresIn: jwtConfig.JWT_EXPIRES_IN });
    console.log(`生成的令牌: ${token.substring(0, 20)}...`);
    
    // 创建安全的用户对象（不含密码）
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname || user.username,
      avatar: user.avatar,
      email_verified: user.email_verified
    };
    
    // 更新最后登录时间
    try {
      await updateLastLogin(user.id, 'public');
    } catch (updateError) {
      logger.warn(`更新最后登录时间失败: ${updateError.message}`);
      console.log(`更新最后登录时间失败: ${updateError.message}`);
    }
    
    return {
      success: true,
      message: '登录成功',
      token,
      user: safeUser
    };
  } catch (error) {
    logger.error('用户登录失败:', error.message);
    logger.error('错误堆栈:', error.stack);
    console.error('用户登录失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return { success: false, message: '登录时发生错误' };
  }
}

/**
 * 管理员用户登录
 * @param {string} username - 管理员用户名
 * @param {string} password - 管理员密码
 * @returns {Promise<Object>} 登录结果
 */
async function loginAdminUser(username, password) {
  try {
    logger.info(`管理员登录尝试: ${username}`);
    console.log(`管理员登录尝试: ${username}, 密码: ${password.substring(0, 3)}***`);
    
    // 查找管理员，联表查询角色信息
    const query1 = `
      SELECT a.id, a.username, a.email, a.password, a.status, a.role_id, r.name as role_name 
      FROM admin_users a
      LEFT JOIN roles r ON a.role_id = r.id
      WHERE a.username = ?
    `;
    logger.info('执行SQL查询:', query1.replace(/\s+/g, ' '));
    console.log('执行SQL查询:', query1.replace(/\s+/g, ' '));
    
    const admins = await query(query1, [username]);
    
    logger.info(`查询结果数量: ${admins ? admins.length : 0}`);
    console.log('查询结果:', JSON.stringify(admins, null, 2));
    
    if (!admins || admins.length === 0) {
      logger.warn(`管理员登录失败: 用户名不存在 ${username}`);
      console.log(`管理员登录失败: 用户名不存在 ${username}`);
      return { success: false, message: '用户名或密码不正确' };
    }
    
    const admin = admins[0];
    logger.info(`找到管理员: ID=${admin.id}, 用户名=${admin.username}, 角色ID=${admin.role_id}`);
    console.log(`找到管理员: ID=${admin.id}, 用户名=${admin.username}, 角色ID=${admin.role_id}, 密码哈希=${admin.password.substring(0, 10)}...`);
    
    // 检查账户状态
    if (admin.status !== 1) {
      logger.warn(`管理员登录失败: 账户已禁用 ${username}`);
      console.log(`管理员登录失败: 账户已禁用 ${username}`);
      return { success: false, message: '账户已被禁用' };
    }
    
    // 验证密码
    logger.info('开始验证密码');
    console.log('开始验证密码, 输入密码:', password, '哈希密码:', admin.password);
    const isMatch = await bcrypt.compare(password, admin.password);
    logger.info(`密码验证结果: ${isMatch ? '匹配' : '不匹配'}`);
    console.log(`密码验证结果: ${isMatch ? '匹配' : '不匹配'}`);
    
    if (!isMatch) {
      logger.warn(`管理员登录失败: 密码不匹配 ${username}`);
      console.log(`管理员登录失败: 密码不匹配 ${username}`);
      return { success: false, message: '用户名或密码不正确' };
    }
    
    // 确定角色名称
    const roleName = admin.role_name || 'admin';
    logger.info(`管理员登录成功: ${username}, 角色: ${roleName}`);
    console.log(`管理员登录成功: ${username}, 角色: ${roleName}`);
    
    // 生成JWT令牌
    const payload = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role_id === 1 ? 'superadmin' : 'admin'  // 确保role值正确
    };
    
    const token = jwt.sign(payload, jwtConfig.JWT_SECRET, { expiresIn: jwtConfig.JWT_EXPIRES_IN });
    logger.info(`生成JWT令牌: ${token.substring(0, 20)}...`);
    console.log(`生成JWT令牌: ${token.substring(0, 20)}...`);
    
    // 创建安全的管理员对象（不含密码）
    const safeAdmin = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: roleName
    };
    
    // 尝试更新最后登录时间，但忽略错误
    try {
      // 首先检查表是否有last_login字段
      const columns = await query('SHOW COLUMNS FROM admin_users');
      const hasLastLoginField = columns.some(col => col.Field === 'last_login');
      
      if (hasLastLoginField) {
        await query(
          'UPDATE admin_users SET last_login = NOW() WHERE id = ?',
          [admin.id]
        );
      } else {
        logger.warn('admin_users表中缺少last_login字段，跳过更新最后登录时间');
      }
    } catch (updateError) {
      // 如果更新失败，记录错误但不中断登录流程
      logger.warn(`更新最后登录时间失败，但不影响登录: ${updateError.message}`);
    }
    
    return {
      success: true,
      message: '登录成功',
      token,
      user: safeAdmin
    };
  } catch (error) {
    logger.error('管理员登录失败:', error.message);
    logger.error('错误堆栈:', error.stack);
    console.error('管理员登录失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return { success: false, message: '登录时发生错误' };
  }
}

/**
 * 获取当前用户信息
 * @param {number} userId - 用户ID
 * @param {string} role - 用户角色/类型 ('public' 或 'admin')
 * @returns {Promise<Object>} 用户信息
 */
async function getCurrentUser(userId, role) {
  try {
    logger.debug(`获取用户信息: userId=${userId}, role=${role}`);
    
    if (!userId) {
      logger.warn('获取用户信息失败: 没有提供用户ID');
      return { success: false, message: '获取用户信息失败: 用户ID无效' };
    }
    
    // 判断是管理员用户还是普通用户
    const isAdmin = role === 'admin' || role === 'superadmin';
    const tableName = isAdmin ? 'admin_users' : 'public_users';
    const userType = isAdmin ? 'admin' : 'public';
    
    logger.info(`查询用户: userId=${userId}, userType=${userType}, tableName=${tableName}`);
    
    // 查询用户信息
    let users;
    
    try {
      if (isAdmin) {
        // 管理员用户查询，需要连接roles表获取角色
        // 注意：admin_users表可能没有某些字段，如nickname、bio等
        users = await query(
          `SELECT 
            u.id, u.username, u.email, u.avatar, u.status, u.created_at, 
            u.updated_at, u.last_login, r.name as role_name, u.role_id
           FROM ${tableName} u
           LEFT JOIN roles r ON u.role_id = r.id
           WHERE u.id = ?`,
          [userId]
        );
      } else {
        // 普通用户查询
        users = await query(
          `SELECT * FROM ${tableName} WHERE id = ?`,
          [userId]
        );
      }
    } catch (error) {
      logger.error(`SQL执行错误: ${error.message}`);
      logger.error(`SQL语句: ${error.sql || '未知'}`);
      logger.error(`SQL参数: [${userId}]`);
      
      // 尝试使用更简单的查询作为后备方案
      try {
        users = await query(
          `SELECT id, username, email, avatar, status, created_at, updated_at, last_login FROM ${tableName} WHERE id = ?`,
          [userId]
        );
        logger.info('使用后备查询成功获取用户信息');
      } catch (fallbackError) {
        logger.error(`Fallback查询也失败: ${fallbackError.message}`);
        throw error; // 抛出原始错误
      }
    }
    
    if (!users || users.length === 0) {
      logger.warn(`未找到用户: userId=${userId}, userType=${userType}`);
      return { success: false, message: '用户不存在' };
    }
    
    // 根据用户类型加工数据
    if (isAdmin) {
      // 管理员用户信息
      let roleName = users[0].role_name || 'admin';
      const userData = {
        ...users[0],
        role: roleName,
        roles: [roleName],
        status: users[0].status !== undefined ? users[0].status : 1,
        // 为避免前端报错，确保所有预期字段都存在
        nickname: users[0].nickname || users[0].username,
        bio: users[0].bio || ''
      };
      
      // 更新最后登录时间
      try {
        await query(
          `UPDATE ${tableName} SET last_login = NOW() WHERE id = ?`,
          [userId]
        );
        logger.debug(`已更新管理员最后登录时间: userId=${userId}`);
      } catch (error) {
        logger.warn(`无法更新最后登录时间: ${error.message}`);
      }
      
      // 移除敏感信息
      delete userData.password;
      
      return {
        success: true,
        user: userData
      };
    } else {
      // 普通用户信息
      const userData = {
        ...users[0],
        role: 'user',
        roles: ['user'],
        status: users[0].status !== undefined ? users[0].status : 1,
        bio: users[0].bio || ''
      };
      
      // 更新最后登录时间
      try {
        await query(
          `UPDATE ${tableName} SET last_login = NOW() WHERE id = ?`,
          [userId]
        );
        logger.debug(`已更新用户最后登录时间: userId=${userId}`);
      } catch (error) {
        logger.warn(`无法更新最后登录时间: ${error.message}`);
      }
      
      // 移除敏感信息 
      delete userData.password;
      
      return {
        success: true,
        user: userData
      };
    }
  } catch (error) {
    logger.error('获取用户信息失败:', error.message, error.stack);
    return { success: false, message: '获取用户信息时发生错误' };
  }
}

/**
 * 更新用户资料
 * @param {number} userId - 用户ID
 * @param {Object} userData - 用户资料数据
 * @param {string} userType - 用户类型 ('admin' 或 'public')
 * @returns {Promise<Object>} 更新结果
 */
async function updateUserProfile(userId, userData, userType = 'public') {
  try {
    if (!userId) {
      logger.warn('更新用户资料失败：没有提供用户ID');
      return { success: false, message: '更新失败：找不到用户' };
    }

    // 根据用户类型选择表
    const tableName = userType === 'admin' ? 'admin_users' : 'public_users';
    logger.info(`更新用户资料: userId=${userId}, userType=${userType}, tableName=${tableName}`);

    // 检查用户是否存在
    const userCheckSql = `SELECT id, username, email FROM ${tableName} WHERE id = ? AND status = 1`;
    const userCheck = await query(userCheckSql, [userId]);
    
    if (!userCheck || userCheck.length === 0) {
      logger.warn(`更新用户资料失败：找不到ID为 ${userId} 的用户，表 ${tableName}`);
      return { success: false, message: '用户不存在或已被禁用' };
    }

    // 构建更新字段和参数
    const updates = [];
    const params = [];

    // 支持更新的字段，基于用户类型可能有区别
    if (userData.email) {
      updates.push('email = ?');
      params.push(userData.email);
    }

    if (userData.nickname && userType === 'public') {
      updates.push('nickname = ?');
      params.push(userData.nickname);
    }

    if (userData.bio !== undefined && userType === 'public') {
      updates.push('bio = ?');
      params.push(userData.bio);
    }

    if (userData.avatar) {
      updates.push('avatar = ?');
      params.push(userData.avatar);
    }

    // 如果没有要更新的字段
    if (updates.length === 0) {
      logger.warn('更新用户资料失败：没有提供要更新的字段');
      return { success: false, message: '更新失败：没有提供有效的更新字段' };
    }

    // 添加用户ID到参数数组
    params.push(userId);

    // 执行更新
    const sql = `
      UPDATE ${tableName}
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;
    
    logger.debug('执行SQL更新:', sql, params);
    const result = await query(sql, params);
    
    if (result.affectedRows === 0) {
      logger.warn(`更新用户资料失败：可能找不到ID为 ${userId} 的用户`);
      return { success: false, message: '更新失败：找不到用户或无变更' };
    }

    // 获取更新后的用户信息，根据表类型选择不同的查询字段
    let updatedUserSql;
    if (userType === 'admin') {
      // 管理员表不包含nickname和bio字段
      updatedUserSql = `SELECT id, username, email, avatar, status, created_at, updated_at FROM ${tableName} WHERE id = ?`;
    } else {
      // 普通用户表包含所有字段
      updatedUserSql = `SELECT id, username, nickname, email, avatar, status, bio FROM ${tableName} WHERE id = ?`;
    }
    
    try {
      const updatedUser = await query(updatedUserSql, [userId]);

      if (!updatedUser || updatedUser.length === 0) {
        logger.warn(`获取更新后的用户信息失败：ID=${userId}`);
        return { 
          success: true, 
          message: '资料已更新，但无法获取更新后的信息',
          user: { id: userId }
        };
      }

      // 为管理员用户添加缺少的字段，确保前端不会因缺少字段而报错
      const responseUser = {
        ...updatedUser[0]
      };
      
      if (userType === 'admin') {
        responseUser.nickname = responseUser.username; // 使用用户名作为昵称
        responseUser.bio = ''; // 提供空的个人简介
      }

      logger.info(`用户资料更新成功: userId=${userId}, tableName=${tableName}`);
      return {
        success: true,
        message: '资料更新成功',
        user: responseUser
      };
    } catch (error) {
      logger.error(`获取更新后的用户信息错误: ${error.message}`);
      // 即使无法获取更新后的信息，也返回成功，因为更新操作本身已经成功
      return {
        success: true,
        message: '资料已更新，但无法获取更新后的信息',
        user: { id: userId }
      };
    }
  } catch (error) {
    logger.error('更新用户资料错误:', error.message, error.stack);
    return { success: false, message: '更新用户资料时发生错误' };
  }
}

/**
 * 获取所有普通用户列表
 * @param {Object} options - 查询选项
 * @param {number} [options.page=1] - 页码
 * @param {number} [options.limit=10] - 每页数量
 * @param {string} [options.sort='created_at'] - 排序字段
 * @param {string} [options.order='desc'] - 排序方式
 * @param {string} [options.search] - 搜索关键词(用户名或邮箱)
 * @param {number} [options.status] - 状态筛选(1:启用, 0:禁用)
 * @returns {Promise<Object>} 用户列表和分页信息
 */
async function getAllUsers(options = {}) {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'created_at',
      order = 'desc',
      search = '',
      status = null
    } = options;

    const offset = (page - 1) * limit;
    
    // 构建基础SQL和条件
    let countSql = 'SELECT COUNT(*) as total FROM public_users';
    let sql = `
      SELECT 
        id, username, email, nickname, avatar, 
        status, created_at, last_login, updated_at
      FROM public_users
    `;
    
    // 构建WHERE条件
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(username LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status !== null) {
      conditions.push('status = ?');
      params.push(status);
    }

    // 添加WHERE子句
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }

    // 执行总数查询
    const countParams = [...params];
    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;

    // 添加排序和分页
    const validSortFields = ['id', 'username', 'email', 'created_at', 'last_login', 'status'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    // 执行查询
    const users = await query(sql, params);

    // 获取每个用户的角色
    const safeUsers = [];
    for (const user of users) {
      const { password, ...safeUser } = user;
      
      // 获取用户角色
      const rolesSql = `
        SELECT r.code
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `;
      
      const roles = await query(rolesSql, [user.id]);
      safeUser.roles = roles.map(role => role.code);
      
      safeUsers.push(safeUser);
    }

    // 计算分页信息
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages
    };

    logger.info(`获取用户列表成功: 共${total}条记录, 第${page}页, 每页${limit}条`);
    return {
      success: true,
      message: '获取用户列表成功',
      users: safeUsers,
      pagination
    };
  } catch (error) {
    logger.error('获取用户列表失败:', error.message, error.stack);
    return {
      success: false,
      message: '获取用户列表失败',
      error: error.message
    };
  }
}

/**
 * 删除用户
 * @param {number} userId - 要删除的用户ID
 * @returns {Promise<Object>} 删除操作结果
 */
async function deleteUser(userId) {
  try {
    // 检查用户是否存在
    const userCheck = await query(
      'SELECT id, username, email FROM public_users WHERE id = ?',
      [userId]
    );
    
    if (!userCheck || userCheck.length === 0) {
      logger.warn(`删除用户失败：找不到ID为 ${userId} 的用户`);
      return { success: false, message: '用户不存在' };
    }

    // 执行删除操作
    const sql = 'DELETE FROM public_users WHERE id = ?';
    const result = await query(sql, [userId]);
    
    if (result.affectedRows === 0) {
      logger.warn(`删除用户失败：ID为 ${userId} 的用户不存在或删除失败`);
      return { success: false, message: '删除失败：找不到用户' };
    }

    logger.info(`用户删除成功: userId=${userId}, username=${userCheck[0].username}`);
    return {
      success: true,
      message: '用户删除成功',
      deletedUser: {
        id: userId,
        username: userCheck[0].username,
        email: userCheck[0].email
      }
    };
  } catch (error) {
    logger.error('删除用户错误:', error.message, error.stack);
    return { success: false, message: '删除用户时发生错误' };
  }
}

module.exports = {
  findPublicUserByUsername,
  findPublicUserByEmail,
  createPublicUser,
  findAdminByUsername,
  validatePassword,
  updateLastLogin,
  registerPublicUser,
  registerAdminUser,
  loginPublicUser,
  loginAdminUser,
  getCurrentUser,
  updateUserProfile,
  getAllUsers,
  deleteUser
};
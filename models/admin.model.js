/**
 * 管理员用户模型
 * 处理与admin_users表相关的数据操作
 */
const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

class AdminModel {
  /**
   * 查找所有管理员用户
   * @param {Object} options 查询选项
   * @returns {Promise<Array>} 管理员用户列表
   */
  static async find(conditions = {}, options = {}) {
    const { skip = 0, limit = 10 } = options;
    
    let sql = `SELECT a.*, r.name as role_name
              FROM admin_users a 
              LEFT JOIN roles r ON a.role_id = r.id`;
    
    const params = [];
    let whereClause = '';
    
    // 构建WHERE子句
    if (Object.keys(conditions).length > 0) {
      whereClause = ' WHERE ';
      const clauses = [];
      
      if (conditions.username) {
        clauses.push('a.username LIKE ?');
        params.push(`%${conditions.username}%`);
      }
      
      if (conditions.email) {
        clauses.push('a.email LIKE ?');
        params.push(`%${conditions.email}%`);
      }
      
      if (conditions.status !== undefined) {
        clauses.push('a.status = ?');
        params.push(conditions.status);
      }
      
      if (conditions.role_id) {
        clauses.push('a.role_id = ?');
        params.push(conditions.role_id);
      }
      
      whereClause += clauses.join(' AND ');
    }
    
    sql += whereClause;
    sql += ' ORDER BY a.created_at DESC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(skip));
    
    return await query(sql, params);
  }
  
  /**
   * 查找单个管理员用户
   * @param {string} id 管理员用户ID
   * @returns {Promise<Object>} 管理员用户数据
   */
  static async findById(id) {
    const sql = `SELECT a.*, r.name as role_name
                FROM admin_users a 
                LEFT JOIN roles r ON a.role_id = r.id 
                WHERE a.id = ?`;
    
    const results = await query(sql, [id]);
    return results.length > 0 ? results[0] : null;
  }
  
  /**
   * 通过用户名查找管理员用户
   * @param {string} username 用户名
   * @returns {Promise<Object>} 管理员用户数据
   */
  static async findByUsername(username) {
    const sql = `SELECT * FROM admin_users WHERE username = ?`;
    const results = await query(sql, [username]);
    return results.length > 0 ? results[0] : null;
  }
  
  /**
   * 通过邮箱查找管理员用户
   * @param {string} email 邮箱
   * @returns {Promise<Object>} 管理员用户数据
   */
  static async findByEmail(email) {
    const sql = `SELECT a.*, 
                r.name as role_name
                FROM admin_users a 
                LEFT JOIN roles r ON a.role_id = r.id 
                WHERE a.email = ?`;
    
    const results = await query(sql, [email]);
    return results.length > 0 ? results[0] : null;
  }
  
  /**
   * 统计管理员用户数量
   * @param {Object} conditions 查询条件
   * @returns {Promise<number>} 管理员用户数量
   */
  static async countDocuments(conditions = {}) {
    let sql = 'SELECT COUNT(*) as total FROM admin_users';
    
    const params = [];
    let whereClause = '';
    
    // 构建WHERE子句
    if (Object.keys(conditions).length > 0) {
      whereClause = ' WHERE ';
      const clauses = [];
      
      if (conditions.username) {
        clauses.push('username LIKE ?');
        params.push(`%${conditions.username}%`);
      }
      
      if (conditions.email) {
        clauses.push('email LIKE ?');
        params.push(`%${conditions.email}%`);
      }
      
      if (conditions.status !== undefined) {
        clauses.push('status = ?');
        params.push(conditions.status);
      }
      
      if (conditions.role_id) {
        clauses.push('role_id = ?');
        params.push(conditions.role_id);
      }
      
      whereClause += clauses.join(' AND ');
    }
    
    sql += whereClause;
    
    const results = await query(sql, params);
    return results[0].total;
  }
  
  /**
   * 创建管理员用户
   * @param {Object} data 管理员用户数据
   * @returns {Promise<Object>} 创建的管理员用户
   */
  static async create(data) {
    const { username, password, email, role_id = 2, status = 1 } = data;
    
    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const sql = `INSERT INTO admin_users (username, password, email, role_id, status) 
                VALUES (?, ?, ?, ?, ?)`;
    
    const result = await query(sql, [username, hashedPassword, email, role_id, status]);
    
    return {
      id: result.insertId,
      username,
      email,
      role_id,
      status
    };
  }
  
  /**
   * 更新管理员用户
   * @param {string} id 管理员用户ID
   * @param {Object} data 更新数据
   * @returns {Promise<Object>} 更新后的管理员用户
   */
  static async findByIdAndUpdate(id, data) {
    const updateFields = [];
    const updateParams = [];
    
    Object.keys(data).forEach(key => {
      if (key !== 'id' && key !== 'created_at' && key !== 'password') {
        updateFields.push(`${key} = ?`);
        updateParams.push(data[key]);
      }
    });
    
    // 如果有密码更新
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password, salt);
      updateFields.push('password = ?');
      updateParams.push(hashedPassword);
    }
    
    // 更新最后登录时间
    if (data.last_login) {
      updateFields.push('last_login = ?');
      updateParams.push(data.last_login);
    }
    
    if (updateFields.length === 0) {
      return await this.findById(id);
    }
    
    updateParams.push(id);
    
    const sql = `
      UPDATE admin_users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await query(sql, updateParams);
    
    return this.findById(id);
  }
  
  /**
   * 删除管理员用户
   * @param {string} id 管理员用户ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async findByIdAndDelete(id) {
    const sql = 'DELETE FROM admin_users WHERE id = ?';
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  }
  
  /**
   * 验证密码
   * @param {string} password 明文密码
   * @param {string} hashedPassword 加密密码
   * @returns {Promise<boolean>} 密码是否匹配
   */
  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }
  
  /**
   * 获取管理员的角色和权限
   * @param {string} adminId 管理员ID
   * @returns {Promise<Object>} 角色和权限信息
   */
  static async getRoleAndPermissions(adminId) {
    const sql = `
      SELECT r.id as role_id, r.name as role_name, r.description, 
             p.id as permission_id, p.name as permission_name, p.code
      FROM admin_roles ar
      JOIN roles r ON ar.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE ar.admin_id = ?
    `;
    
    const results = await query(sql, [adminId]);
    
    if (results.length === 0) {
      return { role: null, permissions: [] };
    }
    
    const role = {
      id: results[0].role_id,
      name: results[0].role_name,
      description: results[0].description
    };
    
    const permissions = results
      .filter(row => row.permission_id)
      .map(row => ({
        id: row.permission_id,
        name: row.permission_name,
        code: row.code
      }));
    
    return { role, permissions };
  }
}

module.exports = AdminModel; 
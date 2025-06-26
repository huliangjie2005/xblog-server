/**
 * 角色和权限初始化迁移脚本
 * 用于创建默认角色和权限
 */
const { query } = require('../config/db');
const { logger } = require('../utils/logger');

/**
 * 执行迁移
 */
async function migrate() {
  logger.info('开始执行角色和权限迁移');
  
  try {
    // 首先检查roles表是否存在并获取id列的数据类型
    let rolesTableExists = false;
    let rolesIdType = 'INT';
    
    try {
      const columnTypeResult = await query(`
        SELECT COLUMN_TYPE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'roles'
        AND COLUMN_NAME = 'id'
      `);
      
      if (columnTypeResult && columnTypeResult.length > 0) {
        rolesTableExists = true;
        rolesIdType = columnTypeResult[0].COLUMN_TYPE.toUpperCase();
        logger.info(`检测到现有roles表，id列类型为: ${rolesIdType}`);
      } else {
        logger.info('未检测到roles表或id列，将创建新表');
      }
    } catch (error) {
      logger.info(`检测roles表结构时出错: ${error.message}，将创建新表`);
    }
    
    // 检查roles表是否有code列
    let hasCodeColumn = false;
    if (rolesTableExists) {
      try {
        const codeColumnResult = await query(`
          SELECT COLUMN_NAME
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'roles'
          AND COLUMN_NAME = 'code'
        `);
        
        hasCodeColumn = codeColumnResult && codeColumnResult.length > 0;
        logger.info(`roles表${hasCodeColumn ? '有' : '没有'}code列`);
        
        // 如果没有code列，添加它，但暂时不添加唯一索引
        if (!hasCodeColumn) {
          await query(`
            ALTER TABLE roles
            ADD COLUMN code VARCHAR(50) NOT NULL DEFAULT '' AFTER name
          `);
          logger.info('成功添加code列到roles表');
          
          // 更新code列，为每个角色生成唯一的code
          const roles = await query('SELECT id, name FROM roles');
          if (roles && roles.length > 0) {
            for (let i = 0; i < roles.length; i++) {
              const role = roles[i];
              const code = role.name.toLowerCase().replace(/\s+/g, '-');
              await query('UPDATE roles SET code = ? WHERE id = ?', [`${code}-${role.id}`, role.id]);
              logger.info(`更新角色 ${role.name} 的code为 ${code}-${role.id}`);
            }
          }
          
          // 添加唯一索引
          await query('ALTER TABLE roles ADD UNIQUE INDEX idx_role_code (code)');
          logger.info('成功添加roles表的code列唯一索引');
        }
      } catch (error) {
        logger.error(`检查或添加code列时出错: ${error.message}`);
      }
    }
    
    // 创建角色表（如果不存在）
    if (!rolesTableExists) {
      await query(`
        CREATE TABLE IF NOT EXISTS roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          code VARCHAR(50) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      logger.info('创建roles表成功');
      
      // 再次获取roles表id列的类型
      try {
        const columnTypeResult = await query(`
          SELECT COLUMN_TYPE
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'roles'
          AND COLUMN_NAME = 'id'
        `);
        
        if (columnTypeResult && columnTypeResult.length > 0) {
          rolesIdType = columnTypeResult[0].COLUMN_TYPE.toUpperCase();
          logger.info(`新建roles表后，确认id列类型为: ${rolesIdType}`);
        }
      } catch (error) {
        logger.error(`获取新建roles表的id列类型失败: ${error.message}`);
      }
    }
    
    // 检查permissions表中是否有code列
    let permissionsTableExists = false;
    let hasPermissionCodeColumn = false;
    try {
      const result = await query(`
        SELECT 1 FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'permissions'
      `);
      permissionsTableExists = result.length > 0;
      
      if (permissionsTableExists) {
        const codeColumnResult = await query(`
          SELECT COLUMN_NAME
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'permissions'
          AND COLUMN_NAME = 'code'
        `);
        
        hasPermissionCodeColumn = codeColumnResult && codeColumnResult.length > 0;
        logger.info(`permissions表${hasPermissionCodeColumn ? '有' : '没有'}code列`);
        
        // 如果没有code列，添加它，但暂时不添加唯一索引
        if (!hasPermissionCodeColumn) {
          await query(`
            ALTER TABLE permissions
            ADD COLUMN code VARCHAR(100) NOT NULL DEFAULT '' AFTER name
          `);
          logger.info('成功添加code列到permissions表');
          
          // 更新code列，为每个权限生成唯一的code
          const permissions = await query('SELECT id, name FROM permissions');
          if (permissions && permissions.length > 0) {
            for (let i = 0; i < permissions.length; i++) {
              const permission = permissions[i];
              const code = permission.name.toLowerCase().replace(/\s+/g, '-');
              await query('UPDATE permissions SET code = ? WHERE id = ?', [`${code}-${permission.id}`, permission.id]);
              logger.info(`更新权限 ${permission.name} 的code为 ${code}-${permission.id}`);
            }
          }
          
          // 添加唯一索引
          await query('ALTER TABLE permissions ADD UNIQUE INDEX idx_permission_code (code)');
          logger.info('成功添加permissions表的code列唯一索引');
        }
      }
    } catch (error) {
      logger.info(`检查permissions表结构时出错: ${error.message}`);
    }
    
    // 创建权限表（如果不存在）
    if (!permissionsTableExists) {
      await query(`
        CREATE TABLE IF NOT EXISTS permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          code VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      logger.info('创建permissions表成功');
    } else {
      logger.info('permissions表已存在，跳过创建');
    }
    
    // 检查role_permissions表是否存在
    let rolePermissionsTableExists = false;
    try {
      const result = await query(`
        SELECT 1 FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'role_permissions'
      `);
      rolePermissionsTableExists = result.length > 0;
    } catch (error) {
      logger.info(`检查role_permissions表是否存在时出错: ${error.message}`);
    }
    
    // 创建角色-权限关联表（如果不存在）
    if (!rolePermissionsTableExists) {
      await query(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          role_id ${rolesIdType} NOT NULL,
          permission_id INT NOT NULL,
          PRIMARY KEY (role_id, permission_id),
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
          FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        )
      `);
      logger.info('创建role_permissions表成功');
    } else {
      logger.info('role_permissions表已存在，跳过创建');
    }
    
    // 检查user_roles表是否存在
    let userRolesTableExists = false;
    try {
      const result = await query(`
        SELECT 1 FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'user_roles'
      `);
      userRolesTableExists = result.length > 0;
    } catch (error) {
      logger.info(`检查user_roles表是否存在时出错: ${error.message}`);
    }
    
    // 创建用户-角色关联表（如果不存在）
    if (!userRolesTableExists) {
      // 检查users表的id列类型
      let usersIdType = 'INT';
      try {
        const result = await query(`
          SELECT COLUMN_TYPE
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'id'
        `);
        
        if (result && result.length > 0) {
          usersIdType = result[0].COLUMN_TYPE.toUpperCase();
          logger.info(`检测到users表，id列类型为: ${usersIdType}`);
        }
      } catch (error) {
        logger.warn(`获取users表id列类型失败: ${error.message}，将使用默认类型INT`);
      }
      
      await query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          user_id ${usersIdType} NOT NULL,
          role_id ${rolesIdType} NOT NULL,
          PRIMARY KEY (user_id, role_id),
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        )
      `);
      logger.info('创建user_roles表成功');
    } else {
      logger.info('user_roles表已存在，跳过创建');
    }
    
    // 创建默认角色
    const defaultRoles = [
      {
        name: 'Super Admin',
        code: 'superadmin',
        description: '超级管理员，拥有所有权限'
      },
      {
        name: 'Admin',
        code: 'admin',
        description: '管理员，拥有大部分管理权限'
      },
      {
        name: 'Editor',
        code: 'editor',
        description: '编辑，可以管理内容'
      },
      {
        name: 'Author',
        code: 'author',
        description: '作者，可以创建和管理自己的内容'
      },
      {
        name: 'User',
        code: 'user',
        description: '普通用户，有基本的浏览和评论权限'
      }
    ];
    
    // 插入默认角色
    for (const role of defaultRoles) {
      try {
        // 检查角色是否已存在
        const existingRole = await query('SELECT id FROM roles WHERE code = ?', [role.code]);
        
        if (existingRole.length === 0) {
          await query(
            'INSERT INTO roles (name, code, description) VALUES (?, ?, ?)',
            [role.name, role.code, role.description]
          );
          logger.info(`创建角色: ${role.name}`);
        } else {
          // 更新现有角色信息
          await query(
            'UPDATE roles SET name = ?, description = ? WHERE code = ?',
            [role.name, role.description, role.code]
          );
          logger.info(`更新角色: ${role.name}`);
        }
      } catch (error) {
        logger.error(`处理角色 ${role.name} 时出错: ${error.message}`);
      }
    }
    
    // 创建默认权限
    const defaultPermissions = [
      // 用户管理权限
      { name: '查看用户', code: 'user:view', description: '查看用户列表和详情' },
      { name: '创建用户', code: 'user:create', description: '创建新用户' },
      { name: '编辑用户', code: 'user:edit', description: '编辑用户信息' },
      { name: '删除用户', code: 'user:delete', description: '删除用户' },
      
      // 角色管理权限
      { name: '查看角色', code: 'role:view', description: '查看角色列表和详情' },
      { name: '创建角色', code: 'role:create', description: '创建新角色' },
      { name: '编辑角色', code: 'role:edit', description: '编辑角色信息' },
      { name: '删除角色', code: 'role:delete', description: '删除角色' },
      
      // 权限管理权限
      { name: '分配权限', code: 'permission:assign', description: '为角色分配权限' },
      
      // 文章管理权限
      { name: '查看文章', code: 'post:view', description: '查看文章列表和详情' },
      { name: '创建文章', code: 'post:create', description: '创建新文章' },
      { name: '编辑文章', code: 'post:edit', description: '编辑文章' },
      { name: '删除文章', code: 'post:delete', description: '删除文章' },
      { name: '发布文章', code: 'post:publish', description: '发布文章' },
      
      // 分类管理权限
      { name: '查看分类', code: 'category:view', description: '查看分类列表和详情' },
      { name: '创建分类', code: 'category:create', description: '创建新分类' },
      { name: '编辑分类', code: 'category:edit', description: '编辑分类' },
      { name: '删除分类', code: 'category:delete', description: '删除分类' },
      
      // 标签管理权限
      { name: '查看标签', code: 'tag:view', description: '查看标签列表和详情' },
      { name: '创建标签', code: 'tag:create', description: '创建新标签' },
      { name: '编辑标签', code: 'tag:edit', description: '编辑标签' },
      { name: '删除标签', code: 'tag:delete', description: '删除标签' },
      
      // 评论管理权限
      { name: '查看评论', code: 'comment:view', description: '查看评论列表和详情' },
      { name: '创建评论', code: 'comment:create', description: '创建新评论' },
      { name: '编辑评论', code: 'comment:edit', description: '编辑评论' },
      { name: '删除评论', code: 'comment:delete', description: '删除评论' },
      { name: '审核评论', code: 'comment:moderate', description: '审核评论' },
      
      // 系统设置权限
      { name: '查看设置', code: 'setting:view', description: '查看系统设置' },
      { name: '编辑设置', code: 'setting:edit', description: '编辑系统设置' },
      
      // 媒体管理权限
      { name: '查看媒体', code: 'media:view', description: '查看媒体列表和详情' },
      { name: '上传媒体', code: 'media:upload', description: '上传媒体文件' },
      { name: '删除媒体', code: 'media:delete', description: '删除媒体文件' }
    ];
    
    // 插入默认权限
    for (const permission of defaultPermissions) {
      try {
        // 检查权限是否已存在
        const existingPermission = await query('SELECT id FROM permissions WHERE code = ?', [permission.code]);
        
        if (existingPermission.length === 0) {
          await query(
            'INSERT INTO permissions (name, code, description) VALUES (?, ?, ?)',
            [permission.name, permission.code, permission.description]
          );
          logger.info(`创建权限: ${permission.name}`);
        } else {
          // 更新现有权限信息
          await query(
            'UPDATE permissions SET name = ?, description = ? WHERE code = ?',
            [permission.name, permission.description, permission.code]
          );
          logger.info(`更新权限: ${permission.name}`);
        }
      } catch (error) {
        logger.error(`处理权限 ${permission.name} 时出错: ${error.message}`);
      }
    }
    
    // 为每个角色分配默认权限
    const rolePermissionMappings = {
      // 超级管理员拥有所有权限，不需要明确指定
      
      // 管理员拥有除了角色和权限管理之外的所有权限
      'admin': [
        'user:view', 'user:create', 'user:edit', 'user:delete',
        'post:view', 'post:create', 'post:edit', 'post:delete', 'post:publish',
        'category:view', 'category:create', 'category:edit', 'category:delete',
        'tag:view', 'tag:create', 'tag:edit', 'tag:delete',
        'comment:view', 'comment:create', 'comment:edit', 'comment:delete', 'comment:moderate',
        'setting:view', 'setting:edit',
        'media:view', 'media:upload', 'media:delete'
      ],
      
      // 编辑可以管理所有内容，但不能管理用户和系统设置
      'editor': [
        'post:view', 'post:create', 'post:edit', 'post:delete', 'post:publish',
        'category:view', 'category:create', 'category:edit', 'category:delete',
        'tag:view', 'tag:create', 'tag:edit', 'tag:delete',
        'comment:view', 'comment:create', 'comment:edit', 'comment:delete', 'comment:moderate',
        'media:view', 'media:upload', 'media:delete'
      ],
      
      // 作者只能管理自己的内容
      'author': [
        'post:view', 'post:create', 'post:edit',
        'category:view',
        'tag:view',
        'comment:view', 'comment:create',
        'media:view', 'media:upload'
      ],
      
      // 普通用户只有基本权限
      'user': [
        'post:view',
        'category:view',
        'tag:view',
        'comment:view', 'comment:create',
        'media:view'
      ]
    };
    
    // 为每个角色分配权限
    for (const [roleCode, permissionCodes] of Object.entries(rolePermissionMappings)) {
      try {
        // 获取角色ID
        const roleResult = await query('SELECT id FROM roles WHERE code = ?', [roleCode]);
        
        if (!roleResult || roleResult.length === 0) {
          logger.warn(`角色 ${roleCode} 不存在，跳过权限分配`);
          continue;
        }
        
        const roleId = roleResult[0].id;
        
        // 删除该角色的所有现有权限
        await query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
        
        // 获取所有权限ID
        let assignedCount = 0;
        for (const permissionCode of permissionCodes) {
          const permResult = await query('SELECT id FROM permissions WHERE code = ?', [permissionCode]);
          
          if (!permResult || permResult.length === 0) {
            logger.warn(`权限 ${permissionCode} 不存在，跳过分配`);
            continue;
          }
          
          const permissionId = permResult[0].id;
          
          // 分配权限给角色
          await query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
            [roleId, permissionId]
          );
          assignedCount++;
        }
        
        logger.info(`为角色 ${roleCode} 分配了 ${assignedCount} 个权限`);
      } catch (error) {
        logger.error(`为角色 ${roleCode} 分配权限时出错: ${error.message}`);
      }
    }
    
    // 为超级管理员分配所有权限
    try {
      const superadminResult = await query('SELECT id FROM roles WHERE code = ?', ['superadmin']);
      
      if (superadminResult && superadminResult.length > 0) {
        const superadminId = superadminResult[0].id;
        
        // 删除超级管理员的所有现有权限
        await query('DELETE FROM role_permissions WHERE role_id = ?', [superadminId]);
        
        // 获取所有权限
        const allPermissions = await query('SELECT id FROM permissions');
        
        // 为超级管理员分配所有权限
        let assignedCount = 0;
        for (const permission of allPermissions) {
          await query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
            [superadminId, permission.id]
          );
          assignedCount++;
        }
        
        logger.info(`为超级管理员分配了所有权限 (${assignedCount} 个)`);
      } else {
        logger.warn('未找到超级管理员角色，跳过分配所有权限');
      }
    } catch (error) {
      logger.error(`为超级管理员分配权限时出错: ${error.message}`);
    }
    
    logger.info('角色和权限迁移执行完成');
    return { success: true, message: '角色和权限迁移执行成功' };
  } catch (error) {
    logger.error(`角色和权限迁移失败: ${error.message}`);
    return { success: false, message: `角色和权限迁移失败: ${error.message}` };
  }
}

// 导出迁移函数
module.exports = {
  migrate
}; 
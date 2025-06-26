/**
 * 权限数据清理脚本
 * 
 * 用途:
 * 1. 规范化权限数据
 * 2. 添加display_name字段
 * 3. 清理重复权限
 */
const { query } = require('../config/db');
const { logger } = require('../utils/logger');

// 权限映射配置：中文名称与英文编码的对应关系
const permissionMappings = [
  // 文章管理
  { code: 'article.view', display_name: '查看文章', group: '文章管理' },
  { code: 'article.create', display_name: '创建文章', group: '文章管理' },
  { code: 'article.edit', display_name: '编辑文章', group: '文章管理' },
  { code: 'article.delete', display_name: '删除文章', group: '文章管理' },
  { code: 'article.publish', display_name: '发布文章', group: '文章管理' },
  
  // 分类管理
  { code: 'category.view', display_name: '查看分类', group: '分类管理' },
  { code: 'category.create', display_name: '创建分类', group: '分类管理' },
  { code: 'category.edit', display_name: '编辑分类', group: '分类管理' },
  { code: 'category.delete', display_name: '删除分类', group: '分类管理' },
  
  // 标签管理
  { code: 'tag.view', display_name: '查看标签', group: '标签管理' },
  { code: 'tag.create', display_name: '创建标签', group: '标签管理' },
  { code: 'tag.edit', display_name: '编辑标签', group: '标签管理' },
  { code: 'tag.delete', display_name: '删除标签', group: '标签管理' },
  
  // 评论管理
  { code: 'comment.view', display_name: '查看评论', group: '评论管理' },
  { code: 'comment.create', display_name: '创建评论', group: '评论管理' },
  { code: 'comment.edit', display_name: '编辑评论', group: '评论管理' },
  { code: 'comment.delete', display_name: '删除评论', group: '评论管理' },
  { code: 'comment.audit', display_name: '审核评论', group: '评论管理' },
  
  // 用户管理
  { code: 'user.view', display_name: '查看用户', group: '用户管理' },
  { code: 'user.create', display_name: '创建用户', group: '用户管理' },
  { code: 'user.edit', display_name: '编辑用户', group: '用户管理' },
  { code: 'user.delete', display_name: '删除用户', group: '用户管理' },
  { code: 'user.block', display_name: '封禁用户', group: '用户管理' },
  
  // 管理员管理
  { code: 'admin.view', display_name: '查看管理员', group: '管理员管理' },
  { code: 'admin.create', display_name: '创建管理员', group: '管理员管理' },
  { code: 'admin.edit', display_name: '编辑管理员', group: '管理员管理' },
  { code: 'admin.delete', display_name: '删除管理员', group: '管理员管理' },
  
  // 设置管理
  { code: 'setting.view', display_name: '查看设置', group: '系统设置' },
  { code: 'setting.edit', display_name: '编辑设置', group: '系统设置' },
  
  // 文件管理
  { code: 'file.view', display_name: '查看文件', group: '文件管理' },
  { code: 'file.upload', display_name: '上传文件', group: '文件管理' },
  { code: 'file.delete', display_name: '删除文件', group: '文件管理' },
  
  // 角色权限管理
  { code: 'role.view', display_name: '查看角色', group: '角色权限' },
  { code: 'role.create', display_name: '创建角色', group: '角色权限' },
  { code: 'role.edit', display_name: '编辑角色', group: '角色权限' },
  { code: 'role.delete', display_name: '删除角色', group: '角色权限' },
  { code: 'permission.view', display_name: '查看权限', group: '角色权限' },
  { code: 'permission.assign', display_name: '分配权限', group: '角色权限' }
];

/**
 * 检查并创建display_name字段
 */
async function ensureDisplayNameField() {
  try {
    // 检查display_name字段是否存在
    const [displayNameColumn] = await query(`
      SHOW COLUMNS FROM permissions LIKE 'display_name'
    `);
    
    // 如果字段不存在，添加它
    if (!displayNameColumn) {
      logger.info('添加display_name字段到permissions表');
      await query(`
        ALTER TABLE permissions 
        ADD COLUMN display_name VARCHAR(255) 
        AFTER name
      `);
      logger.info('display_name字段添加成功');
    } else {
      logger.info('display_name字段已存在');
    }
    
    // 检查group字段是否存在
    const [groupColumn] = await query(`
      SHOW COLUMNS FROM permissions LIKE 'group'
    `);
    
    // 如果字段不存在，添加它
    if (!groupColumn) {
      logger.info('添加group字段到permissions表');
      await query(`
        ALTER TABLE permissions 
        ADD COLUMN \`group\` VARCHAR(255) 
        AFTER display_name
      `);
      logger.info('group字段添加成功');
    } else {
      logger.info('group字段已存在');
    }
  } catch (error) {
    logger.error(`确保字段存在时出错: ${error.message}`);
    throw error;
  }
}

/**
 * 清理权限数据
 */
async function cleanPermissions() {
  try {
    // 确保display_name字段存在
    await ensureDisplayNameField();
    
    // 获取所有权限
    const permissions = await query('SELECT * FROM permissions');
    logger.info(`获取到 ${permissions.length} 条权限记录`);
    
    // 创建映射查找索引
    const codeMap = new Map();
    permissionMappings.forEach(mapping => {
      codeMap.set(mapping.code, mapping);
    });
    
    // 查找中文名称和英文编码匹配的记录
    const matched = new Map();
    permissions.forEach(perm => {
      // 尝试通过code匹配
      if (codeMap.has(perm.code)) {
        const mapping = codeMap.get(perm.code);
        if (!matched.has(perm.code)) {
          matched.set(perm.code, { 
            keep: perm,
            others: []
          });
        } else {
          matched.get(perm.code).others.push(perm);
        }
      }
      // 尝试通过中文名称匹配
      else {
        for (const [code, mapping] of codeMap.entries()) {
          if (perm.name === mapping.display_name) {
            if (!matched.has(code)) {
              matched.set(code, { 
                keep: perm,
                others: []
              });
            } else if (matched.get(code).keep.id !== perm.id) {
              matched.get(code).others.push(perm);
            }
            break;
          }
        }
      }
    });
    
    // 开始事务
    await query('START TRANSACTION');
    
    try {
      // 处理匹配到的记录
      for (const [code, data] of matched.entries()) {
        const { keep, others } = data;
        const mapping = codeMap.get(code);
        
        // 更新保留的记录
        await query(`
          UPDATE permissions 
          SET code = ?, display_name = ?, \`group\` = ? 
          WHERE id = ?
        `, [code, mapping.display_name, mapping.group, keep.id]);
        
        logger.info(`更新权限: ${keep.id} - ${mapping.display_name} (${code})`);
        
        // 处理重复记录
        if (others.length > 0) {
          for (const duplicate of others) {
            // 更新权限关联
            await query(`
              UPDATE role_permissions 
              SET permission_id = ? 
              WHERE permission_id = ?
            `, [keep.id, duplicate.id]);
            
            // 删除重复记录
            await query(`
              DELETE FROM permissions 
              WHERE id = ?
            `, [duplicate.id]);
            
            logger.info(`删除重复权限: ${duplicate.id} - ${duplicate.name} (${duplicate.code})`);
          }
        }
      }
      
      // 处理未匹配的记录
      const allCodes = new Set(permissions.map(p => p.code));
      for (const perm of permissions) {
        if (!codeMap.has(perm.code) && !matched.has(perm.code)) {
          // 为未匹配的记录设置display_name
          await query(`
            UPDATE permissions 
            SET display_name = ? 
            WHERE id = ?
          `, [perm.name, perm.id]);
          
          logger.info(`更新未匹配权限: ${perm.id} - ${perm.name} (${perm.code})`);
        }
      }
      
      // 添加映射中不存在的权限
      for (const mapping of permissionMappings) {
        if (!allCodes.has(mapping.code) && !matched.has(mapping.code)) {
          await query(`
            INSERT INTO permissions (name, code, display_name, \`group\`) 
            VALUES (?, ?, ?, ?)
          `, [mapping.display_name, mapping.code, mapping.display_name, mapping.group]);
          
          logger.info(`添加新权限: ${mapping.display_name} (${mapping.code})`);
        }
      }
      
      // 提交事务
      await query('COMMIT');
      logger.info('权限清理完成');
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      logger.error(`权限清理失败: ${error.message}`);
      throw error;
    }
  } catch (error) {
    logger.error(`权限清理过程中出错: ${error.message}`);
    throw error;
  }
}

// 运行清理脚本
cleanPermissions()
  .then(() => {
    logger.info('权限数据清理和规范化完成');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`权限数据清理失败: ${error.message}`);
    process.exit(1);
  }); 
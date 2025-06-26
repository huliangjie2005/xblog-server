/**
 * 角色数据清理脚本
 * 
 * 用途:
 * 1. 规范化角色数据
 * 2. 合并重复角色
 * 3. 更新用户与角色的关联
 */
const { query } = require('../config/db');
const { logger } = require('../utils/logger');

// 添加控制台日志
function log(message) {
  console.log(message);
  if (logger && logger.info) {
    logger.info(message);
  }
}

function error(message) {
  console.error(message);
  if (logger && logger.error) {
    logger.error(message);
  }
}

/**
 * 清理角色数据
 */
async function cleanRoles() {
  try {
    log('开始清理角色数据...');
    
    // 获取所有角色
    log('获取所有角色...');
    const roles = await query('SELECT * FROM roles ORDER BY id');
    log(`获取到 ${roles.length} 条角色记录`);
    
    // 按code分组
    const rolesByCode = new Map();
    roles.forEach(role => {
      // 标准化角色编码（去除后缀数字和连字符）
      const baseCode = role.code.replace(/[-_]\d+$/, '');
      
      if (!rolesByCode.has(baseCode)) {
        rolesByCode.set(baseCode, [role]);
      } else {
        rolesByCode.get(baseCode).push(role);
      }
    });
    
    // 检查是否有重复角色
    let hasDuplicates = false;
    for (const [code, roleGroup] of rolesByCode.entries()) {
      if (roleGroup.length > 1) {
        hasDuplicates = true;
        log(`发现角色编码 "${code}" 有 ${roleGroup.length} 个角色:`);
        roleGroup.forEach(role => {
          log(`  - ${role.name} (ID: ${role.id}, 代码: ${role.code})`);
        });
      }
    }
    
    if (!hasDuplicates) {
      log('没有发现重复角色，无需清理');
      return;
    }
    
    // 处理重复角色
    log('开始处理重复角色...');
    await query('START TRANSACTION');
    
    try {
      for (const [code, roleGroup] of rolesByCode.entries()) {
        if (roleGroup.length > 1) {
          // 保留第一个角色（通常ID较小的那个）
          const mainRole = roleGroup[0];
          const duplicates = roleGroup.slice(1);
          
          log(`处理角色 "${code}":`);
          log(`保留角色: ${mainRole.name} (ID: ${mainRole.id}, 代码: ${mainRole.code})`);
          
          // 更新用户关联 (admin_users表)
          for (const dup of duplicates) {
            log(`处理重复角色: ${dup.name} (ID: ${dup.id}, 代码: ${dup.code})`);
            
            try {
              // 更新用户关联
              const userUpdateResult = await query('UPDATE admin_users SET role_id = ? WHERE role_id = ?', 
                [mainRole.id, dup.id]);
              
              log(`已更新 ${userUpdateResult.affectedRows || 0} 个用户从角色 ${dup.id} 到角色 ${mainRole.id}`);
              
              // 合并角色权限
              const permMergeResult = await query(`
                INSERT IGNORE INTO role_permissions (role_id, permission_id)
                SELECT ?, permission_id FROM role_permissions WHERE role_id = ?
              `, [mainRole.id, dup.id]);
              
              log(`已合并 ${permMergeResult.affectedRows || 0} 个权限从角色 ${dup.id} 到角色 ${mainRole.id}`);
              
              // 删除重复角色的权限关联
              const permDeleteResult = await query('DELETE FROM role_permissions WHERE role_id = ?', [dup.id]);
              log(`已删除角色 ${dup.id} 的 ${permDeleteResult.affectedRows || 0} 个权限关联`);
              
              // 删除重复角色
              const roleDeleteResult = await query('DELETE FROM roles WHERE id = ?', [dup.id]);
              
              if (roleDeleteResult.affectedRows > 0) {
                log(`已删除重复角色: ${dup.name} (ID: ${dup.id}, 代码: ${dup.code})`);
              } else {
                log(`无法删除角色 ${dup.id}，可能有外键约束，尝试检查外键关系`);
                
                // 检查是否有关联记录
                const checkAdminUsers = await query('SELECT COUNT(*) as count FROM admin_users WHERE role_id = ?', [dup.id]);
                log(`角色 ${dup.id} 仍有 ${checkAdminUsers[0].count} 个关联用户`);
                
                const checkRolePerms = await query('SELECT COUNT(*) as count FROM role_permissions WHERE role_id = ?', [dup.id]);
                log(`角色 ${dup.id} 仍有 ${checkRolePerms[0].count} 个关联权限`);
              }
            } catch (dupError) {
              error(`处理重复角色 ${dup.id} 时出错: ${dupError.message}`);
              throw dupError;
            }
          }
        }
      }
      
      // 提交事务
      await query('COMMIT');
      log('角色清理完成，事务已提交');
      
    } catch (txError) {
      // 回滚事务
      await query('ROLLBACK');
      error(`角色清理失败，已回滚事务: ${txError.message}`);
      throw txError;
    }
  } catch (error) {
    error(`角色清理过程中出错: ${error.message}`);
    error(error.stack);
    throw error;
  }
}

// 运行清理脚本
console.log('开始执行角色清理脚本...');
cleanRoles()
  .then(() => {
    console.log('角色数据清理和规范化完成');
    process.exit(0);
  })
  .catch(error => {
    console.error(`角色数据清理失败: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }); 
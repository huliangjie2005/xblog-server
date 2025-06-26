/**
 * 执行角色和权限迁移的脚本
 */

// 确保环境变量已加载
require('dotenv').config();

const { logger } = require('../utils/logger');
const { migrate } = require('../migrations/create_roles_permissions');

// 执行迁移
async function runMigration() {
  logger.info('开始执行角色和权限迁移脚本');
  
  try {
    const result = await migrate();
    
    if (result.success) {
      logger.info(result.message);
      console.log('\n✅ 角色和权限迁移成功');
    } else {
      logger.error(result.message);
      console.error('\n❌ 角色和权限迁移失败:', result.message);
    }
  } catch (error) {
    logger.error(`迁移过程出错: ${error.message}`);
    console.error('\n❌ 迁移过程出错:', error.message);
  }
  
  // 退出进程
  process.exit(0);
}

// 执行迁移
runMigration(); 
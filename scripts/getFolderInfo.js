const { query } = require('../config/db');

async function getFolderInfo() {
  try {
    const sql = `SELECT * FROM folders WHERE name = '文章图片'`;
    const folders = await query(sql);
    console.log(JSON.stringify(folders, null, 2));
    return folders;
  } catch (error) {
    console.error('获取文件夹信息失败:', error);
    throw error;
  }
}

getFolderInfo()
  .then(() => process.exit(0))
  .catch(() => process.exit(1)); 
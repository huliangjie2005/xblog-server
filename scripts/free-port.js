/**
 * 端口释放脚本 - 增强版
 * 用于查找并终止占用指定端口的进程
 * 增加了错误处理和超时保护
 */
const { exec, execSync } = require('child_process');
const dotenv = require('dotenv');
const path = require('path');
const { logger } = require('../utils/logger');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

// 获取端口号，默认为9002
const PORT = process.env.PORT || 9002;

/**
 * 异步执行命令并返回Promise
 * @param {string} command 命令
 * @returns {Promise<string>} 命令输出
 */
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error && error.code !== 1) { // lsof返回1表示未找到进程，不是真正错误
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * 主函数 - 释放指定端口
 * @returns {Promise<boolean>} 是否成功释放端口
 */
async function freePort() {
  try {
    // 使用important确保在终端显示
    logger.important(`正在查找占用端口 ${PORT} 的进程...`);
    
    const isWindows = process.platform === 'win32';
    let pids = [];
    
    if (isWindows) {
      // Windows系统
      try {
        const output = await execPromise(`netstat -ano | findstr :${PORT}`);
        if (!output) {
          logger.info(`没有进程占用端口 ${PORT}`);
          return true;
        }
        
        const lines = output.split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          
          if (pid && !isNaN(parseInt(pid))) {
            pids.push(pid);
          }
        }
      } catch (error) {
        logger.error(`查找Windows进程错误: ${error.message}`);
      }
      
      // 检查PID是否为Node进程，避免终止非Node进程
      for (const pid of pids) {
        try {
          const tasklistOutput = await execPromise(`tasklist /FI "PID eq ${pid}" /FO CSV`);
          if (tasklistOutput.toLowerCase().includes('node')) {
            logger.important(`找到Node.js进程占用端口 ${PORT}，PID: ${pid}`);
            try {
              await execPromise(`taskkill /F /PID ${pid}`);
              logger.important(`已终止进程 ${pid}`);
            } catch (killError) {
              logger.error(`终止进程失败: ${killError.message}`);
            }
          } else {
            logger.warn(`进程 ${pid} 似乎不是Node.js进程，请手动确认是否安全终止`);
          }
        } catch (tasklistError) {
          logger.error(`查询进程信息失败: ${tasklistError.message}`);
        }
      }
    } else {
      // Linux/Mac系统
      try {
        const output = await execPromise(`lsof -i :${PORT} -t`);
        pids = output.split('\n').filter(Boolean);
        
        for (const pid of pids) {
          try {
            // 检查是否为Node.js进程
            const psOutput = await execPromise(`ps -p ${pid} -o comm=`);
            if (psOutput.toLowerCase().includes('node')) {
              logger.important(`找到Node.js进程占用端口 ${PORT}，PID: ${pid}`);
              await execPromise(`kill -15 ${pid}`); // 先尝试优雅终止
              
              // 给进程3秒时间优雅终止
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // 检查进程是否仍在运行
              try {
                execSync(`ps -p ${pid}`);
                // 如果上面命令执行成功，说明进程仍在运行，使用SIGKILL
                logger.warn(`进程 ${pid} 未响应SIGTERM，使用SIGKILL强制终止`);
                await execPromise(`kill -9 ${pid}`);
              } catch (e) {
                // 进程已退出
                logger.important(`进程 ${pid} 已优雅终止`);
              }
            } else {
              logger.warn(`进程 ${pid} 似乎不是Node.js进程，请手动确认是否安全终止`);
            }
          } catch (killError) {
            logger.error(`终止进程失败: ${killError.message}`);
          }
        }
      } catch (error) {
        logger.error(`查找Unix进程错误: ${error.message}`);
      }
    }
    
    // 最后检查端口是否已释放
    try {
      if (isWindows) {
        const checkOutput = await execPromise(`netstat -ano | findstr :${PORT}`);
        if (!checkOutput) {
          logger.important(`端口 ${PORT} 已成功释放`);
          return true;
        }
      } else {
        const checkOutput = await execPromise(`lsof -i :${PORT} -t`);
        if (!checkOutput) {
          logger.important(`端口 ${PORT} 已成功释放`);
          return true;
        }
      }
      
      logger.warn(`端口 ${PORT} 可能仍被占用`);
      return false;
    } catch (error) {
      logger.error(`验证端口释放状态失败: ${error.message}`);
      return false;
    }
  } catch (error) {
    logger.error(`释放端口时发生错误: ${error.message}`);
    return false;
  }
}

// 仅导出函数，不执行，避免多余的日志输出
module.exports = { freePort };
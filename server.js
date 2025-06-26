const app = require('./app');
const http = require('http');
const { logger } = require('./utils/logger');
const dotenv = require('dotenv');
const { freePort } = require('./scripts/free-port');

// 确保环境变量已加载
dotenv.config();

// 设置静默模式，减少启动时的调试输出
process.env.SILENT_MODE = 'true';

// 获取配置的端口号
const configPort = process.env.PORT || 9002;
let port = configPort;
const maxPortAttempts = 10; // 最大尝试次数
let portAttempts = 0;

// 创建HTTP服务器
const server = http.createServer(app);

// 存储所有活跃连接
const connections = new Set();
let isShuttingDown = false;

/**
 * 尝试在指定端口启动服务器
 * @param {number} attemptPort - 尝试的端口号
 */
function startServer(attemptPort) {
  app.set('port', attemptPort);
  
  server.listen(attemptPort, () => {
    // 使用important级别记录，确保信息在终端显示
    logger.important(`服务器成功运行在端口: ${attemptPort}`);
    console.log(`\n===== Xblog 服务启动成功 =====`);
    console.log(`📡 服务器端口: ${attemptPort}`);
    console.log(`📚 API文档: http://localhost:${attemptPort}/api-docs`);
    console.log(`🔍 健康检查: http://localhost:${attemptPort}/health`);
    console.log(`🌐 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`===========================\n`);
    
    // 服务成功启动后，将端口记录到环境变量
    process.env.RUNNING_PORT = attemptPort.toString();
  });
}

// 跟踪所有打开的连接
server.on('connection', (connection) => {
  // 设置TCP keepalive
  connection.setKeepAlive(true, 60000); // 60秒
  
  connections.add(connection);
  
  connection.on('close', () => {
    connections.delete(connection);
  });
});

// 全局未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:');
  console.error(error.message);
  console.error(error.stack);
  logger.error(`未捕获的异常: ${error.message}`);
  logger.error(error.stack);
  
  // 给进程一点时间来写日志后退出
  setTimeout(() => {
    forceShutdown("未捕获的异常导致强制关闭");
  }, 1000);
});

// 全局未处理的Promise拒绝处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:');
  console.error(reason);
  if (reason instanceof Error) {
    console.error(reason.stack);
    logger.error(`未处理的Promise拒绝: ${reason.message}`);
    logger.error(reason.stack);
  } else {
    logger.error('未处理的Promise拒绝:');
    logger.error(JSON.stringify(reason));
  }
});

// 检测并处理内存泄漏 - 降低检查频率并只记录到文件不显示到控制台
const memWatcher = setInterval(() => {
  const memUsage = process.memoryUsage();
  logger.debug(`内存使用: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB/${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
  
  // 如果内存使用超过阈值，记录警告
  if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
    logger.warn('内存使用量高，可能存在内存泄漏');
  }
}, 300 * 1000); // 每5分钟检查一次

// 服务器错误处理
server.on('error', async (error) => {
  logger.error('服务器错误:');
  logger.error(error.message);
  logger.error(error.stack);
  
  if (error.syscall !== 'listen') {
    throw error;
  }
  
  switch (error.code) {
    case 'EACCES':
      logger.error(`端口 ${port} 需要提升权限`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`端口 ${port} 已被占用`);
      
      // 尝试释放端口
      try {
        const isReleased = await freePort();
        if (isReleased) {
          // 如果端口成功释放，等待短暂时间再重试
          logger.important(`端口 ${port} 已成功释放，3秒后重试...`);
          setTimeout(() => {
            startServer(port);
          }, 3000);
          return;
        }
      } catch (e) {
        logger.error(`无法释放端口: ${e.message}`);
      }
      
      // 如果无法释放现有端口，尝试使用下一个端口
      portAttempts++;
      if (portAttempts < maxPortAttempts) {
        port = parseInt(configPort) + portAttempts;
        logger.important(`尝试使用替代端口 ${port}...`);
        setTimeout(() => {
          startServer(port);
        }, 1000);
      } else {
        logger.error(`在${maxPortAttempts}次尝试后无法找到可用端口，退出程序`);
        process.exit(1);
      }
      break;
    default:
      throw error;
  }
});

// 强制关闭所有连接并退出
function forceShutdown(reason = "强制关闭") {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.important(`${reason}，强制关闭所有连接并退出...`);
  
  // 关闭所有打开的连接
  let activeConnections = connections.size;
  logger.important(`关闭 ${activeConnections} 个活跃连接...`);
  
  for (const connection of connections) {
    connection.destroy();
  }
  
  // 关闭服务器
  server.close(() => {
    logger.important('HTTP服务器已关闭');
    // 停止内存监视器
    clearInterval(memWatcher);
    // 退出进程
    process.exit(1);
  });
  
  // 如果5秒后仍未关闭，则直接退出
  setTimeout(() => {
    logger.error('无法在5秒内关闭连接，强制退出');
    process.exit(1);
  }, 5000);
}

// 优雅关闭
const shutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.important('接收到终止信号，优雅关闭中...');
  console.log('\n📢 正在关闭服务器...');
  
  // 清除内存监视器
  clearInterval(memWatcher);
  
  // 停止接受新连接
  server.close(() => {
    logger.important('HTTP服务器已关闭');
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
  
  // 给现有连接时间来完成
  const activeConnections = connections.size;
  if (activeConnections > 0) {
    console.log(`⏳ 等待 ${activeConnections} 个连接完成...`);
  }
  logger.important(`等待 ${activeConnections} 个活跃连接完成...`);
  
  // 如果10秒后仍未关闭，则强制退出
  setTimeout(() => {
    logger.error('无法在10秒内关闭连接，强制关闭所有连接并退出');
    forceShutdown("优雅关闭超时");
  }, 10000);
};

// 注册进程退出事件
process.on('SIGINT', shutdown);  // Ctrl+C
process.on('SIGTERM', shutdown); // Kill命令
process.on('SIGHUP', shutdown);  // 终端关闭

// 在Windows环境下处理CTRL_BREAK_EVENT和CTRL_CLOSE_EVENT
if (process.platform === 'win32') {
  process.on('message', (msg) => {
    if (msg === 'shutdown') {
      shutdown();
    }
  });
}

// 启动服务器
startServer(port);

// 导出服务器实例（用于测试）
module.exports = server; 
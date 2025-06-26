/**
 * 请求日志中间件
 */
const { logger } = require('../utils/logger');

/**
 * 记录所有API请求的中间件
 */
function requestLogger(req, res, next) {
  // 记录请求信息
  logger.info(`API请求: ${req.method} ${req.originalUrl}`);
  logger.info(`请求头: ${JSON.stringify({
    'content-type': req.headers['content-type'],
    'authorization': req.headers['authorization'] ? '存在' : '不存在',
    'user-agent': req.headers['user-agent']
  })}`);
  
  // 记录请求体 (如果存在)
  if (req.body && Object.keys(req.body).length > 0) {
    // 过滤敏感信息
    const filteredBody = { ...req.body };
    if (filteredBody.password) filteredBody.password = '******';
    if (filteredBody.old_password) filteredBody.old_password = '******';
    if (filteredBody.new_password) filteredBody.new_password = '******';
    if (filteredBody.confirm_password) filteredBody.confirm_password = '******';
    
    logger.info(`请求体: ${JSON.stringify(filteredBody)}`);
  }
  
  // 记录用户信息 (如果已验证)
  if (req.user) {
    logger.info(`用户信息: ID=${req.user.id}, 用户名=${req.user.username}, 角色=${req.user.role}`);
  } else {
    logger.info('未验证的请求');
  }
  
  // 记录响应
  const originalSend = res.send;
  res.send = function(body) {
    // 记录响应体 (如果是JSON)
    try {
      if (typeof body === 'string' && body.startsWith('{')) {
        const responseData = JSON.parse(body);
        logger.info(`API响应: ${req.method} ${req.originalUrl} - 状态码: ${res.statusCode}`);
        
        // 过滤敏感信息
        if (responseData.data && responseData.data.token) {
          responseData.data.token = responseData.data.token.substring(0, 20) + '...';
        }
        
        logger.info(`响应体: ${JSON.stringify(responseData)}`);
      }
    } catch (e) {
      // 忽略非JSON响应
    }
    
    originalSend.apply(res, arguments);
  };
  
  next();
}

module.exports = requestLogger; 
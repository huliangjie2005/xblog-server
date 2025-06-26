/**
 * 静态资源CORS中间件
 * 为静态资源添加正确的CORS头，解决跨域访问问题
 */

function corsStatic(req, res, next) {
  // 为所有请求添加CORS头
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // 重要：修改跨源资源策略为cross-origin
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Cross-Origin-Opener-Policy', 'unsafe-none');
  
  // 如果是预检请求，则直接返回200
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}

module.exports = corsStatic; 
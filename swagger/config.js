/**
 * Swagger UI配置
 */
const swaggerUiOptions = {
  // 自定义CSS样式
  customCss: `
    .swagger-ui .topbar { background-color: #2c3e50; }
    .swagger-ui .info .title { font-size: 2.5em; }
    .swagger-ui .scheme-container { background-color: #f8f9fa; }
  `,
  
  // 自定义Swagger UI标题
  customSiteTitle: 'Xblog API 文档',
  
  // 默认展开模型
  defaultModelsExpandDepth: 1,
  
  // 默认展开API操作
  defaultModelExpandDepth: 1,
  
  // 深度链接
  deepLinking: true,
  
  // 显示请求持续时间
  displayRequestDuration: true,
  
  // 默认展开标签
  docExpansion: 'list',
  
  // 显示操作ID
  displayOperationId: false,
  
  // 过滤器
  filter: true,
  
  // 标签排序
  tagsSorter: 'alpha',
  
  // 操作排序
  operationsSorter: 'method',
  
  // 持久化授权
  persistAuthorization: true,
  
  // 验证规范
  validatorUrl: null
};

module.exports = swaggerUiOptions; 
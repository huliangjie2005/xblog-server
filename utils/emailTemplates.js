/**
 * 邮件模板工具类
 * 用于集中管理系统发送的各类邮件模板
 */

// 获取环境配置
require('dotenv').config();

// 博客名称和基本URL
const BLOG_NAME = process.env.BLOG_NAME || 'Xblog';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const LOGO_URL = process.env.LOGO_URL || `${FRONTEND_URL}/logo.png`; // 博客logo链接，如果没有实际logo可以使用站点内相对路径

// 颜色方案
const colors = {
  primary: '#4CAF50',      // 主色调
  secondary: '#2c3e50',    // 次要颜色
  accent: '#3498db',       // 强调色
  light: '#f8f9fa',        // 浅色背景
  text: '#333333',         // 文本颜色
  link: '#1a73e8',         // 链接颜色
  footer: '#f1f1f1'        // 页脚背景色
};

// 邮件布局基本组件
const baseLayout = (content) => {
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${BLOG_NAME}</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, 'Microsoft YaHei', sans-serif;
          color: ${colors.text};
          line-height: 1.6;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
        }
        .email-header {
          background-color: ${colors.primary};
          padding: 20px;
          text-align: center;
        }
        .email-logo {
          max-height: 60px;
          margin-bottom: 10px;
        }
        .email-title {
          color: white;
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .email-content {
          padding: 30px 25px;
        }
        .email-footer {
          background-color: ${colors.footer};
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background-color: ${colors.primary};
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 600;
          margin: 15px 0;
          text-align: center;
        }
        .btn:hover {
          background-color: #45a049;
        }
        .link {
          color: ${colors.link};
          text-decoration: underline;
          word-break: break-all;
        }
        .divider {
          border-top: 1px solid #eee;
          margin: 20px 0;
        }
        .text-center {
          text-align: center;
        }
        .social-links {
          margin: 15px 0;
        }
        .social-links a {
          margin: 0 10px;
          text-decoration: none;
          color: ${colors.secondary};
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 12px 15px;
          margin: 15px 0;
          color: #856404;
        }
        .verification-code {
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 3px;
          padding: 15px;
          text-align: center;
          background-color: #f5f5f5;
          border-radius: 5px;
          margin: 20px 0;
          color: ${colors.secondary};
          font-family: 'Courier New', monospace;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <img src="${LOGO_URL}" alt="${BLOG_NAME} Logo" class="email-logo">
          <h1 class="email-title">${BLOG_NAME}</h1>
        </div>
        <div class="email-content">
          ${content}
        </div>
        <div class="email-footer">
          <div class="social-links">
            <a href="#">微博</a> | <a href="#">微信公众号</a> | <a href="#">GitHub</a>
          </div>
          <p>&copy; ${new Date().getFullYear()} ${BLOG_NAME}. 保留所有权利</p>
          <p>此邮件由系统自动发送，请勿直接回复</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * 验证码邮件模板
 * @param {string} username - 用户名
 * @param {string} verificationCode - 验证码
 * @param {number} expiresInMinutes - 过期时间(分钟)
 * @returns {string} HTML格式的邮件内容
 */
function getVerificationCodeTemplate(username, verificationCode, expiresInMinutes = 10) {
  const content = `
    <h2>您好，${username}！</h2>
    <p>感谢您注册 ${BLOG_NAME}。您的验证码如下：</p>
    
    <div class="verification-code">${verificationCode}</div>
    
    <p class="text-center">请在注册页面输入此验证码完成邮箱验证</p>
    
    <div class="divider"></div>
    
    <p>此验证码将在<strong>${expiresInMinutes}分钟内</strong>有效。</p>
    
    <div class="warning">
      如果您没有注册 ${BLOG_NAME}，请忽略此邮件。
    </div>
  `;
  
  return baseLayout(content);
}

/**
 * 验证邮箱模板
 * @param {string} username - 用户名
 * @param {string} token - 验证令牌
 * @returns {string} HTML格式的邮件内容
 */
function getEmailVerificationTemplate(username, token) {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  
  const content = `
    <h2>您好，${username}！</h2>
    <p>感谢您注册 ${BLOG_NAME}。请点击下面的按钮验证您的邮箱地址：</p>
    
    <div class="text-center">
      <a href="${verificationUrl}" class="btn">验证邮箱</a>
    </div>
    
    <p>或者复制以下链接到浏览器地址栏：</p>
    <p class="link">${verificationUrl}</p>
    
    <div class="divider"></div>
    
    <p>此链接将在<strong>24小时内</strong>有效。</p>
    
    <div class="warning">
      如果您没有注册 ${BLOG_NAME}，请忽略此邮件。
    </div>
  `;
  
  return baseLayout(content);
}

/**
 * 密码重置模板
 * @param {string} username - 用户名
 * @param {string} token - 重置令牌
 * @returns {string} HTML格式的邮件内容
 */
function getPasswordResetTemplate(username, token) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  
  const content = `
    <h2>您好，${username}！</h2>
    <p>我们收到了重置您 ${BLOG_NAME} 账户密码的请求。请点击下面的按钮重置密码：</p>
    
    <div class="text-center">
      <a href="${resetUrl}" class="btn">重置密码</a>
    </div>
    
    <p>或者复制以下链接到浏览器地址栏：</p>
    <p class="link">${resetUrl}</p>
    
    <div class="divider"></div>
    
    <p>此链接将在<strong>1小时内</strong>有效。</p>
    
    <div class="warning">
      如果您没有请求重置密码，请忽略此邮件，并考虑<a href="${FRONTEND_URL}/contact" class="link">联系我们</a>确保您的账户安全。
    </div>
  `;
  
  return baseLayout(content);
}

/**
 * 密码重置验证码模板
 * @param {string} username - 用户名
 * @param {string} resetCode - 重置验证码
 * @param {number} expiresInMinutes - 过期时间(分钟)
 * @returns {string} HTML格式的邮件内容
 */
function getPasswordResetCodeTemplate(username, resetCode, expiresInMinutes = 10) {
  const content = `
    <h2>您好，${username}！</h2>
    <p>我们收到了重置您 ${BLOG_NAME} 账户密码的请求。您的密码重置验证码如下：</p>
    
    <div class="verification-code">${resetCode}</div>
    
    <p class="text-center">请在重置密码页面输入此验证码</p>
    
    <div class="divider"></div>
    
    <p>此验证码将在<strong>${expiresInMinutes}分钟内</strong>有效。</p>
    
    <div class="warning">
      如果您没有请求重置密码，请忽略此邮件，并考虑<a href="${FRONTEND_URL}/contact" class="link">联系我们</a>确保您的账户安全。
    </div>
  `;
  
  return baseLayout(content);
}

/**
 * 通用通知模板
 * @param {string} subject - 通知主题
 * @param {string} content - 通知内容
 * @returns {string} HTML格式的邮件内容
 */
function getNotificationTemplate(subject, content) {
  const formattedContent = `
    <h2>${subject}</h2>
    ${content}
    
    <div class="divider"></div>
    
    <p class="text-center">
      <a href="${FRONTEND_URL}" class="btn">访问网站</a>
    </p>
  `;
  
  return baseLayout(formattedContent);
}

/**
 * 评论通知模板
 * @param {string} username - 用户名
 * @param {string} postTitle - 文章标题
 * @param {string} commentContent - 评论内容
 * @param {string} postUrl - 文章链接
 * @returns {string} HTML格式的邮件内容
 */
function getCommentNotificationTemplate(username, postTitle, commentContent, postUrl) {
  const content = `
    <h2>您好，${username}！</h2>
    <p>您的文章 <strong>${postTitle}</strong> 收到了新的评论：</p>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid ${colors.accent}; margin: 15px 0;">
      ${commentContent}
    </div>
    
    <div class="text-center">
      <a href="${postUrl}" class="btn">查看评论</a>
    </div>
  `;
  
  return baseLayout(content);
}

/**
 * 欢迎新用户模板
 * @param {string} username - 用户名
 * @returns {string} HTML格式的邮件内容
 */
function getWelcomeTemplate(username) {
  const content = `
    <h2>欢迎加入 ${BLOG_NAME}，${username}！</h2>
    
    <p>我们非常高兴您成为我们社区的一员。以下是一些帮助您开始的链接：</p>
    
    <ul>
      <li><a href="${FRONTEND_URL}/trending" class="link">热门文章</a> - 查看最受欢迎的内容</li>
      <li><a href="${FRONTEND_URL}/categories" class="link">内容分类</a> - 浏览您感兴趣的主题</li>
      <li><a href="${FRONTEND_URL}/profile/settings" class="link">个人设置</a> - 完善您的个人资料</li>
    </ul>
    
    <div class="divider"></div>
    
    <p>如果您有任何问题或需要帮助，请随时<a href="${FRONTEND_URL}/contact" class="link">联系我们</a>。</p>
    
    <div class="text-center">
      <a href="${FRONTEND_URL}" class="btn">开始探索</a>
    </div>
  `;
  
  return baseLayout(content);
}

module.exports = {
  getEmailVerificationTemplate,
  getVerificationCodeTemplate,
  getPasswordResetTemplate,
  getPasswordResetCodeTemplate,
  getNotificationTemplate,
  getCommentNotificationTemplate,
  getWelcomeTemplate
}; 
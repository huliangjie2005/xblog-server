/**
 * 邮件发送工具
 */
const nodemailer = require('nodemailer');
const { logger } = require('./logger');
const emailTemplates = require('./emailTemplates');
const { query } = require('../config/db');
require('dotenv').config();

// 创建邮件传输对象
let transporter;

/**
 * 从数据库获取邮件设置
 * @returns {Promise<{smtpHost: string, smtpPort: number, smtpSecure: boolean, smtpUser: string, senderName: string, password: string}>}
 */
async function getEmailSettings() {
  try {
    // 获取邮件设置
    const [emailSettings] = await query(
      `SELECT setting_value FROM settings WHERE setting_key = 'emailSettings'`
    );

    // 获取邮件密码
    const [emailPassword] = await query(
      `SELECT setting_value FROM settings WHERE setting_key = 'emailPassword'`
    );

    // 默认配置（使用环境变量）
    let config = {
      smtpHost: process.env.MAIL_HOST || '',
      smtpPort: parseInt(process.env.MAIL_PORT || '465'),
      smtpSecure: process.env.MAIL_SECURE === 'true',
      smtpUser: process.env.MAIL_USER || '',
      senderName: process.env.MAIL_FROM_NAME || 'XBlog',
      password: process.env.MAIL_PASSWORD || ''
    };

    // 如果数据库中有设置，则优先使用数据库中的设置
    if (emailSettings && emailSettings.setting_value) {
      try {
        const parsed = JSON.parse(emailSettings.setting_value);
        config = {
          ...config,
          ...parsed
        };
        // 静默模式下不输出
      } catch (e) {
        logger.error('解析邮件设置失败:', e.message);
        console.error('解析邮件设置失败:', e.message);
      }
    } else {
      console.log('数据库中没有找到邮件设置，使用环境变量');
    }

    // 如果数据库中有密码，则使用数据库中的密码
    if (emailPassword && emailPassword.setting_value) {
      config.password = emailPassword.setting_value;
      // 静默模式下不输出
    } else {
      console.log('数据库中没有找到邮件密码，使用环境变量');
    }

    // 检查配置是否完整
    const isConfigComplete = config.smtpHost && config.smtpUser && config.password;
    if (!isConfigComplete) {
      console.log('邮件配置不完整，可能无法正常发送邮件', {
        hasHost: !!config.smtpHost,
        hasUser: !!config.smtpUser,
        hasPassword: !!config.password
      });
    }

    return config;
  } catch (error) {
    logger.error(`获取邮件设置失败: ${error.message}`);
    console.error(`获取邮件设置失败: ${error.message}`);
    // 如果数据库查询失败，则使用环境变量中的设置
    return {
      smtpHost: process.env.MAIL_HOST || '',
      smtpPort: parseInt(process.env.MAIL_PORT || '465'),
      smtpSecure: process.env.MAIL_SECURE === 'true',
      smtpUser: process.env.MAIL_USER || '',
      senderName: process.env.MAIL_FROM_NAME || 'XBlog',
      password: process.env.MAIL_PASSWORD || ''
    };
  }
}

// 初始化邮件传输对象
async function initMailer() {
  try {
    // 从数据库获取邮件设置
    const config = await getEmailSettings();
    
    // 如果没有配置SMTP主机或用户名或密码，则不初始化
    if (!config.smtpHost || !config.smtpUser || !config.password) {
      logger.warn('邮件服务未完全配置，邮件功能将不可用');
      console.warn('邮件服务未完全配置，邮件功能将不可用', {
        smtpHost: config.smtpHost ? '已设置' : '未设置',
        smtpUser: config.smtpUser ? '已设置' : '未设置',
        password: config.password ? '已设置' : '未设置'
      });
      return false;
    }

    // 静默模式下不输出配置信息

    // 检测是否为QQ邮箱并使用简化配置
    if (config.smtpHost === 'smtp.qq.com' || config.smtpUser.includes('@qq.com')) {
      // QQ邮箱使用service方式配置
      transporter = nodemailer.createTransport({
        service: 'qq', // 使用内置的QQ邮箱配置
        auth: {
          user: config.smtpUser,
          pass: config.password // 授权码
        }
      });
      
      logger.info('使用QQ邮箱服务配置');
      // 静默模式下不输出
    } else {
      // 其他邮箱使用通用SMTP配置
      transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: config.password
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      logger.info('使用通用SMTP配置');
      console.log('使用通用SMTP配置');
    }
    
    // 验证连接配置
    try {
      await new Promise((resolve, reject) => {
        transporter.verify(function(error, success) {
          if (error) {
            logger.error(`邮件服务验证失败: ${error.message}`);
            console.error('邮件服务验证失败:', error.message);
            
            // 如果是QQ邮箱的授权码错误，提供更明确的错误信息
            if (error.message.includes('535') && (config.smtpHost === 'smtp.qq.com' || config.smtpUser.includes('@qq.com'))) {
              console.error('QQ邮箱需要使用授权码而非密码，请在QQ邮箱设置中获取授权码');
              reject(new Error('QQ邮箱需要使用授权码而非密码，请在QQ邮箱设置中获取授权码'));
            } else {
              reject(error);
            }
          } else {
            logger.info('邮件服务连接验证成功，准备发送');
            // 静默模式下不输出
            resolve(true);
          }
        });
      });
      
      logger.info('邮件服务初始化成功');
      // 静默模式下不输出
      return true;
    } catch (verifyError) {
      logger.error(`邮件服务验证失败: ${verifyError.message}`);
      console.error(`邮件服务验证失败: ${verifyError.message}`);
      throw verifyError;
    }
  } catch (error) {
    logger.error(`邮件服务初始化失败: ${error.message}`);
    console.error(`邮件服务初始化失败: ${error.message}`);
    return false;
  }
}

// 应用启动时尝试初始化邮件服务（静默模式）
(async () => {
  try {
    // 静默初始化，不输出任何信息
    await initMailer();
  } catch (error) {
    // 只在出现错误时记录到日志文件，不在控制台显示
    logger.error(`邮件服务初始化失败: ${error.message}`);
  }
})();

/**
 * 生成随机验证码
 * @param {number} length - 验证码长度，默认6位
 * @returns {string} - 生成的验证码
 */
function generateVerificationCode(length = 6) {
  // 只使用数字，避免混淆
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 发送验证码邮件
 * @param {string} to - 收件人邮箱
 * @param {string} username - 用户名
 * @param {number} expiresInMinutes - 过期时间(分钟)
 * @returns {Promise<{success: boolean, code: string}>} 是否发送成功及验证码
 */
async function sendVerificationCode(to, username, expiresInMinutes = 10) {
  try {
    // 如果邮件服务未初始化，尝试初始化
    if (!transporter) {
      const initialized = await initMailer();
      if (!initialized) {
        logger.warn('邮件服务未初始化，无法发送验证码邮件');
        return { success: false, code: null };
      }
    }
    
    // 获取最新的邮件设置
    const emailSettings = await getEmailSettings();
    
    // 生成6位数字验证码
    const verificationCode = generateVerificationCode(6);
    
    // 使用验证码邮件模板
    const htmlContent = emailTemplates.getVerificationCodeTemplate(
      username, 
      verificationCode,
      expiresInMinutes
    );
    
    // 邮件内容
    const mailOptions = {
      from: `"${emailSettings.senderName || 'Xblog'}" <${emailSettings.smtpUser}>`,
      to,
      subject: '您的注册验证码',
      html: htmlContent
    };
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    logger.info(`验证码邮件发送成功: ${info.messageId}, 验证码: ${verificationCode}`);
    return { success: true, code: verificationCode };
  } catch (error) {
    logger.error(`发送验证码邮件失败: ${error.message}`);
    return { success: false, code: null };
  }
}

/**
 * 发送密码重置验证码邮件
 * @param {string} to - 收件人邮箱
 * @param {string} username - 用户名
 * @param {number} expiresInMinutes - 过期时间(分钟)
 * @returns {Promise<{success: boolean, code: string}>} 是否发送成功及验证码
 */
async function sendPasswordResetCode(to, username, expiresInMinutes = 10) {
  try {
    // 如果邮件服务未初始化，尝试初始化
    if (!transporter) {
      const initialized = await initMailer();
      if (!initialized) {
        logger.warn('邮件服务未初始化，无法发送密码重置验证码邮件');
        return { success: false, code: null };
      }
    }
    
    // 获取最新的邮件设置
    const emailSettings = await getEmailSettings();
    
    // 生成6位数字验证码
    const resetCode = generateVerificationCode(6);
    
    // 使用密码重置验证码模板
    const htmlContent = emailTemplates.getPasswordResetCodeTemplate(
      username,
      resetCode,
      expiresInMinutes
    );
    
    // 邮件内容
    const mailOptions = {
      from: `"${emailSettings.senderName || 'Xblog'}" <${emailSettings.smtpUser}>`,
      to,
      subject: '密码重置验证码',
      html: htmlContent
    };
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    logger.info(`密码重置验证码邮件发送成功: ${info.messageId}, 验证码: ${resetCode}`);
    return { success: true, code: resetCode };
  } catch (error) {
    logger.error(`发送密码重置验证码邮件失败: ${error.message}`);
    return { success: false, code: null };
  }
}

/**
 * 发送验证邮件
 * @param {string} to - 收件人邮箱
 * @param {string} username - 用户名
 * @param {string} token - 验证令牌
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendVerificationEmail(to, username, token) {
  try {
    // 如果邮件服务未初始化，尝试初始化
    if (!transporter) {
      const initialized = await initMailer();
      if (!initialized) {
        logger.warn('邮件服务未初始化，无法发送验证邮件');
        return false;
      }
    }
    
    // 获取最新的邮件设置
    const emailSettings = await getEmailSettings();
    
    // 使用新的邮件模板
    const htmlContent = emailTemplates.getEmailVerificationTemplate(username, token);
    
    // 邮件内容
    const mailOptions = {
      from: `"${emailSettings.senderName || 'Xblog'}" <${emailSettings.smtpUser}>`,
      to,
      subject: '请验证您的邮箱',
      html: htmlContent
    };
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    logger.info(`验证邮件发送成功: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`发送验证邮件失败: ${error.message}`);
    throw error;
  }
}

/**
 * 发送密码重置邮件
 * @param {string} to - 收件人邮箱
 * @param {string} username - 用户名
 * @param {string} token - 重置令牌
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendPasswordResetEmail(to, username, token) {
  try {
    // 如果邮件服务未初始化，尝试初始化
    if (!transporter) {
      const initialized = await initMailer();
      if (!initialized) {
        logger.warn('邮件服务未初始化，无法发送密码重置邮件');
        return false;
      }
    }
    
    // 获取最新的邮件设置
    const emailSettings = await getEmailSettings();
    
    // 使用新的邮件模板
    const htmlContent = emailTemplates.getPasswordResetTemplate(username, token);
    
    // 邮件内容
    const mailOptions = {
      from: `"${emailSettings.senderName || 'Xblog'}" <${emailSettings.smtpUser}>`,
      to,
      subject: '重置您的密码',
      html: htmlContent
    };
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    logger.info(`密码重置邮件发送成功: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`发送密码重置邮件失败: ${error.message}`);
    throw error;
  }
}

/**
 * 发送通知邮件
 * @param {string} to - 收件人邮箱
 * @param {string} subject - 邮件主题
 * @param {string} content - 邮件内容
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendNotificationEmail(to, subject, content) {
  try {
    // 如果邮件服务未初始化，尝试初始化
    if (!transporter) {
      const initialized = await initMailer();
      if (!initialized) {
        logger.warn('邮件服务未初始化，无法发送通知邮件');
        return false;
      }
    }
    
    // 获取最新的邮件设置
    const emailSettings = await getEmailSettings();
    
    // 使用新的邮件模板
    const htmlContent = emailTemplates.getNotificationTemplate(subject, content);
    
    // 邮件内容
    const mailOptions = {
      from: `"${emailSettings.senderName || 'Xblog'}" <${emailSettings.smtpUser}>`,
      to,
      subject,
      html: htmlContent
    };
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    logger.info(`通知邮件发送成功: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`发送通知邮件失败: ${error.message}`);
    return false;
  }
}

/**
 * 发送评论通知邮件
 * @param {string} to - 收件人邮箱
 * @param {string} username - 用户名
 * @param {string} postTitle - 文章标题
 * @param {string} commentContent - 评论内容
 * @param {string} postUrl - 文章链接
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendCommentNotificationEmail(to, username, postTitle, commentContent, postUrl) {
  try {
    // 如果邮件服务未初始化，尝试初始化
    if (!transporter) {
      const initialized = await initMailer();
      if (!initialized) {
        logger.warn('邮件服务未初始化，无法发送评论通知邮件');
        return false;
      }
    }
    
    // 获取最新的邮件设置
    const emailSettings = await getEmailSettings();
    
    // 使用评论通知邮件模板
    const htmlContent = emailTemplates.getCommentNotificationTemplate(username, postTitle, commentContent, postUrl);
    
    // 邮件内容
    const mailOptions = {
      from: `"${emailSettings.senderName || 'Xblog'}" <${emailSettings.smtpUser}>`,
      to,
      subject: `您的文章《${postTitle}》收到了新评论`,
      html: htmlContent
    };
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    logger.info(`评论通知邮件发送成功: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`发送评论通知邮件失败: ${error.message}`);
    return false;
  }
}

/**
 * 发送欢迎新用户邮件
 * @param {string} to - 收件人邮箱
 * @param {string} username - 用户名
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendWelcomeEmail(to, username) {
  try {
    // 如果邮件服务未初始化，尝试初始化
    if (!transporter) {
      const initialized = await initMailer();
      if (!initialized) {
        logger.warn('邮件服务未初始化，无法发送欢迎邮件');
        return false;
      }
    }
    
    // 获取最新的邮件设置
    const emailSettings = await getEmailSettings();
    
    // 使用欢迎邮件模板
    const htmlContent = emailTemplates.getWelcomeTemplate(username);
    
    // 邮件内容
    const mailOptions = {
      from: `"${emailSettings.senderName || 'Xblog'}" <${emailSettings.smtpUser}>`,
      to,
      subject: `欢迎加入 ${emailSettings.senderName || 'Xblog'}！`,
      html: htmlContent
    };
    
    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    logger.info(`欢迎邮件发送成功: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`发送欢迎邮件失败: ${error.message}`);
    return false;
  }
}

module.exports = {
  initMailer,
  sendVerificationEmail,
  sendVerificationCode,
  sendPasswordResetEmail,
  sendPasswordResetCode,
  sendNotificationEmail,
  sendCommentNotificationEmail,
  sendWelcomeEmail,
  generateVerificationCode
}; 
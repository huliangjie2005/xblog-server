/**
 * 网站设置路由
 */
const express = require('express');
const router = express.Router();
const settingController = require('../../controllers/admin/settingController');
const { verifyAdmin } = require('../../middlewares/auth');
const { upload, handleUploadError } = require('../../middlewares/upload');
const { query } = require('../../config/db'); // 修正导入路径

/**
 * @swagger
 * tags:
 *   name: 网站设置
 *   description: 网站设置相关API
 */

/**
 * @swagger
 * /api/admin/settings/website:
 *   get:
 *     summary: 获取网站基本配置
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: 获取网站配置成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     siteName:
 *                       type: string
 *                     siteLogo:
 *                       type: string
 *                     recordNumber:
 *                       type: string
 */
router.get('/website', verifyAdmin, settingController.getWebsiteConfig);

/**
 * @swagger
 * /api/admin/settings/website:
 *   put:
 *     summary: 更新网站基本配置
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               siteName:
 *                 type: string
 *                 description: 网站名称
 *               siteLogo:
 *                 type: string
 *                 description: 网站Logo URL
 *               recordNumber:
 *                 type: string
 *                 description: 备案号
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: 更新网站配置成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     siteName:
 *                       type: string
 *                     siteLogo:
 *                       type: string
 *                     recordNumber:
 *                       type: string
 */
router.put('/website', verifyAdmin, settingController.updateWebsiteConfig);

/**
 * @swagger
 * /api/admin/settings/logo:
 *   post:
 *     summary: 上传网站Logo
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo图片文件
 *     responses:
 *       200:
 *         description: 上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logo上传成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     logoUrl:
 *                       type: string
 *                     originalFilename:
 *                       type: string
 *                     fileSize:
 *                       type: number
 */
router.post('/logo', verifyAdmin, upload.single('logo'), handleUploadError, settingController.uploadSiteLogo);

/**
 * @swagger
 * /api/admin/settings/all:
 *   get:
 *     summary: 获取所有系统设置
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: 获取系统设置成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     website:
 *                       type: object
 *                     ai:
 *                       type: object
 */
router.get('/all', verifyAdmin, settingController.getAllSettings);

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: 获取所有系统设置（别名）
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/', verifyAdmin, settingController.getAllSettings);

/**
 * @swagger
 * /api/admin/settings/comment-moderation:
 *   get:
 *     summary: 获取评论审核设置
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: 获取评论审核设置成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                       description: 是否启用AI审核
 *                     threshold:
 *                       type: number
 *                       description: 安全阈值(0-1)
 *                     autoApprove:
 *                       type: boolean
 *                       description: 通过审核后是否自动批准
 */
router.get('/comment-moderation', verifyAdmin, async (req, res) => {
  try {
    const [settings] = await query(
      `SELECT setting_value FROM settings WHERE setting_key = 'commentModeration'`
    );
    
    let config = {
      enabled: false,
      threshold: 0.7,
      autoApprove: false
    };
    
    if (settings && settings.setting_value) {
      try {
        const parsed = JSON.parse(settings.setting_value);
        config = {
          ...config,
          ...parsed
        };
      } catch (e) {
        console.error('解析评论审核设置失败:', e);
      }
    }
    
    return res.json({
      status: 'success',
      message: '获取评论审核设置成功',
      data: config
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '获取评论审核设置失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/settings/comment-moderation:
 *   put:
 *     summary: 更新评论审核设置
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: 是否启用AI审核
 *               threshold:
 *                 type: number
 *                 description: 安全阈值(0-1)
 *               autoApprove:
 *                 type: boolean
 *                 description: 通过审核后是否自动批准
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/comment-moderation', verifyAdmin, async (req, res) => {
  try {
    const { enabled, threshold, autoApprove } = req.body;
    
    // 验证参数
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'enabled必须是布尔值'
      });
    }
    
    if (threshold !== undefined && (typeof threshold !== 'number' || threshold < 0 || threshold > 1)) {
      return res.status(400).json({
        status: 'error',
        message: 'threshold必须是0-1之间的数字'
      });
    }
    
    if (typeof autoApprove !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'autoApprove必须是布尔值'
      });
    }
    
    // 需要保存的配置
    const config = {
      enabled,
      threshold: threshold || 0.7,
      autoApprove
    };
    
    // 更新或创建设置
    await query(
      `INSERT INTO settings (setting_key, setting_value) 
       VALUES ('commentModeration', ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [JSON.stringify(config), JSON.stringify(config)]
    );
    
    return res.json({
      status: 'success',
      message: '更新评论审核设置成功',
      data: config
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '更新评论审核设置失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/settings/email:
 *   get:
 *     summary: 获取邮件设置
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: 获取邮件设置成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     smtpHost:
 *                       type: string
 *                     smtpPort:
 *                       type: number
 *                     smtpSecure:
 *                       type: boolean
 *                     smtpUser:
 *                       type: string
 *                     senderName:
 *                       type: string
 */
router.get('/email', verifyAdmin, async (req, res) => {
  try {
    const [settings] = await query(
      `SELECT setting_value FROM settings WHERE setting_key = 'emailSettings'`
    );
    
    let config = {
      smtpHost: '',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: '',
      senderName: ''
    };
    
    if (settings && settings.setting_value) {
      try {
        const parsed = JSON.parse(settings.setting_value);
        config = {
          ...config,
          ...parsed
        };
      } catch (e) {
        console.error('解析邮件设置失败:', e);
      }
    }
    
    return res.json({
      status: 'success',
      message: '获取邮件设置成功',
      data: config
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '获取邮件设置失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/settings/email-password:
 *   get:
 *     summary: 获取邮件授权码/密码
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: 获取邮件授权码成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     password:
 *                       type: string
 */
router.get('/email-password', verifyAdmin, async (req, res) => {
  try {
    const [emailPassword] = await query(
      `SELECT setting_value FROM settings WHERE setting_key = 'emailPassword'`
    );
    
    let password = '';
    
    if (emailPassword && emailPassword.setting_value) {
      password = emailPassword.setting_value;
    }
    
    return res.json({
      status: 'success',
      message: '获取邮件授权码成功',
      data: {
        password
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '获取邮件授权码失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/settings/email:
 *   put:
 *     summary: 更新邮件设置
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               smtpHost:
 *                 type: string
 *                 description: SMTP服务器地址
 *               smtpPort:
 *                 type: number
 *                 description: SMTP服务器端口
 *               smtpSecure:
 *                 type: boolean
 *                 description: 是否启用SSL/TLS
 *               smtpUser:
 *                 type: string
 *                 description: 发件人邮箱
 *               senderName:
 *                 type: string
 *                 description: 发件人名称
 *               password:
 *                 type: string
 *                 description: 邮箱密码或授权码(可选)
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/email', verifyAdmin, async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, senderName, password } = req.body;
    
    // 验证参数
    if (!smtpHost || !smtpPort || smtpSecure === undefined || !smtpUser) {
      return res.status(400).json({
        status: 'error',
        message: '请提供所有必要的邮件设置参数'
      });
    }
    
    // 需要保存的配置
    const config = {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      senderName: senderName || ''
    };
    
    // 如果提供了密码，则加密保存
    if (password) {
      // 在实际应用中，应该使用更安全的方式存储密码，如加密
      // 这里仅作示例，实际应用中应该使用专门的密码管理服务
      await query(
        `INSERT INTO settings (setting_key, setting_value) 
         VALUES ('emailPassword', ?)
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [password, password]
      );
    }
    
    // 更新或创建邮件设置
    await query(
      `INSERT INTO settings (setting_key, setting_value) 
       VALUES ('emailSettings', ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [JSON.stringify(config), JSON.stringify(config)]
    );
    
    return res.json({
      status: 'success',
      message: '更新邮件设置成功',
      data: config
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '更新邮件设置失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/settings/test-email:
 *   post:
 *     summary: 发送测试邮件
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               smtpHost:
 *                 type: string
 *                 description: SMTP服务器地址
 *               smtpPort:
 *                 type: number
 *                 description: SMTP服务器端口
 *               smtpSecure:
 *                 type: boolean
 *                 description: 是否启用SSL/TLS
 *               smtpUser:
 *                 type: string
 *                 description: 发件人邮箱
 *               senderName:
 *                 type: string
 *                 description: 发件人名称
 *               password:
 *                 type: string
 *                 description: 邮箱密码或授权码
 *               toEmail:
 *                 type: string
 *                 description: 收件人邮箱
 *     responses:
 *       200:
 *         description: 发送成功
 */
router.post('/test-email', verifyAdmin, async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, senderName, password, toEmail } = req.body;
    
    // 验证参数
    if (!smtpHost || !smtpPort || smtpSecure === undefined || !smtpUser || !password || !toEmail) {
      return res.status(400).json({
        status: 'error',
        message: '请提供所有必要的邮件测试参数'
      });
    }
    
    // 使用nodemailer发送测试邮件
    const nodemailer = require('nodemailer');
    
    let transporter;
    
    // 检测是否为QQ邮箱并使用简化配置
    if (smtpHost === 'smtp.qq.com' || smtpUser.includes('@qq.com')) {
      // QQ邮箱使用service方式配置
      transporter = nodemailer.createTransport({
        service: 'qq', // 使用内置的QQ邮箱配置
        auth: {
          user: smtpUser,
          pass: password // 授权码
        }
      });
      
      console.log('使用QQ邮箱服务配置进行测试');
    } else {
      // 其他邮箱使用通用SMTP配置
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: password
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
    
    // 发送测试邮件
    const info = await transporter.sendMail({
      from: senderName ? `"${senderName}" <${smtpUser}>` : smtpUser,
      to: toEmail,
      subject: 'XBlog邮件服务测试',
      text: '这是一封测试邮件，用于验证XBlog系统的邮件发送功能是否正常。如果您收到此邮件，说明邮件服务配置正确。',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">XBlog邮件服务测试</h2>
          <p>这是一封测试邮件，用于验证XBlog系统的邮件发送功能是否正常。</p>
          <p>如果您收到此邮件，说明邮件服务配置正确。</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>发送时间: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    });
    
    return res.json({
      status: 'success',
      message: '测试邮件发送成功',
      data: {
        success: true,
        message: '测试邮件已发送',
        sentInfo: {
          from: senderName ? `${senderName} <${smtpUser}>` : smtpUser,
          to: toEmail,
          subject: 'XBlog邮件服务测试',
          sentAt: new Date().toLocaleString(),
          messageId: info.messageId
        }
      }
    });
  } catch (error) {
    console.error('发送测试邮件失败:', error);
    
    // 不返回500状态码，而是返回200状态码但带有错误信息
    // 这样前端可以正确处理错误信息而不会触发HTTP错误
    return res.json({
      status: 'error',
      message: '发送测试邮件失败',
      data: {
        success: false,
        message: error.message || '未知错误',
        errorDetail: error.message.includes('535') ? 
          'QQ邮箱需要使用授权码而非密码，请在QQ邮箱设置中获取授权码' : 
          error.message
      }
    });
  }
});

/**
 * @swagger
 * /api/admin/settings/reinitialize-mail:
 *   post:
 *     summary: 重新初始化邮件服务
 *     tags: [网站设置]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 初始化成功
 */
router.post('/reinitialize-mail', verifyAdmin, async (req, res) => {
  try {
    const mailer = require('../../utils/mailer');
    const initialized = await mailer.initMailer();
    
    if (initialized) {
      return res.json({
        success: true,
        message: '邮件服务重新初始化成功',
        data: { initialized }
      });
    } else {
      return res.json({
        success: false,
        message: '邮件服务初始化失败，请检查配置',
        data: { initialized }
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '邮件服务初始化失败',
      error: error.message
    });
  }
});

module.exports = router; 
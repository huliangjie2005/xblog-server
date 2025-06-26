/**
 * 网站设置控制器
 */
const settingService = require('../../services/settingService');
const { responseSuccess, responseError } = require('../../utils/response');
const { logger } = require('../../utils/logger');
const { upload } = require('../../middlewares/upload');

/**
 * 获取网站基本设置
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
const getWebsiteConfig = async (req, res) => {
  try {
    logger.info('正在获取网站基本配置');
    
    const config = await settingService.getWebsiteConfig();
    
    return responseSuccess(res, '获取网站配置成功', config);
  } catch (error) {
    logger.error('获取网站配置失败:', error.message);
    return responseError(res, '获取网站配置失败', 500);
  }
};

/**
 * 更新网站基本设置
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
const updateWebsiteConfig = async (req, res) => {
  try {
    logger.info('正在更新网站基本配置');
    logger.info('请求体:', JSON.stringify(req.body));
    
    const { siteName, siteLogo, recordNumber, siteDescription, siteKeywords, allowRegister, commentAudit, defaultLanguage, timeZone } = req.body;
    
    // 验证至少有一个设置项
    if (siteName === undefined && siteLogo === undefined && recordNumber === undefined &&
        siteDescription === undefined && siteKeywords === undefined && allowRegister === undefined &&
        commentAudit === undefined && defaultLanguage === undefined && timeZone === undefined) {
      return responseError(res, '至少需要提供一个设置项', 400);
    }
    
    // 调用服务层更新设置
    const config = {
      siteName,
      siteLogo,
      recordNumber,
      siteDescription,
      siteKeywords,
      allowRegister,
      commentAudit,
      defaultLanguage,
      timeZone
    };
    
    // 过滤掉undefined的属性
    Object.keys(config).forEach(key => config[key] === undefined && delete config[key]);
    
    logger.info('将要更新的配置:', JSON.stringify(config));
    await settingService.updateWebsiteConfig(config);
    
    // 获取更新后的配置
    const updatedConfig = await settingService.getWebsiteConfig();
    logger.info('更新后的配置:', JSON.stringify(updatedConfig));
    
    return responseSuccess(res, '更新网站配置成功', updatedConfig);
  } catch (error) {
    logger.error('更新网站配置失败:', error.message);
    return responseError(res, '更新网站配置失败: ' + error.message, 500);
  }
};

/**
 * 上传网站Logo
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
const uploadSiteLogo = async (req, res) => {
  try {
    logger.info('正在上传网站Logo');
    
    if (!req.file) {
      return responseError(res, '未找到上传的文件', 400);
    }
    
    // 构建Logo URL - 使用/uploads路径
    const logoUrl = `/uploads/${req.file.filename}`;
    
    // 更新设置中的Logo URL
    await settingService.setSetting('site_logo', logoUrl);
    
    return responseSuccess(res, 'Logo上传成功', {
      logoUrl,
      originalFilename: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    logger.error('上传Logo失败:', error.message);
    return responseError(res, '上传Logo失败: ' + error.message, 500);
  }
};

/**
 * 获取所有设置项
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 */
const getAllSettings = async (req, res) => {
  try {
    logger.info('正在获取所有系统设置');
    
    // 获取网站基本配置
    const websiteConfig = await settingService.getWebsiteConfig();
    
    // 获取AI配置（如果有权限）
    let aiConfig = null;
    if (req.user && (req.user.role === 'superadmin' || req.user.role === 'admin')) {
      aiConfig = await settingService.getAIConfig();
      
      // 安全处理：不返回完整的API密钥
      if (aiConfig && aiConfig.apiKey) {
        aiConfig.apiKey = `${aiConfig.apiKey.substring(0, 8)}*****`;
      }
    }
    
    return responseSuccess(res, '获取系统设置成功', {
      website: websiteConfig,
      ai: aiConfig
    });
  } catch (error) {
    logger.error('获取系统设置失败:', error.message);
    return responseError(res, '获取系统设置失败', 500);
  }
};

module.exports = {
  getWebsiteConfig,
  updateWebsiteConfig,
  uploadSiteLogo,
  getAllSettings
}; 
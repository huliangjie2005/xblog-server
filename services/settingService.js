/**
 * 系统设置服务
 * 用于管理系统配置信息
 */

const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');
const { query } = require('../config/db');

/**
 * 获取AI配置
 * @returns {Promise<Object>} - AI配置信息
 */
const getAIConfig = async () => {
  try {
    const sql = `
      SELECT *
      FROM ai_config
      WHERE id = 1
      LIMIT 1
    `;
    
    const result = await query(sql, []);
    
    if (result.length === 0) {
      return null;
    }
    
    return {
      provider: result[0].provider,
      apiKey: result[0].api_key,
      baseUrl: result[0].base_url || '',
      model: result[0].model,
      temperature: result[0].temperature || 0.7,
      maxTokens: result[0].max_tokens || 2000,
      enableSummary: Boolean(result[0].enable_summary),
      enableSEOSuggestion: Boolean(result[0].enable_seo_suggestion),
      enableWritingHelp: Boolean(result[0].enable_writing_help),
      enabled: Boolean(result[0].enabled)
    };
  } catch (error) {
    logger.error(`获取AI配置失败: ${error.message}`);
    throw new Error(`获取AI配置失败: ${error.message}`);
  }
};

/**
 * 更新AI配置
 * @param {Object} config - AI配置信息
 * @param {string} config.provider - 服务提供商
 * @param {string} config.apiKey - API密钥
 * @param {string} config.baseUrl - API基础URL
 * @param {string} config.model - 模型名称
 * @param {number} config.temperature - 温度参数
 * @param {number} config.maxTokens - 最大令牌数
 * @param {boolean} config.enableSummary - 是否启用摘要生成
 * @param {boolean} config.enableSEOSuggestion - 是否启用SEO建议
 * @param {boolean} config.enableWritingHelp - 是否启用写作辅助
 * @param {boolean} config.enabled - 是否启用
 * @returns {Promise<boolean>} - 更新结果
 */
const updateAIConfig = async (config) => {
  try {
    const { 
      provider, 
      apiKey, 
      baseUrl = '',
      model, 
      temperature = 0.7,
      maxTokens = 2000,
      enableSummary = true,
      enableSEOSuggestion = true,
      enableWritingHelp = true,
      enabled = true 
    } = config;
    
    // 首先检查是否存在记录
    const checkSql = `SELECT COUNT(*) as count FROM ai_config`;
    const checkResult = await query(checkSql, []);
    const recordExists = checkResult[0].count > 0;
    
    let sql;
    let params;
    
    if (recordExists) {
      // 如果记录已存在，使用UPDATE
      sql = `
        UPDATE ai_config
        SET provider = ?,
            api_key = ?,
            base_url = ?,
            model = ?,
            temperature = ?,
            max_tokens = ?,
            enable_summary = ?,
            enable_seo_suggestion = ?,
            enable_writing_help = ?,
            enabled = ?,
            updated_at = NOW()
        WHERE id = 1
      `;
      params = [
        provider, 
        apiKey, 
        baseUrl,
        model, 
        temperature,
        maxTokens,
        enableSummary ? 1 : 0,
        enableSEOSuggestion ? 1 : 0,
        enableWritingHelp ? 1 : 0,
        enabled ? 1 : 0
      ];
    } else {
      // 如果记录不存在，使用INSERT
      sql = `
        INSERT INTO ai_config (
          id, provider, api_key, base_url, model, temperature, max_tokens, 
          enable_summary, enable_seo_suggestion, enable_writing_help, enabled, 
          created_at, updated_at
        )
        VALUES (
          1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
        )
      `;
      params = [
        provider, 
        apiKey, 
        baseUrl,
        model, 
        temperature,
        maxTokens,
        enableSummary ? 1 : 0,
        enableSEOSuggestion ? 1 : 0,
        enableWritingHelp ? 1 : 0,
        enabled ? 1 : 0
      ];
    }
    
    await query(sql, params);
    logger.info(`AI配置已${recordExists ? '更新' : '创建'}`);
    
    return true;
  } catch (error) {
    logger.error(`更新AI配置失败: ${error.message}`);
    throw new Error(`更新AI配置失败: ${error.message}`);
  }
};

/**
 * 获取系统设置
 * @returns {Promise<Object>} - 系统设置信息
 */
const getSystemSettings = async () => {
  try {
    const sql = `
      SELECT *
      FROM system_settings
      WHERE id = 1
      LIMIT 1
    `;
    
    const result = await query(sql, []);
    
    if (result.length === 0) {
      return null;
    }
    
    // 处理JSON字段
    let ossConfig = {};
    let socialLinks = {};
    
    try {
      ossConfig = result[0].oss_config ? JSON.parse(result[0].oss_config) : {};
    } catch (e) {
      logger.error(`解析OSS配置失败: ${e.message}`);
    }
    
    try {
      socialLinks = result[0].social_links ? JSON.parse(result[0].social_links) : {};
    } catch (e) {
      logger.error(`解析社交链接失败: ${e.message}`);
    }
    
    return {
      siteName: result[0].site_name,
      siteDescription: result[0].site_description,
      contactEmail: result[0].contact_email,
      recordNumber: result[0].record_number,
      storageType: result[0].storage_type,
      ossConfig,
      socialLinks
    };
  } catch (error) {
    logger.error(`获取系统设置失败: ${error.message}`);
    throw new Error(`获取系统设置失败: ${error.message}`);
  }
};

/**
 * 更新系统设置
 * @param {Object} settings - 系统设置信息
 * @returns {Promise<boolean>} - 更新结果
 */
const updateSystemSettings = async (settings) => {
  try {
    const {
      siteName,
      siteDescription,
      contactEmail,
      recordNumber,
      storageType,
      ossConfig,
      socialLinks
    } = settings;
    
    const sql = `
      UPDATE system_settings
      SET site_name = ?,
          site_description = ?,
          contact_email = ?,
          record_number = ?,
          storage_type = ?,
          oss_config = ?,
          social_links = ?,
          updated_at = NOW()
      WHERE id = 1
    `;
    
    await query(sql, [
      siteName,
      siteDescription,
      contactEmail,
      recordNumber,
      storageType,
      JSON.stringify(ossConfig || {}),
      JSON.stringify(socialLinks || {})
    ]);
    
    return true;
  } catch (error) {
    logger.error(`更新系统设置失败: ${error.message}`);
    throw new Error(`更新系统设置失败: ${error.message}`);
  }
};

/**
 * 获取网站基本配置
 * @returns {Promise<Object>} - 网站基本配置信息
 */
const getWebsiteConfig = async () => {
  try {
    // 获取网站名称设置
    const siteName = await getSetting('site_name') || 'XBlog';
    
    // 获取网站logo设置
    const siteLogo = await getSetting('site_logo') || '';
    
    // 获取备案号设置
    const recordNumber = await getSetting('record_number') || '';
    
    // 获取网站描述
    const siteDescription = await getSetting('site_description') || '';
    
    // 获取网站关键词
    const siteKeywords = await getSetting('site_keywords') || '';
    
    // 获取网站图标
    const siteIcon = await getSetting('site_icon') || '';
    
    // 获取是否允许注册
    const allowRegisterStr = await getSetting('allow_register');
    const allowRegister = allowRegisterStr === null ? true : allowRegisterStr === 'true' || allowRegisterStr === '1';
    
    // 获取是否需要评论审核
    const commentAuditStr = await getSetting('comment_audit');
    const commentAudit = commentAuditStr === null ? true : commentAuditStr === 'true' || commentAuditStr === '1';
    
    // 获取默认语言
    const defaultLanguage = await getSetting('default_language') || 'zh-CN';
    
    // 获取时区设置
    const timeZone = await getSetting('time_zone') || 'Asia/Shanghai';
    
    return {
      siteName,
      siteLogo,
      recordNumber,
      siteDescription,
      siteKeywords,
      siteIcon,
      allowRegister,
      commentAudit,
      defaultLanguage,
      timeZone
    };
  } catch (error) {
    logger.error(`获取网站配置失败: ${error.message}`);
    throw new Error(`获取网站配置失败: ${error.message}`);
  }
};

/**
 * 更新网站基本配置
 * @param {Object} config - 网站配置信息
 * @param {string} [config.siteName] - 网站名称
 * @param {string} [config.siteLogo] - 网站Logo URL
 * @param {string} [config.recordNumber] - 备案号
 * @param {string} [config.siteDescription] - 网站描述
 * @param {string} [config.siteKeywords] - 网站关键词
 * @param {string} [config.siteIcon] - 网站图标
 * @param {boolean} [config.allowRegister] - 是否允许注册
 * @param {boolean} [config.commentAudit] - 是否需要评论审核
 * @param {string} [config.defaultLanguage] - 默认语言
 * @param {string} [config.timeZone] - 时区设置
 * @returns {Promise<boolean>} - 更新结果
 */
const updateWebsiteConfig = async (config) => {
  try {
    const { 
      siteName, 
      siteLogo, 
      recordNumber, 
      siteDescription, 
      siteKeywords, 
      siteIcon,
      allowRegister,
      commentAudit,
      defaultLanguage,
      timeZone
    } = config;
    
    // 更新各个设置项
    if (siteName !== undefined) {
      await setSetting('site_name', siteName);
    }
    
    if (siteLogo !== undefined) {
      await setSetting('site_logo', siteLogo);
    }
    
    if (recordNumber !== undefined) {
      await setSetting('record_number', recordNumber);
    }
    
    if (siteDescription !== undefined) {
      await setSetting('site_description', siteDescription);
    }
    
    if (siteKeywords !== undefined) {
      await setSetting('site_keywords', siteKeywords);
    }
    
    if (siteIcon !== undefined) {
      await setSetting('site_icon', siteIcon);
    }
    
    if (allowRegister !== undefined) {
      await setSetting('allow_register', allowRegister.toString());
    }
    
    if (commentAudit !== undefined) {
      await setSetting('comment_audit', commentAudit.toString());
    }
    
    if (defaultLanguage !== undefined) {
      await setSetting('default_language', defaultLanguage);
    }
    
    if (timeZone !== undefined) {
      await setSetting('time_zone', timeZone);
    }
    
    logger.info('网站基本配置已更新');
    return true;
  } catch (error) {
    logger.error(`更新网站配置失败: ${error.message}`);
    throw new Error(`更新网站配置失败: ${error.message}`);
  }
};

/**
 * 获取单个设置项
 * @param {string} key - 设置键名
 * @returns {Promise<string|null>} - 设置值
 */
const getSetting = async (key) => {
  try {
    const sql = `
      SELECT setting_value
      FROM settings
      WHERE setting_key = ?
      LIMIT 1
    `;
    
    const result = await query(sql, [key]);
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0].setting_value;
  } catch (error) {
    logger.error(`获取设置项[${key}]失败: ${error.message}`);
    throw new Error(`获取设置项失败: ${error.message}`);
  }
};

/**
 * 设置单个设置项
 * @param {string} key - 设置键名
 * @param {string} value - 设置值
 * @returns {Promise<boolean>} - 设置结果
 */
const setSetting = async (key, value) => {
  try {
    // 检查设置项是否存在
    const existingSetting = await getSetting(key);
    
    let sql;
    let params;
    
    if (existingSetting !== null) {
      // 如果存在，则更新
      sql = `
        UPDATE settings
        SET setting_value = ?, updated_at = NOW()
        WHERE setting_key = ?
      `;
      params = [value, key];
    } else {
      // 如果不存在，则插入
      sql = `
        INSERT INTO settings (setting_key, setting_value, created_at, updated_at)
        VALUES (?, ?, NOW(), NOW())
      `;
      params = [key, value];
    }
    
    await query(sql, params);
    return true;
  } catch (error) {
    logger.error(`设置项[${key}]更新失败: ${error.message}`);
    throw new Error(`设置项更新失败: ${error.message}`);
  }
};

module.exports = {
  getAIConfig,
  updateAIConfig,
  getSystemSettings,
  updateSystemSettings,
  getWebsiteConfig,
  updateWebsiteConfig,
  getSetting,
  setSetting
}; 
/**
 * AI服务抽象接口
 * 支持多种AI服务商，如OpenAI、deepseek、通义等
 */

const axios = require('axios');
const { logger } = require('../utils/logger');
const { getAIConfig } = require('./settingService');
const crypto = require('crypto');
const aiPerformanceMonitor = require('../utils/aiPerformanceMonitor');
const aiTimeoutConfig = require('../config/aiTimeout');

// 简单的内存缓存
const aiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * AI服务抽象基类
 */
class AIService {
  /**
   * 生成文章摘要
   * @param {string} content - 文章内容
   * @param {string} template - 摘要生成模板
   * @returns {Promise<string>} - 生成的摘要
   */
  async generateSummary(content, template) {
    throw new Error('未实现的方法');
  }

  /**
   * 生成写作建议
   * @param {string} content - 已有内容
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} - 写作建议
   */
  async generateWritingSuggestion(content, prompt) {
    throw new Error('未实现的方法');
  }
  
  /**
   * 生成文本完成
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} - 生成的文本
   */
  async generateCompletion(prompt) {
    throw new Error('未实现的方法');
  }
}

/**
 * OpenAI服务实现
 */
class OpenAIService extends AIService {
  /**
   * 构造函数
   * @param {Object} config - 配置信息
   * @param {string} config.apiKey - OpenAI API密钥
   * @param {string} config.model - 使用的模型，默认为gpt-3.5-turbo
   */
  constructor(config) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
    this.provider = 'openai';
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.client = axios.create({
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 生成文章摘要
   * @param {string} content - 文章内容
   * @param {string} template - 摘要生成模板
   * @returns {Promise<string>} - 生成的摘要
   */
  async generateSummary(content, template) {
    try {
      const prompt = template.replace('{content}', content);
      return await this.generateCompletion(prompt);
    } catch (error) {
      logger.error(`OpenAI生成摘要失败: ${error.message}`);
      throw new Error(`生成摘要失败: ${error.message}`);
    }
  }

  /**
   * 生成写作建议
   * @param {string} content - 已有内容
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} - 写作建议
   */
  async generateWritingSuggestion(content, prompt) {
    try {
      const finalPrompt = prompt.replace('{content}', content);
      return await this.generateCompletion(finalPrompt);
    } catch (error) {
      logger.error(`OpenAI生成写作建议失败: ${error.message}`);
      throw new Error(`生成写作建议失败: ${error.message}`);
    }
  }
  
  /**
   * 生成文本完成
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} - 生成的文本
   */
  async generateCompletion(prompt) {
    try {
      const response = await this.client.post(this.apiUrl, {
        model: this.model,
        messages: [
          { role: 'system', content: '你是一个文章创作助手，擅长总结内容和提供写作建议。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000 // 增加token数量，确保完整的AI回复
      }, { timeout: 10000 }); // 添加10秒超时
      
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content.trim();
      } else {
        throw new Error('API返回的数据格式不正确');
      }
    } catch (error) {
      logger.error(`OpenAI API调用失败: ${error.message}`);
      if (error.response) {
        logger.error(`API错误状态码: ${error.response.status}, 错误信息: ${JSON.stringify(error.response.data)}`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('OpenAI API请求超时，请检查网络连接或稍后再试');
      }
      throw new Error(`OpenAI API调用失败: ${error.message}`);
    }
  }
}

/**
 * 百度文心一言服务实现
 */
class BaiduService extends AIService {
  /**
   * 构造函数
   * @param {Object} config - 配置信息
   * @param {string} config.apiKey - API密钥
   * @param {string} config.secretKey - 密钥
   * @param {string} config.model - 使用的模型，默认为ERNIE-Bot-4
   */
  constructor(config) {
    super();
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.model = config.model || 'ERNIE-Bot-4';
    this.provider = 'baidu';
    this.apiUrl = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${this.model}`;
    this.tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token';
    this.accessToken = null;
    this.tokenExpireTime = 0;
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 获取访问令牌
   * @returns {Promise<string>} - 访问令牌
   * @private
   */
  async getAccessToken() {
    try {
      // 如果令牌有效期还剩10分钟以上，直接返回
      if (this.accessToken && this.tokenExpireTime > Date.now() + 600000) {
        return this.accessToken;
      }
      
      const response = await axios.post(this.tokenUrl, null, {
        params: {
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.secretKey
        }
      });
      
      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // 设置令牌过期时间（30天后）
        this.tokenExpireTime = Date.now() + (response.data.expires_in * 1000);
        return this.accessToken;
      } else {
        throw new Error('无法获取百度AI访问令牌');
      }
    } catch (error) {
      logger.error(`获取百度AI访问令牌失败: ${error.message}`);
      throw new Error(`获取百度AI访问令牌失败: ${error.message}`);
    }
  }

  /**
   * 生成文章摘要
   * @param {string} content - 文章内容
   * @param {string} template - 摘要生成模板
   * @returns {Promise<string>} - 生成的摘要
   */
  async generateSummary(content, template) {
    try {
      const prompt = template.replace('{content}', content);
      return await this.generateCompletion(prompt);
    } catch (error) {
      logger.error(`百度文心一言生成摘要失败: ${error.message}`);
      throw new Error(`生成摘要失败: ${error.message}`);
    }
  }

  /**
   * 生成写作建议
   * @param {string} content - 已有内容
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} - 写作建议
   */
  async generateWritingSuggestion(content, prompt) {
    try {
      const finalPrompt = prompt.replace('{content}', content);
      return await this.generateCompletion(finalPrompt);
    } catch (error) {
      logger.error(`百度文心一言生成写作建议失败: ${error.message}`);
      throw new Error(`生成写作建议失败: ${error.message}`);
    }
  }
  
  /**
   * 生成文本完成
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} - 生成的文本
   */
  async generateCompletion(prompt) {
    try {
      const token = await this.getAccessToken();
      const url = `${this.apiUrl}?access_token=${token}`;
      
      const response = await this.client.post(url, {
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        top_p: 0.8
      });
      
      if (response.data && response.data.result) {
        return response.data.result;
      } else {
        throw new Error('API返回的数据格式不正确');
      }
    } catch (error) {
      logger.error(`百度文心一言API调用失败: ${error.message}`);
      if (error.response) {
        logger.error(`API错误状态码: ${error.response.status}, 错误信息: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`百度文心一言API调用失败: ${error.message}`);
    }
  }
}

/**
 * 阿里通义千问服务实现
 */
class AliService extends AIService {
  /**
   * 构造函数
   * @param {Object} config - 配置信息
   * @param {string} config.apiKey - API密钥
   * @param {string} config.model - 使用的模型，默认为qwen-plus
   */
  constructor(config) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'qwen-plus';
    this.provider = 'ali';
    this.apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    this.client = axios.create({
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 生成文章摘要
   * @param {string} content - 文章内容
   * @param {string} template - 摘要生成模板
   * @returns {Promise<string>} - 生成的摘要
   */
  async generateSummary(content, template) {
    try {
      const prompt = template.replace('{content}', content);
      return await this.generateCompletion(prompt);
    } catch (error) {
      logger.error(`阿里通义千问生成摘要失败: ${error.message}`);
      throw new Error(`生成摘要失败: ${error.message}`);
    }
  }

  /**
   * 生成写作建议
   * @param {string} content - 已有内容
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} - 写作建议
   */
  async generateWritingSuggestion(content, prompt) {
    try {
      const finalPrompt = prompt.replace('{content}', content);
      return await this.generateCompletion(finalPrompt);
    } catch (error) {
      logger.error(`阿里通义千问生成写作建议失败: ${error.message}`);
      throw new Error(`生成写作建议失败: ${error.message}`);
    }
  }
  
  /**
   * 生成文本完成
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} - 生成的文本
   */
  async generateCompletion(prompt) {
    try {
      const response = await this.client.post(this.apiUrl, {
        model: this.model,
        input: {
          messages: [
            { role: 'system', content: '你是一个文章创作助手，擅长总结内容和提供写作建议。' },
            { role: 'user', content: prompt }
          ]
        },
        parameters: {
          temperature: 0.7,
          top_p: 0.8,
          max_tokens: 800
        }
      });
      
      if (response.data && response.data.output && response.data.output.text) {
        return response.data.output.text.trim();
      } else {
        throw new Error('API返回的数据格式不正确');
      }
    } catch (error) {
      logger.error(`阿里通义千问API调用失败: ${error.message}`);
      if (error.response) {
        logger.error(`API错误状态码: ${error.response.status}, 错误信息: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`阿里通义千问API调用失败: ${error.message}`);
    }
  }
}

/**
 * DeepSeek AI服务实现
 */
class DeepSeekService extends AIService {
  /**
   * 构造函数
   * @param {Object} config - 配置信息
   * @param {string} config.apiKey - DeepSeek API密钥
   * @param {string} config.model - 使用的模型，默认为deepseek-chat
   */
  constructor(config) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-chat';
    this.provider = 'deepseek';
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    this.client = axios.create({
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 生成文章摘要
   * @param {string} content - 文章内容
   * @param {string} template - 摘要生成模板
   * @returns {Promise<string>} - 生成的摘要
   */
  async generateSummary(content, template) {
    try {
      const prompt = template.replace('{content}', content);
      return await this.generateCompletion(prompt);
    } catch (error) {
      logger.error(`DeepSeek生成摘要失败: ${error.message}`);
      throw new Error(`生成摘要失败: ${error.message}`);
    }
  }

  /**
   * 生成写作建议
   * @param {string} content - 已有内容
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} - 写作建议
   */
  async generateWritingSuggestion(content, prompt) {
    try {
      const finalPrompt = prompt.replace('{content}', content);
      return await this.generateCompletion(finalPrompt);
    } catch (error) {
      logger.error(`DeepSeek生成写作建议失败: ${error.message}`);
      throw new Error(`生成写作建议失败: ${error.message}`);
    }
  }
  
  /**
   * 生成文本完成
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} - 生成的文本
   */
  async generateCompletion(prompt) {
    // 开始性能监控
    const requestInfo = aiPerformanceMonitor.startRequest();

    try {
      // 检查API密钥格式
      if (!this.apiKey || !this.apiKey.startsWith('sk-')) {
        throw new Error('DeepSeek API密钥格式不正确，应以sk-开头');
      }

      // 生成缓存键
      const cacheKey = crypto.createHash('md5').update(`${this.model}:${prompt}`).digest('hex');

      // 检查缓存
      const cached = aiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        logger.info(`使用缓存的AI响应，缓存键: ${cacheKey}`);
        aiPerformanceMonitor.endRequest(requestInfo, true, true);
        return cached.result;
      }

      // 记录API请求信息，便于调试
      logger.info(`正在调用DeepSeek API，模型: ${this.model}, 缓存键: ${cacheKey}`);
      
      // 性能优化：减少token数量以提升响应速度
      const response = await this.client.post(this.apiUrl, {
        model: this.model,
        messages: [
          { role: 'system', content: '你是一个专业的文章创作助手。请严格按照Markdown格式输出内容，保持原有的格式结构（如标题、列表、粗体、斜体等）。输出时不要添加额外的说明文字，直接返回处理后的内容。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // 降低温度以提升响应速度和一致性
        max_tokens: 500, // 减少token数量以提升响应速度
        stream: false // 确保不使用流式响应
      }, {
        timeout: 45000, // 增加超时时间到45秒，适应AI服务的响应时间
        headers: {
          'Connection': 'keep-alive', // 保持连接以提升后续请求速度
          'Accept': 'application/json',
          'User-Agent': 'XBlog-AI-Assistant/1.0'
        }
      });
      
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const result = response.data.choices[0].message.content.trim();

        // 缓存结果
        aiCache.set(cacheKey, {
          result: result,
          timestamp: Date.now()
        });

        // 清理过期缓存
        this.cleanExpiredCache();

        // 记录成功的性能数据
        aiPerformanceMonitor.endRequest(requestInfo, true, false);

        return result;
      } else {
        throw new Error('API返回的数据格式不正确');
      }
    } catch (error) {
      logger.error(`DeepSeek API调用失败: ${error.message}`);
      
      // 提供更详细的错误信息
      if (error.response) {
        const statusCode = error.response.status;
        const responseData = JSON.stringify(error.response.data);
        logger.error(`API错误状态码: ${statusCode}, 错误信息: ${responseData}`);
        
        // 处理特定错误码
        if (statusCode === 401) {
          throw new Error(`DeepSeek API认证失败: API密钥无效或已过期。请检查您的密钥或在DeepSeek官网获取新的API密钥。原始错误: ${responseData}`);
        } else if (statusCode === 403) {
          throw new Error(`DeepSeek API授权失败: 您的账户没有权限访问所请求的资源或模型。请检查您的账户权限。原始错误: ${responseData}`);
        } else if (statusCode === 429) {
          throw new Error(`DeepSeek API请求过多: 您的账户已超出请求限制。请稍后再试或升级您的计划。原始错误: ${responseData}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('DeepSeek API请求超时，请检查网络连接或稍后再试');
      }
      
      // 默认错误信息
      const errorMsg = `DeepSeek API调用失败: ${error.message}`;

      // 记录失败的性能数据
      aiPerformanceMonitor.endRequest(requestInfo, false, false);

      throw new Error(errorMsg);
    }
  }

  /**
   * 清理过期缓存
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of aiCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        aiCache.delete(key);
      }
    }
  }
}

/**
 * AI服务工厂方法
 * @param {Object} config - 配置信息
 * @returns {AIService} - AI服务实例
 */
const createAIService = (config) => {
  const { provider } = config;
  
  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAIService(config);
    case 'baidu':
      return new BaiduService(config);
    case 'ali':
      return new AliService(config);
    case 'deepseek':
      return new DeepSeekService(config);
    default:
      throw new Error(`不支持的AI服务提供商: ${provider}`);
  }
};

/**
 * 获取AI服务实例
 * @returns {Promise<AIService>} - AI服务实例
 */
const getAIService = async () => {
  try {
    const config = await getAIConfig();
    
    if (!config) {
      throw new Error('AI配置不存在，请先配置AI服务');
    }
    
    if (!config.enabled) {
      throw new Error('AI服务已禁用，请先启用AI服务');
    }
    
    return createAIService(config);
  } catch (error) {
    logger.error(`获取AI服务实例失败: ${error.message}`);
    throw new Error(`获取AI服务实例失败: ${error.message}`);
  }
};

/**
 * 记录AI生成历史
 * @param {Object} data - 历史记录数据
 * @param {number} data.userId - 用户ID
 * @param {string} data.type - 生成类型
 * @param {string} data.prompt - 提示词
 * @param {string} data.result - 生成结果
 * @param {number} data.tokensUsed - 使用的token数
 * @param {string} data.model - 使用的模型
 * @param {string} data.provider - 服务提供商
 * @returns {Promise<Object>} - 创建的历史记录
 */
const recordAIGeneration = async (data) => {
  try {
    const { query } = require('../config/db');
    
    const sql = `
      INSERT INTO ai_generation_history
      (user_id, type, prompt, result, tokens_used, model, provider)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.userId || null,
      data.type,
      data.prompt,
      data.result,
      data.tokensUsed || 0,
      data.model,
      data.provider
    ];
    
    const result = await query(sql, params);
    
    return {
      id: result.insertId,
      ...data
    };
  } catch (error) {
    logger.error(`记录AI生成历史失败: ${error.message}`);
    // 仅记录日志，不影响主流程
    return null;
  }
};

module.exports = {
  getAIService,
  createAIService,
  recordAIGeneration
};
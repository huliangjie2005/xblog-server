/**
 * AI服务控制器
 * 负责AI服务相关的接口
 */

const aiService = require('../../services/aiService');
const settingService = require('../../services/settingService');
const { logger } = require('../../utils/logger');
const aiPerformanceMonitor = require('../../utils/aiPerformanceMonitor');
const { query } = require('../../config/db');

/**
 * 生成文章摘要
 */
const generateSummary = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        status: 'error',
        message: '文章内容不能为空'
      });
    }

    // 获取AI服务实例
    const service = await aiService.getAIService();
    
    // 使用默认摘要生成模板
    const summaryTemplate = '请为以下文章生成一个简洁的摘要（不超过200字）：\n\n{content}';
    
    // 生成摘要
    const summary = await service.generateSummary(content, summaryTemplate);
    
    // 记录生成历史
    await aiService.recordAIGeneration({
      userId: req.admin?.id,
      type: 'summary',
      prompt: summaryTemplate.replace('{content}', content.substring(0, 100) + '...'),
      result: summary,
      tokensUsed: 0, // 默认为0，实际token消耗需要从AI服务返回
      model: service.model,
      provider: service.provider
    });
    
    return res.status(200).json({
      status: 'success',
      message: '摘要生成成功',
      data: {
        summary
      }
    });
  } catch (error) {
    logger.error(`生成摘要失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `生成摘要失败: ${error.message}`
    });
  }
};

/**
 * 生成写作建议
 */
const generateWritingSuggestion = async (req, res) => {
  try {
    const { content, prompt } = req.body;

    if (!content) {
      return res.status(400).json({
        status: 'error',
        message: '内容不能为空'
      });
    }

    logger.info(`收到写作建议请求，内容长度: ${content.length}, 用户ID: ${req.admin?.id}`);

    // 获取AI服务实例
    let service;
    try {
      service = await aiService.getAIService();
      logger.info(`AI服务实例创建成功，提供商: ${service.provider}, 模型: ${service.model}`);
    } catch (serviceError) {
      logger.error(`获取AI服务实例失败: ${serviceError.message}`);
      return res.status(500).json({
        status: 'error',
        message: `AI服务不可用: ${serviceError.message}`,
        details: {
          error: 'AI_SERVICE_UNAVAILABLE',
          suggestion: '请检查AI配置是否正确，或联系管理员'
        }
      });
    }

    // 使用默认提示词或自定义提示词
    const defaultPrompt = '请针对以下内容提供写作建议和改进意见：\n\n{content}';
    const finalPrompt = prompt || defaultPrompt;

    logger.info(`使用提示词模板: ${finalPrompt.substring(0, 100)}...`);

    // 生成写作建议
    let suggestion;
    try {
      suggestion = await service.generateWritingSuggestion(content, finalPrompt);
      logger.info(`AI写作建议生成成功，结果长度: ${suggestion.length}`);
    } catch (aiError) {
      logger.error(`AI生成写作建议失败: ${aiError.message}`);
      return res.status(500).json({
        status: 'error',
        message: `AI生成失败: ${aiError.message}`,
        details: {
          error: 'AI_GENERATION_FAILED',
          suggestion: '请检查API密钥是否有效，或稍后重试'
        }
      });
    }

    // 记录生成历史
    try {
      await aiService.recordAIGeneration({
        userId: req.admin?.id,
        type: 'writing_suggestion',
        prompt: finalPrompt.replace('{content}', content.substring(0, 100) + '...'),
        result: suggestion,
        tokensUsed: 0,
        model: service.model,
        provider: service.provider
      });
    } catch (recordError) {
      logger.warn(`记录AI生成历史失败: ${recordError.message}`);
      // 不影响主要功能，继续执行
    }

    return res.status(200).json({
      status: 'success',
      message: '写作建议生成成功',
      data: {
        suggestion
      }
    });
  } catch (error) {
    logger.error(`生成写作建议失败: ${error.message}`);
    logger.error(`错误堆栈: ${error.stack}`);
    return res.status(500).json({
      status: 'error',
      message: `生成写作建议失败: ${error.message}`,
      details: {
        error: 'INTERNAL_SERVER_ERROR',
        suggestion: '请联系管理员或稍后重试'
      }
    });
  }
};

/**
 * 生成文章SEO信息
 */
const generateSEO = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        status: 'error',
        message: '标题和内容不能为空'
      });
    }

    // 获取AI服务实例
    const service = await aiService.getAIService();
    
    const prompt = `请为以下文章生成SEO信息，包括：meta描述（不超过150字）、关键词（5-8个，用逗号分隔）和分享描述（不超过60字）。
    
文章标题：${title}

文章内容：
${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}

请按以下JSON格式返回：
{
  "metaDescription": "Meta描述",
  "keywords": "关键词1,关键词2,关键词3,关键词4,关键词5",
  "shareDescription": "分享描述"
}`;
    
    // 调用AI服务生成SEO信息
    const result = await service.generateCompletion(prompt);
    
    // 解析JSON结果
    let seoData;
    try {
      seoData = JSON.parse(result);
    } catch (e) {
      logger.error(`解析SEO结果失败: ${e.message}, 原始结果: ${result}`);
      return res.status(500).json({
        status: 'error',
        message: '解析SEO结果失败，AI返回的数据格式不正确'
      });
    }
    
    // 记录生成历史
    await aiService.recordAIGeneration({
      userId: req.admin?.id,
      type: 'seo',
      prompt: prompt,
      result: result,
      tokensUsed: 0,
      model: service.model,
      provider: service.provider
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'SEO信息生成成功',
      data: {
        metaDescription: seoData.metaDescription,
        keywords: seoData.keywords
      }
    });
  } catch (error) {
    logger.error(`生成SEO信息失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `生成SEO信息失败: ${error.message}`
    });
  }
};

/**
 * 获取AI配置
 */
const getAIConfig = async (req, res) => {
  try {
    // 获取查询参数，决定是否显示明文密钥
    const showFullKey = req.query.showFullKey === 'true';
    
    const config = await settingService.getAIConfig();
    
    // 根据参数决定是否隐藏API密钥
    if (config && config.apiKey && !showFullKey) {
      const keyLength = config.apiKey.length;
      config.apiKey = config.apiKey.substring(0, 4) + '*'.repeat(keyLength - 8) + config.apiKey.substring(keyLength - 4);
    }
    
    return res.status(200).json({
      status: 'success',
      message: '获取AI配置成功',
      data: config
    });
  } catch (error) {
    logger.error(`获取AI配置失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `获取AI配置失败: ${error.message}`
    });
  }
};

/**
 * 更新AI配置
 */
const updateAIConfig = async (req, res) => {
  try {
    const { 
      provider, 
      apiKey, 
      baseUrl,
      model, 
      temperature, 
      maxTokens,
      enableSummary,
      enableSEOSuggestion,
      enableWritingHelp
    } = req.body;
    
    if (!provider || !model) {
      return res.status(400).json({
        success: false,
        message: '配置参数不完整，服务提供商和模型为必填项'
      });
    }
    
    // 如果API密钥包含星号（被屏蔽），则使用数据库中的原始密钥
    let finalApiKey = apiKey;
    if (apiKey && apiKey.includes('*')) {
      const currentConfig = await settingService.getAIConfig();
      if (currentConfig && currentConfig.apiKey) {
        finalApiKey = currentConfig.apiKey;
      } else {
        return res.status(400).json({
          success: false,
          message: '无法获取原始API密钥，请提供完整的API密钥'
        });
      }
    }
    
    // 更新配置
    await settingService.updateAIConfig({
      provider,
      apiKey: finalApiKey,
      baseUrl,
      model,
      temperature: parseFloat(temperature) || 0.7,
      maxTokens: parseInt(maxTokens) || 2000,
      enableSummary: enableSummary !== undefined ? enableSummary : true,
      enableSEOSuggestion: enableSEOSuggestion !== undefined ? enableSEOSuggestion : true,
      enableWritingHelp: enableWritingHelp !== undefined ? enableWritingHelp : true
    });
    
    return res.status(200).json({
      success: true,
      message: '配置更新成功'
    });
  } catch (error) {
    logger.error(`更新AI配置失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `更新AI配置失败: ${error.message}`
    });
  }
};

/**
 * 获取AI生成历史记录
 */
const getGenerationHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // 查询总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM ai_generation_history
    `;
    const countResult = await query(countSql, []);
    const total = countResult[0].total;
    
    // 查询历史记录
    const sql = `
      SELECT id, user_id, type, prompt, result, tokens_used, model, provider, created_at
      FROM ai_generation_history
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const history = await query(sql, [limit, offset]);
    
    return res.status(200).json({
      status: 'success',
      message: '获取AI生成历史记录成功',
      data: {
        items: history,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error(`获取AI生成历史记录失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `获取AI生成历史记录失败: ${error.message}`
    });
  }
};

/**
 * 测试AI服务连接
 */
const testAIConnection = async (req, res) => {
  try {
    let { provider, apiKey, baseUrl, model } = req.body;
    
    // 检查请求参数
    if (!provider || !model) {
      return res.status(400).json({
        success: false,
        message: '服务提供商和模型不能为空'
      });
    }
    
    // 如果API密钥为空或包含星号(已被屏蔽)，尝试从数据库获取
    if (!apiKey || apiKey.includes('*')) {
      logger.info(`API密钥不可用，尝试从数据库获取: ${provider}`);
      
      // 从数据库获取实际的API密钥
      const dbConfig = await settingService.getAIConfig();
      
      // 仅当数据库中有配置且提供商匹配时使用数据库中的密钥
      if (dbConfig && dbConfig.provider === provider) {
        apiKey = dbConfig.apiKey;
        logger.info(`使用数据库中的API密钥进行测试`);
      } else {
        return res.status(400).json({
          success: false,
          message: 'API密钥不可用，请输入有效的API密钥'
        });
      }
    }
    
    // 创建临时服务实例
    const service = aiService.createAIService({
      provider,
      apiKey,
      baseUrl,
      model
    });
    
    // 使用更简单的测试消息
    const prompt = "测试连接。请回复'OK'。";
    
    // 添加超时处理
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('连接测试超时，请检查API密钥和网络连接')), 15000);
    });
    
    // 使用Promise.race来实现超时处理
    const response = await Promise.race([
      service.generateCompletion(prompt),
      timeoutPromise
    ]);
    
    // 构建模型信息
    const modelInfo = {
      name: model,
      maxTokens: getModelMaxTokens(provider, model),
      capabilities: getModelCapabilities(provider, model),
      region: getProviderRegion(provider)
    };
    
    return res.status(200).json({
      success: true,
      message: '连接测试成功',
      data: {
        success: true,
        message: '连接测试成功',
        response: response,
        modelInfo: modelInfo
      }
    });
  } catch (error) {
    logger.error(`测试AI连接失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `测试AI连接失败: ${error.message}`,
      data: {
        success: false,
        message: `测试AI连接失败: ${error.message}`
      }
    });
  }
};

/**
 * 获取模型最大令牌数
 * @param {string} provider - 服务提供商
 * @param {string} model - 模型名称
 * @returns {number} - 最大令牌数
 */
function getModelMaxTokens(provider, model) {
  const tokenLimits = {
    'openai': {
      'gpt-3.5-turbo': 4096,
      'gpt-4': 8192,
      'gpt-4-turbo': 128000
    },
    'anthropic': {
      'claude-2': 100000,
      'claude-instant': 100000
    },
    'deepseek': {
      'deepseek-chat': 8000,
      'deepseek-reasoner': 64000
    }
  };

  if (tokenLimits[provider] && tokenLimits[provider][model]) {
    return tokenLimits[provider][model];
  }
  
  // 默认值
  return 4096;
}

/**
 * 获取模型能力
 * @param {string} provider - 服务提供商
 * @param {string} model - 模型名称
 * @returns {string[]} - 能力列表
 */
function getModelCapabilities(provider, model) {
  const baseCapabilities = ['文本生成', '问答'];
  
  if (provider === 'openai') {
    if (model.includes('gpt-4')) {
      return [...baseCapabilities, '高级推理', '代码生成', '复杂任务'];
    }
    return [...baseCapabilities, '代码生成'];
  }
  
  if (provider === 'anthropic') {
    return [...baseCapabilities, '长文本处理', '安全过滤'];
  }
  
  if (provider === 'deepseek') {
    if (model.includes('reasoner')) {
      return [...baseCapabilities, '高级推理', '数学问题', '逻辑分析'];
    }
    return [...baseCapabilities, '中文优化', '代码生成'];
  }
  
  return baseCapabilities;
}

/**
 * 获取服务提供商区域
 * @param {string} provider - 服务提供商
 * @returns {string} - 区域
 */
function getProviderRegion(provider) {
  const regions = {
    'openai': '全球',
    'anthropic': '美国',
    'deepseek': '中国'
  };
  
  return regions[provider] || '未知';
}

/**
 * 检查AI服务状态
 */
const checkAIStatus = async (req, res) => {
  try {
    // 检查AI配置
    const config = await settingService.getAIConfig();

    if (!config) {
      return res.status(200).json({
        status: 'success',
        data: {
          available: false,
          message: 'AI配置不存在，请先配置AI服务',
          details: {
            configExists: false,
            enabled: false,
            writingHelpEnabled: false
          }
        }
      });
    }

    if (!config.enabled) {
      return res.status(200).json({
        status: 'success',
        data: {
          available: false,
          message: 'AI服务已禁用',
          details: {
            configExists: true,
            enabled: false,
            writingHelpEnabled: config.enableWritingHelp
          }
        }
      });
    }

    if (!config.enableWritingHelp) {
      return res.status(200).json({
        status: 'success',
        data: {
          available: false,
          message: '写作辅助功能已禁用',
          details: {
            configExists: true,
            enabled: true,
            writingHelpEnabled: false
          }
        }
      });
    }

    // 检查API密钥
    if (!config.apiKey || config.apiKey === 'sk-your-api-key' || config.apiKey === 'sk-请在系统设置中配置您的API密钥') {
      return res.status(200).json({
        status: 'success',
        data: {
          available: false,
          message: 'API密钥未正确配置',
          details: {
            configExists: true,
            enabled: true,
            writingHelpEnabled: true,
            apiKeyConfigured: false
          }
        }
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        available: true,
        message: 'AI服务可用',
        details: {
          configExists: true,
          enabled: true,
          writingHelpEnabled: true,
          apiKeyConfigured: true,
          provider: config.provider,
          model: config.model
        }
      }
    });

  } catch (error) {
    logger.error(`检查AI服务状态失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `检查AI服务状态失败: ${error.message}`
    });
  }
};

/**
 * 获取AI性能统计
 */
const getAIPerformance = async (req, res) => {
  try {
    const metrics = aiPerformanceMonitor.getMetrics();
    const advice = aiPerformanceMonitor.getPerformanceAdvice();

    return res.status(200).json({
      status: 'success',
      data: {
        metrics,
        advice,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`获取AI性能统计失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `获取AI性能统计失败: ${error.message}`
    });
  }
};

/**
 * 重置AI性能统计
 */
const resetAIPerformance = async (req, res) => {
  try {
    aiPerformanceMonitor.reset();

    return res.status(200).json({
      status: 'success',
      message: 'AI性能统计已重置'
    });
  } catch (error) {
    logger.error(`重置AI性能统计失败: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: `重置AI性能统计失败: ${error.message}`
    });
  }
};

module.exports = {
  generateSummary,
  generateWritingSuggestion,
  generateSEO,
  getAIConfig,
  updateAIConfig,
  getGenerationHistory,
  testAIConnection,
  checkAIStatus,
  getAIPerformance,
  resetAIPerformance
};
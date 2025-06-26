const axios = require('axios');
const ApiResponse = require('../utils/response');

class AIService {
  constructor() {
    this.config = {
      provider: 'deepseek',
      apiKey: process.env.AI_API_KEY || 'sk-c18892c2750c4be4bece2859c3d56a90',
      baseURL: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 2000
    };
  }

  /**
   * 更新AI配置
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    return this.config;
  }

  /**
   * 测试AI连接
   */
  async testConnection() {
    try {
      const response = await axios.post(
        `${this.config.baseURL}/chat/completions`,
        {
          model: this.config.model,
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7,
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        provider: this.config.provider,
        model: this.config.model,
        response: response.data
      };
    } catch (error) {
      throw new Error(`AI连接测试失败: ${error.message}`);
    }
  }

  /**
   * 生成文章摘要
   */
  async generateSummary(content) {
    try {
      const response = await axios.post(
        `${this.config.baseURL}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的文章摘要生成助手。请生成简洁的文章摘要，突出文章的主要观点。'
            },
            {
              role: 'user',
              content: `请为以下文章生成一个简短的摘要：\n\n${content}`
            }
          ],
          temperature: 0.5,
          max_tokens: this.config.maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      throw new Error(`生成摘要失败: ${error.message}`);
    }
  }

  /**
   * 生成写作建议
   */
  async generateWritingSuggestions(content) {
    try {
      const response = await axios.post(
        `${this.config.baseURL}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的写作顾问。请分析文章并提供改进建议。'
            },
            {
              role: 'user',
              content: `请为以下文章提供写作建议：\n\n${content}`
            }
          ],
          temperature: 0.7,
          max_tokens: this.config.maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      throw new Error(`生成写作建议失败: ${error.message}`);
    }
  }

  /**
   * 生成SEO建议
   */
  async generateSEOSuggestions(content) {
    try {
      const response = await axios.post(
        `${this.config.baseURL}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个SEO专家。请分析文章并提供SEO优化建议。'
            },
            {
              role: 'user',
              content: `请为以下文章提供SEO优化建议：\n\n${content}`
            }
          ],
          temperature: 0.7,
          max_tokens: this.config.maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      throw new Error(`生成SEO建议失败: ${error.message}`);
    }
  }
}

module.exports = new AIService(); 
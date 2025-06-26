const axios = require('axios');
const { query } = require('../config/db');

/**
 * AI评论审核服务
 * 用于检测评论内容是否包含不适当内容
 */
class ModerationService {
  /**
   * 审核评论内容
   * @param {string} content - 要审核的评论内容
   * @returns {Object} - 审核结果
   */
  async moderateComment(content) {
    try {
      // 获取AI审核设置
      const [settings] = await query(
        `SELECT value FROM settings WHERE \`key\` = 'commentModeration'`
      );
      
      let config = { threshold: 0.7 };
      if (settings && settings.value) {
        try {
          config = JSON.parse(settings.value);
        } catch (e) {
          console.error('解析评论审核设置失败:', e);
        }
      }
      
      const threshold = config.threshold || 0.7;
      
      // 调用AI审核API (以OpenAI Moderation API为例)
      const response = await axios.post('https://api.openai.com/v1/moderations', 
      { input: content },
      { headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = response.data.results[0];
      const approved = !result.flagged || result.category_scores.sexual < threshold;
      
      return {
        approved,
        reason: approved ? null : '包含不适内容',
        score: 1 - (result.category_scores.sexual || 0),
        categories: result.category_scores
      };
    } catch (error) {
      console.error('评论审核失败:', error);
      // 审核出错时默认通过，避免阻塞用户评论
      return { approved: true, error: error.message };
    }
  }
}

module.exports = new ModerationService(); 
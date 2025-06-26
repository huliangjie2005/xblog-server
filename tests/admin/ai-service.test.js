const request = require('supertest');
const app = require('../../../app');
const { logger } = require('../../../utils/logger');
const aiService = require('../../../services/aiService');

// 模拟AI服务依赖
jest.mock('../../../services/aiService');

// 禁用日志输出以保持测试输出清洁
jest.spyOn(logger, 'info').mockImplementation(() => {});
jest.spyOn(logger, 'warn').mockImplementation(() => {});
jest.spyOn(logger, 'error').mockImplementation(() => {});

describe('AI Service API Tests', () => {
  let authToken;
  const testArticle = {
    title: '测试文章标题',
    content: '这是一篇用于测试AI服务的示例文章内容。'
  };

  // 在所有测试前获取管理员令牌
  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/admin/auth/login')
      .send({
        email: 'admin_1749723284304@example.com',
        password: 'Admin@123'
      });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body).toHaveProperty('token');
    authToken = loginResponse.body.token;
  });

  describe('POST /api/admin/ai/generate-summary', () => {
    it('should generate article summary successfully', async () => {
      // 模拟AI服务返回值
      const mockSummary = '这是模拟的文章摘要';
      aiService.generateSummary.mockResolvedValue({ summary: mockSummary });

      const response = await request(app)
        .post('/api/admin/ai/generate-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testArticle);

      // 验证AI服务是否被正确调用
      expect(aiService.generateSummary).toHaveBeenCalledWith(testArticle);
      // 验证API响应
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ summary: mockSummary });
    });

    it('should handle AI service errors when generating summary', async () => {
      // 模拟AI服务错误
      const mockError = new Error('AI服务暂时不可用');
      aiService.generateSummary.mockRejectedValue(mockError);

      const response = await request(app)
        .post('/api/admin/ai/generate-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testArticle);

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .post('/api/admin/ai/generate-summary')
        .send(testArticle);

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/admin/ai/generate-writing-suggestion', () => {
    it('should generate writing suggestions successfully', async () => {
      // 模拟AI服务返回值
      const mockSuggestions = ['建议1', '建议2', '建议3'];
      aiService.generateWritingSuggestion.mockResolvedValue({ suggestions: mockSuggestions });

      const response = await request(app)
        .post('/api/admin/ai/generate-writing-suggestion')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testArticle);

      expect(aiService.generateWritingSuggestion).toHaveBeenCalledWith(testArticle);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ suggestions: mockSuggestions });
    });
  });

  describe('POST /api/admin/ai/generate-seo', () => {
    it('should generate SEO information successfully', async () => {
      // 模拟AI服务返回值
      const mockSEO = {
        keywords: ['关键词1', '关键词2', '关键词3'],
        metaDescription: '这是模拟的元描述'
      };
      aiService.generateSEO.mockResolvedValue(mockSEO);

      const response = await request(app)
        .post('/api/admin/ai/generate-seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testArticle);

      expect(aiService.generateSEO).toHaveBeenCalledWith(testArticle);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockSEO);
    });
  });

  describe('GET /api/admin/ai/config', () => {
    it('should get AI config successfully', async () => {
      const response = await request(app)
        .get('/api/admin/ai/config')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('provider');
      expect(response.body).toHaveProperty('apiKey');
    });
  });

  describe('POST /api/admin/ai/test-connection', () => {
    it('should test AI connection successfully', async () => {
      // 模拟AI服务连接测试返回值
      aiService.testConnection.mockResolvedValue({ connected: true });

      const response = await request(app)
        .post('/api/admin/ai/test-connection')
        .set('Authorization', `Bearer ${authToken}`);

      expect(aiService.testConnection).toHaveBeenCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ connected: true });
    })

    it('should handle AI connection test failure', async () => {
      // 模拟AI服务连接测试失败
      aiService.testConnection.mockResolvedValue({ connected: false, error: '连接失败原因' });

      const response = await request(app)
        .post('/api/admin/ai/test-connection')
        .set('Authorization', `Bearer ${authToken}`);

      expect(aiService.testConnection).toHaveBeenCalled();
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ connected: false, error: '连接失败原因' });
    });
  });
});
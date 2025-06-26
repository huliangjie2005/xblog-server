const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../config/jwt');

// 全局变量存储测试所需的令牌
let adminToken;

// 在所有测试之前执行管理员登录获取令牌
beforeAll(async () => {
  // 使用管理员凭据登录
  const loginResponse = await request(app)
    .post('/api/admin/auth/login')
    .send({
      email: 'admin_1749723284304@example.com', // 实际管理员邮箱
      password: 'Admin@123' // 实际管理员密码
    });

  expect(loginResponse.statusCode).toBe(200);
  expect(loginResponse.body.success).toBe(true);
  expect(loginResponse.body.data).toHaveProperty('token');

  adminToken = loginResponse.body.data.token;
});

// AI服务API测试套件
describe('Admin AI Service API', () => {
  // 测试生成文章摘要接口
  describe('POST /api/admin/ai/generate-summary', () => {
    it('should generate article summary successfully', async () => {
      const response = await request(app)
        .post('/api/admin/ai/generate-summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          articleContent: '这是一篇测试文章，用于生成摘要。人工智能（AI）是研究、开发用于模拟、延伸和扩展人的智能的理论、方法、技术及应用系统的一门新的技术科学。人工智能是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。',
          template: '请为以下文章生成一个简洁的摘要（不超过200字）：\n\n{content}'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('summary');
      expect(typeof response.body.data.summary).toBe('string');
    });

    it('should return 400 if article content is missing', async () => {
      const response = await request(app)
        .post('/api/admin/ai/generate-summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ template: '测试模板' });

      expect(response.statusCode).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  // 测试生成写作建议接口
  describe('POST /api/admin/ai/generate-writing-suggestion', () => {
    it('should generate writing suggestion successfully', async () => {
      const response = await request(app)
        .post('/api/admin/ai/generate-writing-suggestion')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: '人工智能的发展正在改变我们的生活方式。',
          prompt: '请针对以下内容提供写作建议和改进意见：\n\n{content}'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('suggestion');
    });
  });

  // 测试生成SEO信息接口
  describe('POST /api/admin/ai/generate-seo', () => {
    it('should generate SEO information successfully', async () => {
      const response = await request(app)
        .post('/api/admin/ai/generate-seo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '人工智能发展现状与未来趋势',
          content: '人工智能（AI）是当前科技领域最热门的话题之一。本文将探讨人工智能的发展现状、主要应用领域以及未来趋势。从机器学习到深度学习，从自然语言处理到计算机视觉，人工智能技术正在快速发展并广泛应用于各个行业。'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('metaDescription');
      expect(response.body.data).toHaveProperty('keywords');
      expect(response.body.data).toHaveProperty('shareDescription');
    });
  });

  // 测试获取AI配置接口
  describe('GET /api/admin/ai/config', () => {
    it('should get AI config successfully', async () => {
      const response = await request(app)
        .get('/api/admin/ai/config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('provider');
      expect(response.body.data).toHaveProperty('model');
    });
  });

  // 测试更新AI配置接口
  describe('PUT /api/admin/ai/config', () => {
    it('should update AI config successfully', async () => {
      const response = await request(app)
        .put('/api/admin/ai/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          provider: 'openai',
          apiKey: 'sk-test-key-123456',
          model: 'gpt-3.5-turbo',
          enabled: true
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  // 测试AI服务连接接口
  describe('POST /api/admin/ai/test-connection', () => {
    it('should test AI connection successfully', async () => {
      const response = await request(app)
        .post('/api/admin/ai/test-connection')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          provider: 'openai',
          apiKey: 'sk-test-key-123456',
          model: 'gpt-3.5-turbo'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  // 测试获取AI生成历史记录接口
  describe('GET /api/admin/ai/history', () => {
    it('should get AI generation history successfully', async () => {
      const response = await request(app)
        .get('/api/admin/ai/history?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
    });
  });
});
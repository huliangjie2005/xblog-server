/**
 * XBlog 管理员API完整测试脚本
 * 测试所有管理员API功能
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// 基础URL
const BASE_URL = 'http://localhost:3000/api/admin';

// 存储测试过程中的数据
const testData = {
  token: null,
  adminId: null,
  postId: null,
  categoryId: null,
  tagId: null,
  commentId: null,
  fileId: null,
};

// 测试计数器
const testCounter = {
  total: 0,
  passed: 0,
  failed: 0
};

// 彩色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

/**
 * 测试结果输出
 */
const log = {
  success: (msg) => {
    console.log(`${colors.green}✓ 成功: ${msg}${colors.reset}`);
    testCounter.passed++;
    testCounter.total++;
  },
  error: (msg, error) => {
    console.error(`${colors.red}✗ 失败: ${msg}${colors.reset}`);
    if (error?.response?.data) {
      console.error(`  响应数据:`, error.response.data);
    } else if (error?.message) {
      console.error(`  错误信息:`, error.message);
    } else {
      console.error(`  错误详情:`, error);
    }
    testCounter.failed++;
    testCounter.total++;
  },
  info: (msg) => console.log(`${colors.blue}ℹ 信息: ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.cyan}=== ${msg} ===${colors.reset}`),
  separator: () => console.log('-'.repeat(60)),
  summary: () => {
    console.log(`\n${colors.magenta}====== 测试摘要 ======${colors.reset}`);
    console.log(`${colors.blue}总测试数: ${testCounter.total}${colors.reset}`);
    console.log(`${colors.green}通过: ${testCounter.passed}${colors.reset}`);
    console.log(`${colors.red}失败: ${testCounter.failed}${colors.reset}`);
    console.log(`${colors.magenta}通过率: ${Math.round((testCounter.passed / testCounter.total) * 100)}%${colors.reset}`);
  }
};

/**
 * API请求辅助函数
 */
async function apiRequest(method, endpoint, data = null, headers = {}, params = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      params,
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    throw error;
  }
}

// ================== 认证API测试 ==================

/**
 * 测试管理员登录
 */
async function testAdminLogin() {
  log.title('测试管理员登录');

  try {
    const loginData = {
      email: 'admin_1749723284304@example.com',  // 使用提供的管理员账号
      password: 'Admin@123'                     // 使用提供的密码
    };
    
    log.info(`尝试管理员登录: ${loginData.email}`);
    
    const response = await apiRequest('post', '/auth/login', loginData);
    
    if (response.success && response.data && response.data.token) {
      log.success('管理员登录成功, 已获取token');
      testData.token = response.data.token;
      testData.adminId = response.data.user?.id;
      return true;
    } else {
      log.error('管理员登录成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('管理员登录失败', error);
    return false;
  }
}

/**
 * 测试获取当前管理员信息
 */
async function testGetCurrentAdmin() {
  if (!testData.token) {
    log.info('跳过获取管理员信息测试 (未获取token)');
    return false;
  }

  log.title('测试获取当前管理员信息');

  try {
    log.info('尝试获取当前管理员信息');
    
    const response = await apiRequest('get', '/auth/me', null, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data && response.data.user) {
      log.success(`获取管理员信息成功: ${response.data.user.username || response.data.user.email}`);
      if (!testData.adminId) {
        testData.adminId = response.data.user.id;
      }
      return true;
    } else {
      log.error('获取管理员信息成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('获取管理员信息失败', error);
    return false;
  }
}

// ================== 文章API测试 ==================

/**
 * 测试获取所有文章列表
 */
async function testGetAllPosts() {
  if (!testData.token) {
    log.info('跳过获取文章列表测试 (未获取token)');
    return false;
  }

  log.title('测试获取所有文章列表');

  try {
    log.info('尝试获取所有文章列表');
    
    const response = await apiRequest('get', '/posts', null, {
      'Authorization': `Bearer ${testData.token}`
    }, {
      page: 1,
      limit: 10
    });
    
    if (response.success && response.data && Array.isArray(response.data.items)) {
      const postCount = response.data.items.length;
      log.success(`获取所有文章列表成功, 共 ${postCount} 篇文章`);
      
      // 如果有文章，保存第一篇文章的ID用于后续测试
      if (postCount > 0) {
        testData.postId = response.data.items[0].id;
      }
      
      return true;
    } else {
      log.error('获取所有文章列表成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('获取所有文章列表失败', error);
    return false;
  }
}

/**
 * 测试获取管理员自己的文章
 */
async function testGetMyPosts() {
  if (!testData.token) {
    log.info('跳过获取自己文章测试 (未获取token)');
    return false;
  }

  log.title('测试获取管理员自己的文章');

  try {
    log.info('尝试获取管理员自己的文章');
    
    const response = await apiRequest('get', '/posts/my-posts', null, {
      'Authorization': `Bearer ${testData.token}`
    }, {
      page: 1,
      limit: 10
    });
    
    if (response.success && response.data && Array.isArray(response.data.items)) {
      const postCount = response.data.items.length;
      log.success(`获取管理员自己的文章成功, 共 ${postCount} 篇文章`);
      
      // 如果有文章，保存第一篇文章的ID用于后续测试
      if (postCount > 0 && !testData.postId) {
        testData.postId = response.data.items[0].id;
      }
      
      return true;
    } else {
      log.error('获取管理员自己的文章成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('获取管理员自己的文章失败', error);
    return false;
  }
}

/**
 * 测试创建文章
 */
async function testCreatePost() {
  if (!testData.token) {
    log.info('跳过创建文章测试 (未获取token)');
    return false;
  }

  log.title('测试创建文章');

  try {
    const timestamp = Date.now();
    const postData = {
      title: `测试文章 - ${timestamp}`,
      content: `这是一篇测试文章，创建于 ${new Date().toLocaleString()}`,
      status: 'published',
      excerpt: '这是文章摘要',
      featuredImage: 'https://example.com/image.jpg',
      tags: [],
      categories: []
    };
    
    log.info(`尝试创建文章: ${postData.title}`);
    
    const response = await apiRequest('post', '/posts', postData, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data && response.data.post) {
      log.success(`文章创建成功: ID=${response.data.post.id}`);
      testData.postId = response.data.post.id;
      return true;
    } else {
      log.error('文章创建请求成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('创建文章失败', error);
    return false;
  }
}

/**
 * 测试获取单个文章
 */
async function testGetSinglePost() {
  if (!testData.token || !testData.postId) {
    log.info('跳过获取单个文章测试 (未获取token或postId)');
    return false;
  }

  log.title('测试获取单个文章');

  try {
    log.info(`尝试获取文章: ID=${testData.postId}`);
    
    const response = await apiRequest('get', `/posts/${testData.postId}`, null, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data && response.data.post) {
      log.success(`获取文章成功: ${response.data.post.title}`);
      return true;
    } else {
      log.error('获取文章成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('获取文章失败', error);
    return false;
  }
}

/**
 * 测试更新文章
 */
async function testUpdatePost() {
  if (!testData.token || !testData.postId) {
    log.info('跳过更新文章测试 (未获取token或postId)');
    return false;
  }

  log.title('测试更新文章');

  try {
    const timestamp = Date.now();
    const updateData = {
      title: `更新后的文章 - ${timestamp}`,
      content: `这是更新后的内容，更新于 ${new Date().toLocaleString()}`,
      status: 'published'
    };
    
    log.info(`尝试更新文章: ID=${testData.postId}`);
    
    const response = await apiRequest('put', `/posts/${testData.postId}`, updateData, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data && response.data.post) {
      log.success(`文章更新成功: ${response.data.post.title}`);
      return true;
    } else {
      log.error('文章更新请求成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('更新文章失败', error);
    return false;
  }
}

// ================== 分类API测试 ==================

/**
 * 测试获取所有分类
 */
async function testGetAllCategories() {
  if (!testData.token) {
    log.info('跳过获取分类列表测试 (未获取token)');
    return false;
  }

  log.title('测试获取所有分类');

  try {
    log.info('尝试获取所有分类');
    
    const response = await apiRequest('get', '/categories', null, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data && Array.isArray(response.data.items)) {
      const categoryCount = response.data.items.length;
      log.success(`获取所有分类成功, 共 ${categoryCount} 个分类`);
      
      // 如果有分类，保存第一个分类的ID用于后续测试
      if (categoryCount > 0) {
        testData.categoryId = response.data.items[0].id;
      }
      
      return true;
    } else {
      log.error('获取所有分类成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('获取所有分类失败', error);
    return false;
  }
}

/**
 * 测试创建分类
 */
async function testCreateCategory() {
  if (!testData.token) {
    log.info('跳过创建分类测试 (未获取token)');
    return false;
  }

  log.title('测试创建分类');

  try {
    const timestamp = Date.now();
    const categoryData = {
      name: `测试分类 - ${timestamp}`,
      slug: `test-category-${timestamp}`,
      description: '这是一个测试分类'
    };
    
    log.info(`尝试创建分类: ${categoryData.name}`);
    
    const response = await apiRequest('post', '/categories', categoryData, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data && response.data.category) {
      log.success(`分类创建成功: ID=${response.data.category.id}`);
      testData.categoryId = response.data.category.id;
      return true;
    } else {
      log.error('分类创建请求成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('创建分类失败', error);
    return false;
  }
}

// ================== 标签API测试 ==================

/**
 * 测试获取所有标签
 */
async function testGetAllTags() {
  if (!testData.token) {
    log.info('跳过获取标签列表测试 (未获取token)');
    return false;
  }

  log.title('测试获取所有标签');

  try {
    log.info('尝试获取所有标签');
    
    const response = await apiRequest('get', '/tags', null, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data && Array.isArray(response.data.items)) {
      const tagCount = response.data.items.length;
      log.success(`获取所有标签成功, 共 ${tagCount} 个标签`);
      
      // 如果有标签，保存第一个标签的ID用于后续测试
      if (tagCount > 0) {
        testData.tagId = response.data.items[0].id;
      }
      
      return true;
    } else {
      log.error('获取所有标签成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('获取所有标签失败', error);
    return false;
  }
}

/**
 * 测试创建标签
 */
async function testCreateTag() {
  if (!testData.token) {
    log.info('跳过创建标签测试 (未获取token)');
    return false;
  }

  log.title('测试创建标签');

  try {
    const timestamp = Date.now();
    const tagData = {
      name: `测试标签 - ${timestamp}`,
      slug: `test-tag-${timestamp}`,
      description: '这是一个测试标签'
    };
    
    log.info(`尝试创建标签: ${tagData.name}`);
    
    const response = await apiRequest('post', '/tags', tagData, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data && response.data.tag) {
      log.success(`标签创建成功: ID=${response.data.tag.id}`);
      testData.tagId = response.data.tag.id;
      return true;
    } else {
      log.error('标签创建请求成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('创建标签失败', error);
    return false;
  }
}

// ================== AI功能API测试 ==================

/**
 * 测试获取AI配置
 */
async function testGetAIConfig() {
  if (!testData.token) {
    log.info('跳过获取AI配置测试 (未获取token)');
    return false;
  }

  log.title('测试获取AI配置');

  try {
    log.info('尝试获取AI配置');
    
    const response = await apiRequest('get', '/ai/config', null, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data) {
      log.success(`获取AI配置成功: ${response.data.provider || '未指定提供商'}`);
      return true;
    } else {
      log.error('获取AI配置成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('获取AI配置失败', error);
    return false;
  }
}

/**
 * 测试更新AI配置
 */
async function testUpdateAIConfig() {
  if (!testData.token) {
    log.info('跳过更新AI配置测试 (未获取token)');
    return false;
  }

  log.title('测试更新AI配置');

  try {
    const configData = {
      provider: 'deepseek',
      apiKey: 'sk-c18892c2750c4be4bece2859c3d56a90',
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 2000
    };
    
    log.info(`尝试更新AI配置: ${configData.provider}`);
    
    const response = await apiRequest('put', '/ai/config', configData, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data) {
      log.success(`AI配置更新成功: ${response.data.provider}`);
      return true;
    } else {
      log.error('AI配置更新成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('更新AI配置失败', error);
    return false;
  }
}

/**
 * 测试AI连接
 */
async function testAIConnection() {
  if (!testData.token) {
    log.info('跳过AI连接测试 (未获取token)');
    return false;
  }

  log.title('测试AI连接');

  try {
    log.info('尝试测试AI连接');
    
    const response = await apiRequest('post', '/ai/test-connection', null, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success) {
      log.success(`AI连接测试成功: ${response.data?.provider || '未知提供商'}`);
      return true;
    } else {
      log.error('AI连接测试失败，返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('AI连接测试失败', error);
    return false;
  }
}

/**
 * 测试AI文章摘要
 */
async function testAISummary() {
  if (!testData.token || !testData.postId) {
    log.info('跳过AI摘要测试 (未获取token或postId)');
    return false;
  }

  log.title('测试AI文章摘要');

  try {
    log.info(`尝试为文章生成摘要: ID=${testData.postId}`);
    
    const response = await apiRequest('post', `/ai/summary/${testData.postId}`, null, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data && response.data.summary) {
      log.success('AI文章摘要生成成功');
      return true;
    } else {
      log.error('AI文章摘要请求成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('AI文章摘要生成失败', error);
    return false;
  }
}

/**
 * 测试AI写作建议
 */
async function testAIWritingSuggestion() {
  if (!testData.token || !testData.postId) {
    log.info('跳过AI写作建议测试 (未获取token或postId)');
    return false;
  }

  log.title('测试AI写作建议');

  try {
    log.info(`尝试为文章获取写作建议: ID=${testData.postId}`);
    
    const response = await apiRequest('post', `/ai/writing-suggestions/${testData.postId}`, null, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data && response.data.suggestions) {
      log.success('AI写作建议获取成功');
      return true;
    } else {
      log.error('AI写作建议请求成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('AI写作建议获取失败', error);
    return false;
  }
}

/**
 * 测试AI SEO建议
 */
async function testAISEO() {
  if (!testData.token || !testData.postId) {
    log.info('跳过AI SEO建议测试 (未获取token或postId)');
    return false;
  }

  log.title('测试AI SEO建议');

  try {
    log.info(`尝试为文章获取SEO建议: ID=${testData.postId}`);
    
    const response = await apiRequest('post', `/ai/seo-suggestions/${testData.postId}`, null, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success && response.data && response.data.suggestions) {
      log.success('AI SEO建议获取成功');
      return true;
    } else {
      log.error('AI SEO建议请求成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('AI SEO建议获取失败', error);
    return false;
  }
}

/**
 * 测试管理员登出
 */
async function testAdminLogout() {
  if (!testData.token) {
    log.info('跳过管理员登出测试 (未获取token)');
    return false;
  }

  log.title('测试管理员登出');

  try {
    log.info('尝试管理员登出');
    
    const response = await apiRequest('post', '/auth/logout', null, {
      'Authorization': `Bearer ${testData.token}`
    });
    
    if (response.success) {
      log.success('管理员登出成功');
      return true;
    } else {
      log.error('管理员登出成功，但返回数据格式不正确');
      return false;
    }
  } catch (error) {
    log.error('管理员登出失败', error);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('\n====== XBlog 管理员API完整测试开始 ======\n');

  // 认证API测试
  await testAdminLogin();
  log.separator();
  
  await testGetCurrentAdmin();
  log.separator();

  // 文章API测试
  await testGetAllPosts();
  log.separator();
  
  await testGetMyPosts();
  log.separator();
  
  await testCreatePost();
  log.separator();
  
  await testGetSinglePost();
  log.separator();
  
  await testUpdatePost();
  log.separator();

  // 分类API测试
  await testGetAllCategories();
  log.separator();
  
  await testCreateCategory();
  log.separator();

  // 标签API测试
  await testGetAllTags();
  log.separator();
  
  await testCreateTag();
  log.separator();

  // AI功能API测试
  await testGetAIConfig();
  log.separator();
  
  await testUpdateAIConfig();
  log.separator();
  
  await testAIConnection();
  log.separator();
  
  await testAISummary();
  log.separator();
  
  await testAIWritingSuggestion();
  log.separator();
  
  await testAISEO();
  log.separator();

  // 登出测试
  await testAdminLogout();
  log.separator();

  // 输出测试摘要
  log.summary();
}

// 执行测试
runTests()
  .then(() => {
    console.log('\n测试执行完成');
  })
  .catch(error => {
    console.error('测试执行过程中发生错误:', error);
  }); 
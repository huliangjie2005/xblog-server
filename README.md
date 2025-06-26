# Xblog Backend Server

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![Express](https://img.shields.io/badge/Express-4.18+-blue.svg)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**现代化博客系统后端API服务**

[功能特性](#功能特性) • [快速开始](#快速开始) • [API文档](#api文档) • [部署指南](#部署指南) • [贡献指南](#贡献指南)

</div>

## 📖 项目简介

Xblog Backend Server 是一个基于 Node.js + Express + MySQL 构建的现代化博客系统后端服务。提供完整的博客管理功能，包括文章管理、用户认证、评论系统、文件上传、AI集成等核心功能。

### 🎯 设计理念

- **模块化架构**: 采用分层架构设计，代码结构清晰，易于维护和扩展
- **安全优先**: 集成多重安全防护机制，保障数据安全
- **性能优化**: 内置缓存机制和数据库优化，提供高性能服务
- **开发友好**: 完整的API文档和开发工具，提升开发效率

## ✨ 功能特性

### 🔐 用户认证与授权
- JWT Token 认证机制
- 基于角色的权限控制 (RBAC)
- 用户注册、登录、密码重置
- 多级权限管理

### 📝 内容管理
- **文章管理**: 创建、编辑、删除、发布文章
- **分类管理**: 文章分类组织和管理
- **标签系统**: 灵活的标签分类机制
- **评论系统**: 多级评论和评论审核
- **文件上传**: 图片和文档上传管理

### 🤖 AI 集成
- AI 内容生成和优化
- 智能评论审核
- 内容推荐算法

### 🛡️ 安全防护
- 请求频率限制
- SQL 注入防护
- XSS 攻击防护
- CORS 跨域配置
- 数据验证和清理

### 📊 系统管理
- 系统设置管理
- 用户行为日志
- 性能监控
- 健康检查接口

### 🔧 开发工具
- Swagger API 文档
- 自动化测试
- 日志系统
- 开发调试工具

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- MySQL >= 8.0
- Redis (可选，用于缓存)

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/huliangjie2005/xblog-server.git
cd xblog-server
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量文件
nano .env
```

4. **数据库配置**
```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE xblog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 运行数据库迁移
npm run migrate:roles
```

5. **启动服务**
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 环境变量配置

创建 `.env` 文件并配置以下变量：

```env
# 应用配置
NODE_ENV=development
PORT=9002
API_VERSION=v1

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=xblog
DB_PORT=3306

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 文件上传配置
UPLOAD_DIR=public/uploads
MAX_FILE_SIZE=5242880

# Redis配置 (可选)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 📚 API文档

服务启动后，可通过以下地址访问API文档：

- **Swagger UI**: `http://localhost:9002/api-docs`
- **健康检查**: `http://localhost:9002/health`

### 主要API端点

#### 🔐 认证相关
```
POST   /api/auth/register     # 用户注册
POST   /api/auth/login        # 用户登录
POST   /api/auth/logout       # 用户登出
POST   /api/auth/refresh      # 刷新Token
POST   /api/auth/forgot       # 忘记密码
```

#### 📝 文章管理
```
GET    /api/posts             # 获取文章列表
GET    /api/posts/:id         # 获取文章详情
POST   /api/admin/posts       # 创建文章
PUT    /api/admin/posts/:id   # 更新文章
DELETE /api/admin/posts/:id   # 删除文章
```

#### 💬 评论系统
```
GET    /api/comments          # 获取评论列表
POST   /api/comments          # 发表评论
PUT    /api/admin/comments/:id # 审核评论
DELETE /api/admin/comments/:id # 删除评论
```

#### 📁 分类标签
```
GET    /api/categories        # 获取分类列表
GET    /api/tags              # 获取标签列表
POST   /api/admin/categories  # 创建分类
POST   /api/admin/tags        # 创建标签
```

#### 📎 文件上传
```
POST   /api/files/upload      # 上传文件
GET    /api/files/:id         # 获取文件信息
DELETE /api/admin/files/:id   # 删除文件
```

## 🏗️ 项目结构

```
xblog-server/
├── app.js                 # Express应用主文件
├── server.js              # 服务器启动文件
├── package.json           # 项目依赖配置
├── .env.example           # 环境变量模板
├── .gitignore            # Git忽略文件
├── config/               # 配置文件
│   ├── db.js            # 数据库配置
│   ├── jwt.js           # JWT配置
│   └── index.js         # 主配置文件
├── controllers/          # 控制器层
│   ├── admin/           # 管理员控制器
│   └── public/          # 公共控制器
├── middlewares/          # 中间件
│   ├── auth.js          # 认证中间件
│   ├── validation.js    # 数据验证中间件
│   ├── error-handler.js # 错误处理中间件
│   └── ...
├── models/              # 数据模型
│   ├── post.model.js    # 文章模型
│   ├── admin.model.js   # 管理员模型
│   └── ...
├── routes/              # 路由定义
│   ├── admin/           # 管理员路由
│   ├── public/          # 公共路由
│   └── direct-handlers.js
├── services/            # 业务逻辑层
│   ├── postService.js   # 文章服务
│   ├── userService.js   # 用户服务
│   ├── aiService.js     # AI服务
│   └── ...
├── utils/               # 工具函数
│   ├── logger.js        # 日志工具
│   ├── cache.js         # 缓存工具
│   ├── mailer.js        # 邮件工具
│   └── ...
├── migrations/          # 数据库迁移文件
├── swagger/             # API文档配置
├── tests/               # 测试文件
├── scripts/             # 脚本文件
├── public/              # 静态文件
│   └── uploads/         # 上传文件目录
└── logs/                # 日志文件
```

## 🛠️ 开发指南

### 可用脚本

```bash
# 开发模式启动
npm run dev

# 生产模式启动
npm start

# 运行测试
npm test

# 代码检查
npm run lint

# 清理端口
npm run free-port

# 数据库迁移
npm run migrate:roles

# 调试模式
npm run dev:debug
```

### 开发规范

1. **代码风格**: 遵循 ESLint 配置规范
2. **提交规范**: 使用语义化提交信息
3. **测试覆盖**: 新功能需要编写对应测试
4. **文档更新**: API变更需要更新Swagger文档

### 调试技巧

- 使用 `npm run dev:debug` 启动调试模式
- 查看 `logs/` 目录下的日志文件
- 使用 `/health` 端点检查服务状态

## 🚀 部署指南

### Docker 部署

1. **构建镜像**
```bash
# 创建 Dockerfile
cat > Dockerfile << EOF
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 9002
CMD ["npm", "start"]
EOF

# 构建镜像
docker build -t xblog-server .
```

2. **运行容器**
```bash
docker run -d \
  --name xblog-server \
  -p 9002:9002 \
  -e NODE_ENV=production \
  -e DB_HOST=your_db_host \
  -e DB_USER=your_db_user \
  -e DB_PASSWORD=your_db_password \
  -e JWT_SECRET=your_jwt_secret \
  xblog-server
```

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 创建 PM2 配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'xblog-server',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 9002
    }
  }]
}
EOF

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:9002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- tests/auth.test.js

# 生成测试覆盖率报告
npm test -- --coverage
```

### 测试结构

```
tests/
├── admin/              # 管理员功能测试
├── auth.test.js        # 认证测试
├── posts.test.js       # 文章测试
├── comments.test.js    # 评论测试
└── utils/              # 测试工具
```

## 🔧 故障排除

### 常见问题

1. **端口被占用**
```bash
# 使用内置脚本释放端口
npm run free-port

# 或手动查找并终止进程
lsof -ti:9002 | xargs kill -9
```

2. **数据库连接失败**
- 检查数据库服务是否启动
- 验证数据库连接配置
- 确认数据库用户权限

3. **文件上传失败**
- 检查 `public/uploads` 目录权限
- 验证文件大小限制配置
- 确认磁盘空间充足

### 日志分析

```bash
# 查看实时日志
tail -f logs/app-$(date +%Y-%m-%d).log

# 查看错误日志
tail -f logs/error-$(date +%Y-%m-%d).log

# 查看HTTP请求日志
tail -f logs/http-$(date +%Y-%m-%d).log
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 遵循现有代码风格
- 添加适当的测试
- 更新相关文档
- 确保所有测试通过

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

## 📞 联系方式

- 项目地址: [https://github.com/huliangjie2005/xblog-server](https://github.com/huliangjie2005/xblog-server)
- 问题反馈: [Issues](https://github.com/huliangjie2005/xblog-server/issues)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给它一个星标！**

Made with ❤️ by [huliangjie2005](https://github.com/huliangjie2005)

</div>

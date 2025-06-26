/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: 用户ID
 *         username:
 *           type: string
 *           description: 用户名
 *         email:
 *           type: string
 *           format: email
 *           description: 电子邮箱
 *         avatar:
 *           type: string
 *           description: 头像URL
 *         nickname:
 *           type: string
 *           description: 昵称
 *         status:
 *           type: integer
 *           description: 用户状态(1-正常, 0-禁用)
 *         email_verified:
 *           type: integer
 *           description: 邮箱是否已验证(1-已验证, 0-未验证)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         last_login:
 *           type: string
 *           format: date-time
 *           description: 最后登录时间
 *       example:
 *         id: 1
 *         username: johndoe
 *         email: john@example.com
 *         avatar: /uploads/avatars/default.png
 *         nickname: John Doe
 *         status: 1
 *         email_verified: 1
 *         created_at: 2023-01-01T08:00:00Z
 *         last_login: 2023-01-10T10:30:00Z
 *     
 *     Admin:
 *       type: object
 *       required:
 *         - username
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: 管理员ID
 *         username:
 *           type: string
 *           description: 用户名
 *         email:
 *           type: string
 *           format: email
 *           description: 电子邮箱
 *         avatar:
 *           type: string
 *           description: 头像URL
 *         role:
 *           type: string
 *           description: 角色(admin, superadmin)
 *         status:
 *           type: integer
 *           description: 状态(1-正常, 0-禁用)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         last_login:
 *           type: string
 *           format: date-time
 *           description: 最后登录时间
 *       example:
 *         id: 1
 *         username: admin
 *         email: admin@example.com
 *         avatar: /uploads/avatars/admin.png
 *         role: admin
 *         status: 1
 *         created_at: 2023-01-01T08:00:00Z
 *         last_login: 2023-01-10T10:30:00Z
 *     
 *     Post:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         id:
 *           type: integer
 *           description: 文章ID
 *         title:
 *           type: string
 *           description: 文章标题
 *         slug:
 *           type: string
 *           description: 文章别名(URL友好)
 *         content:
 *           type: string
 *           description: 文章内容
 *         summary:
 *           type: string
 *           description: 文章摘要
 *         cover_image:
 *           type: string
 *           description: 封面图片URL
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *           description: 文章状态
 *         view_count:
 *           type: integer
 *           description: 浏览次数
 *         like_count:
 *           type: integer
 *           description: 点赞次数
 *         comment_count:
 *           type: integer
 *           description: 评论数量
 *         author_id:
 *           type: integer
 *           description: 作者ID
 *         category_id:
 *           type: integer
 *           description: 分类ID
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *         published_at:
 *           type: string
 *           format: date-time
 *           description: 发布时间
 *         tags:
 *           type: array
 *           description: 标签列表
 *           items:
 *             $ref: '#/components/schemas/Tag'
 *       example:
 *         id: 1
 *         title: Xblog入门指南
 *         slug: xblog-getting-started
 *         content: <p>这是一篇入门指南...</p>
 *         summary: 快速了解如何使用Xblog
 *         cover_image: /uploads/covers/xblog-guide.jpg
 *         status: published
 *         view_count: 1250
 *         like_count: 42
 *         comment_count: 7
 *         author_id: 1
 *         category_id: 3
 *         created_at: 2023-01-15T08:00:00Z
 *         updated_at: 2023-01-16T10:30:00Z
 *         published_at: 2023-01-16T12:00:00Z
 *     
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: 分类ID
 *         name:
 *           type: string
 *           description: 分类名称
 *         slug:
 *           type: string
 *           description: 分类别名(URL友好)
 *         description:
 *           type: string
 *           description: 分类描述
 *         parent_id:
 *           type: integer
 *           nullable: true
 *           description: 父分类ID
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *       example:
 *         id: 1
 *         name: 技术教程
 *         slug: tech-tutorials
 *         description: 各种技术教程和指南
 *     
 *     Tag:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: 标签ID
 *         name:
 *           type: string
 *           description: 标签名称
 *         slug:
 *           type: string
 *           description: 标签别名(URL友好)
 *         description:
 *           type: string
 *           description: 标签描述
 *       example:
 *         id: 1
 *         name: JavaScript
 *         slug: javascript
 *         description: JavaScript编程语言相关
 *     
 *     Comment:
 *       type: object
 *       required:
 *         - content
 *         - post_id
 *         - user_id
 *       properties:
 *         id:
 *           type: integer
 *           description: 评论ID
 *         content:
 *           type: string
 *           description: 评论内容
 *         post_id:
 *           type: integer
 *           description: 文章ID
 *         user_id:
 *           type: integer
 *           description: 用户ID
 *         parent_id:
 *           type: integer
 *           nullable: true
 *           description: 父评论ID(用于回复)
 *         status:
 *           type: string
 *           enum: [approved, pending, spam]
 *           description: 评论状态
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *       example:
 *         id: 1
 *         content: 这是一篇很好的文章，感谢分享！
 *         post_id: 1
 *         user_id: 2
 *         parent_id: null
 *         status: approved
 *         created_at: 2023-01-17T09:30:00Z
 *         updated_at: 2023-01-17T09:30:00Z
 *     
 *     Role:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: 角色ID
 *         name:
 *           type: string
 *           description: 角色名称
 *         description:
 *           type: string
 *           description: 角色描述
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *       example:
 *         id: 1
 *         name: editor
 *         description: 内容编辑人员
 *         created_at: 2023-01-01T08:00:00Z
 *     
 *     Permission:
 *       type: object
 *       required:
 *         - name
 *         - code
 *       properties:
 *         id:
 *           type: integer
 *           description: 权限ID
 *         name:
 *           type: string
 *           description: 权限名称
 *         code:
 *           type: string
 *           description: 权限编码
 *         description:
 *           type: string
 *           description: 权限描述
 *       example:
 *         id: 1
 *         name: 编辑文章
 *         code: post:edit
 *         description: 允许编辑文章内容
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: 用户邮箱
 *         password:
 *           type: string
 *           format: password
 *           description: 密码
 *         remember:
 *           type: boolean
 *           description: 是否记住登录状态
 *       example:
 *         email: user@example.com
 *         password: password123
 *         remember: true
 *     
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: 用户名
 *         email:
 *           type: string
 *           format: email
 *           description: 邮箱
 *         password:
 *           type: string
 *           format: password
 *           description: 密码
 *         nickname:
 *           type: string
 *           description: 昵称
 *       example:
 *         username: johndoe
 *         email: john@example.com
 *         password: password123
 *         nickname: John Doe
 *     
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 是否成功
 *         code:
 *           type: integer
 *           description: 状态码
 *         message:
 *           type: string
 *           description: 响应消息
 *         dataObject:
 *           type: object
 *           description: 响应数据
 *           properties:
 *             token:
 *               type: string
 *               description: JWT令牌
 *             userInfo:
 *               type: object
 *               description: 用户信息
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: 用户ID
 *                 username:
 *                   type: string
 *                   description: 用户名
 *                 email:
 *                   type: string
 *                   description: 电子邮箱
 *                 avatar:
 *                   type: string
 *                   description: 头像URL
 *                 email_verified:
 *                   type: integer
 *                   description: 邮箱是否已验证
 *       example:
 *         success: true
 *         code: 200
 *         message: 登录成功
 *         dataObject:
 *           token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *           userInfo:
 *             id: 1
 *             username: johndoe
 *             email: john@example.com
 *             avatar: /uploads/avatars/default.png
 *             email_verified: 1
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 是否成功
 *         code:
 *           type: integer
 *           description: 状态码
 *         message:
 *           type: string
 *           description: 错误消息
 *         errorDetails:
 *           type: array
 *           description: 详细错误信息
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 description: 错误字段
 *               message:
 *                 type: string
 *                 description: 错误信息
 *       example:
 *         success: false
 *         code: 400
 *         message: 验证失败
 *         errorDetails: [
 *           { field: "email", message: "邮箱格式不正确" },
 *           { field: "password", message: "密码长度不能少于6位" }
 *         ]
 */ 
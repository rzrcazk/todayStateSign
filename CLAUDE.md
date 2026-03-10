# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 提供该代码库的操作指南。

## 项目概述

**城市节奏 / City Rhythm** - 一个关于个人生活状态记录与同城共鸣的微信小程序。

### 架构

这是一个双组件项目：

1. **前端**：微信小程序（原生开发），位于 `/miniprogram/`
2. **后端**：Cloudflare Worker（TypeScript），位于 `/worker/`

### 技术栈

- **前端**：微信小程序框架
- **后端**：Cloudflare Worker + TypeScript
- **数据库**：Cloudflare D1（SQLite）
- **认证**：JWT + 微信登录（code2session）
- **位置服务**：腾讯地图 API 用于逆地址解析

## 常用命令

### 后端（Worker）

```bash
cd worker

# 开发服务器
npm run dev

# 部署到生产环境
npm run deploy

# 数据库操作
npm run db:create      # 创建 D1 数据库
npm run db:migrate     # 应用迁移到远程数据库
npm run db:reset       # 重置本地数据库

# 测试
npm run test           # 运行测试
npm run test:coverage  # 运行测试并生成覆盖率报告
```

### 前端（小程序）

使用微信开发者工具导入 `miniprogram` 目录。原生开发无需构建步骤。

### 部署

```bash
# 使用提供的脚本部署 Worker
./deploy.sh
```

## 配置

### 必需密钥（Cloudflare）

通过 `wrangler secret put` 设置：
- `WECHAT_APPSECRET` - 微信小程序 AppSecret
- `JWT_SECRET` - JWT 签名密钥

### 必需环境变量（wrangler.toml）

- `WECHAT_APPID` - 微信小程序 AppID
- `TENCENT_MAP_KEY` - 腾讯地图 API 密钥

### MCP 配置

项目包含 Cloudflare MCP 服务器配置，位于 `.claude/mcp.json`，用于 AI 辅助资源管理。详见 `CLOUDFLARE_MCP_README.md`。

## 代码架构

### 后端结构

```
worker/src/
├── index.ts           # 入口 - 路由分发
├── types.ts           # 共享类型和状态选项
├── routes/            # API 路由处理器
│   ├── auth.ts        # 微信登录（code2session）
│   ├── checkin.ts     # 打卡提交和历史
│   ├── statistics.ts  # 聚合城市统计数据
│   └── location.ts    # 逆地址解析和 IP 定位
├── middleware/
│   ├── auth.ts        # JWT 验证
│   └── content-security.ts  # 频率限制、敏感词过滤
├── utils/
│   ├── jwt.ts         # JWT 签名/验证
│   ├── wechat.ts      # 微信 API 辅助函数
│   ├── sensitive-words.ts   # 内容过滤
│   └── location.ts    # 位置工具函数
└── mcp/               # MCP 服务器实现
    ├── index.ts
    ├── server.ts
    └── lightweight.ts
```

### 前端结构

```
miniprogram/
├── pages/
│   ├── index/         # 打卡页（首页）
│   ├── statistics/    # 城市统计视图
│   └── profile/       # 用户个人中心和历史
├── utils/
│   ├── api.js         # 带 JWT 处理的 API 客户端
│   ├── auth.js        # 微信登录流程
│   └── location.js    # 地理位置辅助函数
├── app.js             # 应用入口
└── app.json           # 小程序配置
```

## 关键模式

### API 响应格式

所有 API 响应遵循以下结构：

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

### 认证流程

1. 小程序调用 `wx.login()` 获取 `code`
2. 前端发送 code 到 `/api/auth/login`
3. 后端通过微信 API 用 code 换取 `openid`
4. 后端返回 JWT token
5. 前端存储 token，并在请求头中添加 `Authorization: Bearer {token}`

### 状态码

四个预定义状态选项（位于 `types.ts`）：
- `1`: 搬砖中 - 颜色: #FF6B6B
- `2`: 休息中 - 颜色: #4ECDC4
- `3`: 充电中 - 颜色: #45B7D1
- `4`: 自由态 - 颜色: #96CEB4

### 数据库 Schema

**checkins 表**：
- `openid` - 用户标识（统计中已哈希处理）
- `status_code` - 1-4，需验证符合 STATUS_OPTIONS
- `city`, `province` - 位置数据
- `location_lat`, `location_lng` - 坐标
- `comment` - 可选用户评论
- `timestamp`, `created_at` - 时间戳

### 安全特性

- 频率限制：每用户每小时只能打卡一次
- 敏感词过滤：本地数据库 + 微信 API 双层检查
- 数据脱敏：统计使用哈希后的 openid
- 输入验证：所有输入在处理前都经过验证

## 测试

后端使用 Vitest 进行测试。测试应覆盖：
- 路由处理器
- 工具函数
- 中间件行为

覆盖率要求：80%+

## 重要注意事项

- 后端在 `index.ts` 中处理 CORS 预检（`OPTIONS`）请求
- 地理位置服务在地理定位失败时会回退到 IP 定位
- MCP 服务器挂载在 `/mcp` 路由，用于 AI 管理能力
- 数据库迁移文件位于 `worker/migrations/schema.sql`

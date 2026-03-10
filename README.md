# 城市节奏 / City Rhythm

一个关于个人生活状态记录与同城共鸣的微信小程序。

## 项目结构

```
todayStateSign/
├── miniprogram/          # 微信小程序前端
│   ├── pages/           # 页面
│   │   ├── index/       # 首页 - 打卡
│   │   ├── statistics/  # 统计页
│   │   └── profile/     # 个人中心
│   ├── utils/           # 工具函数
│   │   ├── api.js       # API 封装
│   │   ├── auth.js      # 微信登录
│   │   └── location.js  # 地理位置
│   ├── app.js           # 小程序入口
│   ├── app.json         # 小程序配置
│   └── app.wxss         # 全局样式
│
└── worker/              # Cloudflare Worker 后端
    ├── src/
    │   ├── index.ts     # Worker 入口
    │   ├── types.ts     # 类型定义
    │   ├── routes/      # API 路由
    │   │   ├── auth.ts
    │   │   ├── checkin.ts
    │   │   └── statistics.ts
    │   ├── middleware/  # 中间件
    │   │   └── content-security.ts
    │   └── utils/       # 工具函数
    │       ├── jwt.ts
    │       ├── wechat.ts
    │       └── sensitive-words.ts
    ├── migrations/      # 数据库迁移
    │   └── schema.sql
    ├── wrangler.toml    # Worker 配置
    └── package.json
```

## 技术栈

- **前端**: 微信小程序 (原生开发)
- **后端**: Cloudflare Worker (TypeScript)
- **数据库**: Cloudflare D1 (SQLite)
- **鉴权**: JWT + 微信登录

## 快速开始

### 1. 后端部署

```bash
cd worker

# 安装依赖
npm install

# 创建 D1 数据库
wrangler d1 create city-rhythm-db

# 更新 wrangler.toml 中的 database_id

# 执行数据库迁移
wrangler d1 migrations apply city-rhythm-db

# 设置环境变量
wrangler secret put WECHAT_APPSECRET
wrangler secret put JWT_SECRET

# 部署 Worker
wrangler deploy
```

### 2. 小程序配置

1. 在微信公众平台注册小程序，获取 `AppID` 和 `AppSecret`
2. 在小程序后台添加服务器域名白名单
3. 修改 `miniprogram/utils/api.js` 中的 `API_BASE_URL`
4. 使用微信开发者工具导入项目

## 功能特性

- ✅ 微信登录
- ✅ 状态打卡（搬砖中/休息中/充电中/自由态）
- ✅ 地理位置获取
- ✅ 敏感词过滤
- ✅ 频率限制（1小时内只能打卡一次）
- ✅ 同城统计数据（脱敏处理）
- ✅ 个人打卡历史
- ✅ 数据删除功能

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth/login | POST | 微信登录 |
| /api/checkin | POST | 提交打卡 |
| /api/checkin/history | GET | 获取打卡历史 |
| /api/statistics | GET | 获取统计数据 |
| /api/user/data | DELETE | 删除用户数据 |

## 安全特性

- JWT Token 鉴权
- 敏感词双层过滤（本地+微信API）
- 数据脱敏处理
- HTTPS 全程加密

## License

MIT

# 城市节奏 / 今日状态 / 打工日记

## 产品需求文档 (PRD)

> 一个关于个人生活状态记录与同城共鸣的小程序工具
>
> 后端架构：Cloudflare Worker + D1 数据库

---

## 1. 产品概述

### 1.1 定位
个人生活状态记录与同城共鸣工具。不是就业调查，不是数据统计平台，而是一个让用户记录当下状态、感受城市节奏的轻量级应用。

### 1.2 核心价值
- **即时记录**：3 秒完成一次状态打卡
- **同城共鸣**：看到同城市其他人的状态分布
- **个人印记**：查看自己的打卡历史与状态变化

### 1.3 目标用户
- 20-40 岁城市生活者
- 关注个人生活状态的年轻人
- 想要寻找同城共鸣的用户

---

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      微信小程序                          │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ 首页    │  │  统计页     │  │     个人中心        │ │
│  │ 打卡    │  │  可视化     │  │   历史/分享         │ │
│  └────┬────┘  └──────┬──────┘  └──────────┬──────────┘ │
│       └───────────────┴────────────────────┘            │
│                         │                               │
│                    HTTPS API                            │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│              Cloudflare Worker (边缘计算)                │
│  ┌────────────┐  ┌─────┴──────┐  ┌──────────────────┐  │
│  │ 路由处理   │  │ 中间件层   │  │   API 控制器     │  │
│  │            │  │ - JWT 鉴权 │  │ - 登录/打卡      │  │
│  │            │  │ - 内容安全 │  │ - 统计/历史      │  │
│  └────────────┘  └────────────┘  └────────┬─────────┘  │
│                                           │             │
│                                    ┌──────┴──────┐     │
│                                    │   D1 数据库  │     │
│                                    │  (SQLite)   │     │
│                                    └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 微信小程序 | 原生开发 |
| 后端 | Cloudflare Worker | Serverless Edge Computing |
| 数据库 | Cloudflare D1 | SQLite-based 边缘数据库 |
| 鉴权 | JWT + 微信登录 | OpenID 识别用户 |
| 安全 | 微信内容安全 API | 文本/图片审核 |

### 2.3 部署架构

```
用户请求 → Cloudflare Anycast Network → 最近边缘节点
                                          ↓
                                   Worker 执行
                                          ↓
                                   D1 数据库查询
                                          ↓
                                   边缘节点返回响应
```

---

## 3. 功能需求

### 3.1 首页（打卡页）

**功能描述**：用户选择当前状态并提交打卡

**状态选项**：
| 状态码 | 状态名 | 图标 | 颜色 |
|--------|--------|------|------|
| 1 | 搬砖中 | 💼 | #FF6B6B |
| 2 | 休息中 | ☕ | #4ECDC4 |
| 3 | 充电中 | 🔋 | #45B7D1 |
| 4 | 自由态 | 🌈 | #96CEB4 |

**交互流程**：
1. 用户进入首页
2. 自动获取地理位置（需授权）
3. 用户选择状态
4. 可选填写留言（限 50 字）
5. 点击"打卡"提交
6. 显示打卡成功动画

**地理位置处理**：
- 使用 `wx.getLocation` 获取经纬度
- 使用腾讯地图 API 逆地址解析获取省/市

**打卡限制**：
- 同一用户 1 小时内只能打卡一次
- 留言需通过敏感词过滤

### 3.2 统计页

**功能描述**：展示同城用户状态分布（脱敏数据）

**数据展示**：
1. **状态分布饼图**：各状态占比
2. **时段分布柱状图**：24 小时打卡趋势
3. **地图热力图**：城市内打卡热力分布

**数据脱敏原则**：
- 只显示百分比，不显示具体人数
- 数据聚合到城市级别
- 少于 10 人的数据不显示具体数字

**示例**：
```
错误："北京市有 1234 人在搬砖中"
正确："搬砖中 - 45% 的同城伙伴"
```

### 3.3 个人中心

**功能描述**：用户个人相关功能

**功能列表**：
1. **打卡历史**：时间线展示历史打卡记录
2. **状态统计**：个人各状态占比饼图
3. **生成海报**：分享打卡状态到朋友圈
4. **隐私协议**：查看隐私政策
5. **清除数据**：删除个人所有打卡记录

---

## 4. API 接口文档

### 4.1 鉴权说明

所有 API（除登录外）需在 Header 中携带：
```
Authorization: Bearer <jwt_token>
```

### 4.2 接口列表

#### 4.2.1 微信登录

```
POST /api/auth/login

请求参数：
{
  "code": "微信登录凭证"
}

响应：
{
  "success": true,
  "data": {
    "token": "JWT Token",
    "openid": "用户 OpenID（脱敏）"
  }
}

错误码：
400 - 参数错误
401 - 微信登录失败
500 - 服务器错误
```

#### 4.2.2 提交打卡

```
POST /api/checkin

请求头：
Authorization: Bearer <token>

请求参数：
{
  "status_code": 1,           // 状态码：1-4
  "province": "北京市",        // 省份
  "city": "北京市",            // 城市
  "location_lat": 39.9042,    // 纬度
  "location_lng": 116.4074,   // 经度
  "comment": "今天加班到很晚"   // 留言（可选，限50字）
}

响应：
{
  "success": true,
  "data": {
    "id": 123,
    "timestamp": "2026-03-09T14:30:00Z"
  }
}

错误码：
400 - 参数错误或敏感词
401 - 未授权
429 - 操作过于频繁（1小时内已打卡）
500 - 服务器错误
```

#### 4.2.3 获取统计数据

```
GET /api/statistics?city=北京市&province=北京市

请求头：
Authorization: Bearer <token>

响应：
{
  "success": true,
  "data": {
    "status_distribution": {
      "搬砖中": 45,
      "休息中": 25,
      "充电中": 20,
      "自由态": 10
    },
    "hourly_distribution": [
      {"hour": 0, "percentage": 2},
      {"hour": 1, "percentage": 1},
      // ... 24小时数据
    ],
    "total_participants": "1000+",  // 模糊化显示
    "last_updated": "2026-03-09T14:00:00Z"
  }
}

注意：返回的是百分比，不是具体人数
```

#### 4.2.4 获取个人历史

```
GET /api/checkin/history?page=1&limit=20

请求头：
Authorization: Bearer <token>

响应：
{
  "success": true,
  "data": {
    "records": [
      {
        "id": 123,
        "status_code": 1,
        "status_name": "搬砖中",
        "city": "北京市",
        "timestamp": "2026-03-09T14:30:00Z",
        "comment": "今天加班到很晚"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

#### 4.2.5 删除个人数据

```
DELETE /api/user/data

请求头：
Authorization: Bearer <token>

响应：
{
  "success": true,
  "data": {
    "deleted_count": 50
  }
}
```

---

## 5. 数据库设计

### 5.1 表结构

#### checkins（打卡表）

```sql
CREATE TABLE checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openid TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  status_code INTEGER NOT NULL CHECK (status_code IN (1,2,3,4)),
  province TEXT,
  city TEXT,
  location_lat REAL,
  location_lng REAL,
  comment TEXT,

  -- 索引
  INDEX idx_openid (openid),
  INDEX idx_city_timestamp (city, timestamp),
  INDEX idx_timestamp (timestamp)
);
```

#### sensitive_words（敏感词表）

```sql
CREATE TABLE sensitive_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'general',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初始化敏感词
INSERT INTO sensitive_words (word, category) VALUES
('失业', 'employment'),
('就业率', 'employment'),
('下岗', 'employment'),
('裁员', 'employment'),
('招聘', 'employment'),
('找工作', 'employment');
```

### 5.2 数据关系

```
┌─────────────┐
│   checkins  │
├─────────────┤
│ PK id       │
│    openid   │─────┐
│    status   │     │
│    location │     │
│    comment  │     │
└─────────────┘     │
                    │
┌─────────────┐     │
│sensitive_   │     │
│words        │     │
├─────────────┤     │
│ PK id       │     │
│    word     │     │
│    category │     │
└─────────────┘     │
                    │
              ┌─────┴─────┐
              │   users   │  (仅内存缓存)
              │  (openid) │
              └───────────┘
```

---

## 6. 安全与合规

### 6.1 敏感词过滤

**双层过滤机制**：

1. **本地敏感词库**（快速过滤）
   - 查询 D1 的 sensitive_words 表
   - 匹配即拒绝

2. **微信内容安全 API**（深度审核）
   ```javascript
   // 调用微信 msgSecCheck
   POST https://api.weixin.qq.com/wxa/msg_sec_check
   ```

**敏感词类别**：
- 就业相关：失业、就业率、下岗、裁员、招聘等
- 政治敏感：根据法规要求
- 辱骂/色情：通用敏感词

### 6.2 数据脱敏

**原则**：绝不展示可被解读为就业统计的数据

| 数据项 | 处理方式 | 示例 |
|--------|----------|------|
| 人数 | 模糊化 | "1000+" 代替 "1234" |
| 百分比 | 四舍五入 | 显示为整数百分比 |
| 地理位置 | 城市级聚合 | 不展示具体坐标 |
| 个人信息 | OpenID 标识 | 不存储真实姓名/手机号 |

### 6.3 隐私保护

- 仅存储 OpenID，不获取用户头像/昵称
- 用户可随时删除个人数据
- 地理位置仅用于城市识别，不精确追踪
- 数据传输全程 HTTPS

### 6.4 合规检查清单

- [ ] 敏感词过滤已启用
- [ ] 微信内容安全 API 已接入
- [ ] 数据脱敏逻辑已验证
- [ ] 隐私协议已编写
- [ ] 用户数据删除功能已实现
- [ ] 地理位置授权说明已添加
- [ ] 小程序审核材料已准备

---

## 7. 部署配置

### 7.1 Cloudflare 配置

#### wrangler.toml

```toml
name = "city-rhythm-worker"
main = "src/index.ts"
compatibility_date = "2026-03-09"

[[d1_databases]]
binding = "DB"
database_name = "city-rhythm-db"
database_id = "your-database-id"

[vars]
WECHAT_APPID = "your-app-id"
JWT_SECRET = "your-jwt-secret"

# 敏感信息使用 wrangler secret
# wrangler secret put WECHAT_APPSECRET
```

### 7.2 环境变量

| 变量名 | 说明 | 设置方式 |
|--------|------|----------|
| WECHAT_APPID | 微信小程序 AppID | wrangler.toml |
| WECHAT_APPSECRET | 微信小程序密钥 | wrangler secret |
| JWT_SECRET | JWT 签名密钥 | wrangler secret |
| DB | D1 数据库绑定 | wrangler.toml |

### 7.3 部署步骤

1. **创建 D1 数据库**
   ```bash
   wrangler d1 create city-rhythm-db
   ```

2. **执行数据库迁移**
   ```bash
   wrangler d1 execute city-rhythm-db --file=./schema.sql
   ```

3. **设置环境变量**
   ```bash
   wrangler secret put WECHAT_APPSECRET
   wrangler secret put JWT_SECRET
   ```

4. **部署 Worker**
   ```bash
   wrangler deploy
   ```

5. **小程序配置**
   - 在小程序后台添加 request 合法域名
   - 添加 Worker 域名到服务器域名白名单

---

## 8. 项目结构

### 8.1 前端目录

```
miniprogram/
├── app.js
├── app.json
├── app.wxss
├── pages/
│   ├── index/          # 首页打卡
│   │   ├── index.js
│   │   ├── index.wxml
│   │   └── index.wxss
│   ├── statistics/     # 统计页
│   │   ├── statistics.js
│   │   ├── statistics.wxml
│   │   └── statistics.wxss
│   └── profile/        # 个人中心
│       ├── profile.js
│       ├── profile.wxml
│       └── profile.wxss
├── components/
│   └── status-selector/  # 状态选择组件
├── utils/
│   ├── api.js          # API 封装
│   ├── auth.js         # 微信登录
│   └── location.js     # 地理位置
└── images/             # 静态资源
```

### 8.2 后端目录

```
worker/
├── src/
│   ├── index.ts        # Worker 入口
│   ├── routes/
│   │   ├── auth.ts     # 登录路由
│   │   ├── checkin.ts  # 打卡路由
│   │   └── statistics.ts  # 统计路由
│   ├── middleware/
│   │   ├── auth.ts     # JWT 鉴权
│   │   └── content-security.ts  # 内容安全
│   ├── db/
│   │   └── schema.sql  # 数据库 Schema
│   └── utils/
│       ├── jwt.ts      # JWT 工具
│       ├── wechat.ts   # 微信 API
│       └── sensitive-words.ts  # 敏感词过滤
├── wrangler.toml
└── package.json
```

---

## 9. 性能优化

### 9.1 前端优化

- 首页数据预加载
- 图片懒加载
- 本地缓存打卡状态
- 减少 setData 调用次数

### 9.2 后端优化

- D1 数据库索引优化
- 统计数据缓存（Worker Cache API）
- 批量查询优化

---

## 10. 测试计划

### 10.1 功能测试

| 测试项 | 预期结果 |
|--------|----------|
| 微信登录 | 正常获取 Token |
| 打卡提交 | 成功记录到 D1 |
| 敏感词过滤 | 含敏感词内容被拒绝 |
| 频率限制 | 1小时内重复打卡被拒绝 |
| 数据脱敏 | 统计接口返回百分比 |

### 10.2 压力测试

- 模拟 1000 并发打卡
- 验证 D1 性能表现
- 测试 Worker 冷启动时间

---

## 11. 附录

### 11.1 状态码定义

| 码值 | 含义 |
|------|------|
| 1 | 搬砖中（工作中） |
| 2 | 休息中（放松中） |
| 3 | 充电中（学习中） |
| 4 | 自由态（其他状态） |

### 11.2 错误码定义

| 码值 | 含义 |
|------|------|
| 400 | 请求参数错误 |
| 401 | 未授权/Token 无效 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

**文档版本**: 1.0
**更新日期**: 2026-03-09
**架构版本**: Cloudflare Worker + D1

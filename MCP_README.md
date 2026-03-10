# 城市节奏 MCP Server

本项目已集成 MCP (Model Context Protocol) 支持，允许 AI 助手通过标准化接口访问打卡数据。

## 部署后配置

### 1. 更新 mcp.json

将 `mcp.json` 中的 URL 替换为你的 Worker 实际域名：

```json
{
  "mcpServers": {
    "city-rhythm": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker-domain.workers.dev/mcp/sse"
      ]
    }
  }
}
```

### 2. Claude Desktop 配置

将以下内容添加到 Claude Desktop 的配置文件中：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "city-rhythm": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker-domain.workers.dev/mcp/sse"
      ]
    }
  }
}
```

### 3. 安装 mcp-remote

```bash
npm install -g mcp-remote
```

## 可用工具

MCP Server 提供以下工具：

### 1. `get_city_statistics`
获取指定城市的打卡统计数据

**参数：**
- `city` (string, required): 城市名称，例如：北京、上海、广州
- `province` (string, optional): 省份名称

**返回：**
- 状态分布（搬砖中、休息中、充电中、自由态）
- 总参与人数（模糊化）
- 24小时时段分布

### 2. `get_status_options`
获取所有可用的打卡状态选项

**返回：**
- 状态码、名称、图标、颜色、描述

### 3. `query_checkin_history`
查询指定用户的打卡历史记录

**参数：**
- `openid` (string, required): 用户的微信 OpenID
- `page` (number, optional): 页码，默认 1
- `limit` (number, optional): 每页记录数，默认 20

**返回：**
- 打卡记录列表
- 分页信息

### 4. `get_popular_cities`
获取打卡最活跃的城市列表

**参数：**
- `limit` (number, optional): 返回城市数量，默认 10

**返回：**
- 城市排名
- 各城市的打卡次数和用户数

### 5. `get_hourly_trends`
获取指定城市24小时打卡趋势数据

**参数：**
- `city` (string, required): 城市名称
- `hours` (number, optional): 查询小时数，默认 24

**返回：**
- 24小时时段分布
- 高峰时段
- 总打卡数

## API 端点

除了 MCP 协议，还提供以下 HTTP 端点：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/mcp/tools` | GET | 获取可用工具列表 |
| `/mcp/rpc` | POST | JSON-RPC 请求端点 |
| `/mcp/sse` | GET | SSE 流式通信端点 |

## 示例使用

### 获取北京统计数据

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_city_statistics",
    "arguments": {
      "city": "北京"
    }
  }
}
```

### 获取热门城市

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_popular_cities",
    "arguments": {
      "limit": 5
    }
  }
}
```

## 技术栈

- **MCP SDK**: `@modelcontextprotocol/sdk`
- **传输协议**: SSE (Server-Sent Events) + HTTP JSON-RPC
- **数据验证**: Zod

## 注意事项

1. MCP 端点不需要 JWT 认证（只暴露统计数据）
2. 用户历史记录查询需要 openid，请确保在授权环境下使用
3. 所有数据均为最近24小时的统计

## 参考资料

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [Cloudflare MCP Server 示例](https://github.com/cloudflare/mcp-server-cloudflare)

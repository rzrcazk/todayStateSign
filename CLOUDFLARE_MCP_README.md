# Cloudflare MCP 配置指南

本项目已配置 Cloudflare MCP servers，可通过 AI 助手管理 Cloudflare 资源。

## 支持的 MCP Servers

| Server | URL | 功能 |
|--------|-----|------|
| `cloudflare-workers` | `https://workers-bindings.mcp.cloudflare.com/mcp` | 管理 Workers、KV、D1 等绑定 |
| `cloudflare-logs` | `https://observability.mcp.cloudflare.com/mcp` | 查看日志和可观测性数据 |
| `cloudflare-builds` | `https://builds.mcp.cloudflare.com/mcp` | 管理 CI/CD 构建 |

## 配置步骤

### 1. 创建 Cloudflare API Token

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 "Create Token"
3. 选择 "Custom token" 模板
4. 配置权限：
   - **Account**: `Cloudflare Workers`, `Edit`
   - **Zone**: 你的域名, `Read`
   - **Account**: `Account`, `Read`
5. 保存 Token

### 2. 设置环境变量

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件，填入你的 API Token
export CLOUDFLARE_API_TOKEN=your_api_token_here
```

### 3. 安装 mcp-remote

```bash
npm install -g mcp-remote
```

### 4. 配置 Claude Desktop (或 Cursor)

将 `.claude/mcp.json` 复制到 Claude Desktop 配置目录：

**macOS:**
```bash
cp .claude/mcp.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
copy .claude/mcp.json %APPDATA%\Claude\claude_desktop_config.json
```

**注意**: 需要替换环境变量为实际的 API Token，或使用环境变量注入。

## 使用示例

配置完成后，你可以在对话中直接让 AI 帮你：

### 部署 Worker
```
帮我部署 worker 到生产环境
```

### 查看日志
```
查看 city-rhythm-worker 最近1小时的日志
```

### 管理 D1 数据库
```
查看 city-rhythm-db 数据库的表结构
```

### 查看构建状态
```
查看最近的 Workers 构建记录
```

## 可用工具

### Workers Bindings Server
- 管理 Workers 脚本
- 管理 KV 命名空间
- 管理 D1 数据库
- 管理 R2 存储
- 查看 Worker 配置

### Observability Server
- 查看实时日志
- 查询 Workers Analytics
- 查看请求指标
- 分析错误日志

### Builds Server
- 查看构建历史
- 触发新构建
- 管理部署
- 查看构建日志

## 故障排除

### Token 权限不足
如果出现权限错误，请检查你的 API Token 是否有以下权限：
- `Cloudflare Workers:Edit`
- `Zone:Read` (如果管理域名)

### 环境变量未生效
确保在启动 Claude Desktop 前已经导出环境变量：
```bash
export CLOUDFLARE_API_TOKEN=xxx
open -a "Claude"
```

或在配置文件中硬编码（不推荐用于生产环境）：
```json
{
  "mcpServers": {
    "cloudflare-workers": {
      "command": "npx",
      "args": ["mcp-remote", "https://workers-bindings.mcp.cloudflare.com/mcp"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your_actual_token_here"
      }
    }
  }
}
```

## 参考资料

- [Cloudflare MCP Server GitHub](https://github.com/cloudflare/mcp-server-cloudflare)
- [Cloudflare API Tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [MCP Protocol](https://modelcontextprotocol.io/)

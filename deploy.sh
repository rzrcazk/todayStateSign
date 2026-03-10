#!/bin/bash
# Cloudflare Worker 部署脚本

set -e

echo "🚀 开始部署 city-rhythm-worker..."

# 设置变量
export CLOUDFLARE_API_TOKEN="j1_zo2ZtYEmikiXUbVKEQ3-MCqQXi32cRi5cMlZo"
export CLOUDFLARE_ACCOUNT_ID="096860603b9ca62b7ea5f715c53d1557"

cd "$(dirname "$0")/worker"

# 检查 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "📦 安装 wrangler..."
    npm install -g wrangler
fi

# 登录（如果还没登录）
echo "🔑 检查登录状态..."
wrangler whoami || wrangler login

# 执行数据库迁移（如果有 schema.sql）
if [ -f "./migrations/schema.sql" ]; then
    echo "🗄️  执行数据库迁移..."
    wrangler d1 execute city-rhythm-db --file=./migrations/schema.sql --remote
fi

# 部署 Worker
echo "📤 部署 Worker..."
wrangler deploy

# 设置 Secrets
echo "🔐 请设置 Secrets..."
echo ""
echo "请依次输入以下值（如果不想设置可以按 Ctrl+C 跳过）:"
echo ""

read -p "WECHAT_APPSECRET: " WECHAT_APPSECRET
if [ ! -z "$WECHAT_APPSECRET" ]; then
    echo "$WECHAT_APPSECRET" | wrangler secret put WECHAT_APPSECRET
fi

read -p "JWT_SECRET: " JWT_SECRET
if [ ! -z "$JWT_SECRET" ]; then
    echo "$JWT_SECRET" | wrangler secret put JWT_SECRET
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "Worker URL: https://city-rhythm-worker.your-subdomain.workers.dev"
echo ""
echo "你可以通过以下命令查看日志:"
echo "  wrangler tail"

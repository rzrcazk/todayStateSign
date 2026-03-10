// Cloudflare Worker 入口文件
import type { Env } from './types';
import { handleLogin } from './routes/auth';
import { handleCheckin, handleGetHistory, handleDeleteUserData } from './routes/checkin';
import { handleGetStatistics } from './routes/statistics';
import { handleReverseGeocode, handleIPLocation } from './routes/location';
import { createMCP } from './mcp';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // MCP 路由 - 放在最前面优先处理
      if (path.startsWith('/mcp')) {
        const mcpServer = createMCP(env);
        return await mcpServer.handleRequest(request);
      }

      // 路由分发
      switch (path) {
        // 认证相关
        case '/api/auth/login':
          return await handleLogin(request, env);

        // 打卡相关
        case '/api/checkin':
          return await handleCheckin(request, env);

        case '/api/checkin/history':
          return await handleGetHistory(request, env);

        // 统计相关
        case '/api/statistics':
          return await handleGetStatistics(request, env);

        // 位置服务
        case '/api/location/reverse':
          return await handleReverseGeocode(request, env);

        case '/api/location/ip':
          return await handleIPLocation(request, env);

        // 用户数据
        case '/api/user/data':
          return await handleDeleteUserData(request, env);

        // 健康检查
        case '/health':
          return jsonResponse({ success: true, message: 'OK' });

        default:
          return jsonResponse({
            success: false,
            error: 'Not found',
          }, 404);
      }

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({
        success: false,
        error: 'Internal server error',
      }, 500);
    }
  },
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

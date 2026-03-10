// MCP Server 完整实现 - 使用 @modelcontextprotocol/sdk
// 需要安装依赖: npm install @modelcontextprotocol/sdk zod

import type { Env } from '../types';

// 工具定义
interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const TOOLS: Tool[] = [
  {
    name: 'get_city_statistics',
    description: '获取指定城市的打卡统计数据，包括状态分布、时段分布和参与人数',
    inputSchema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称，例如：北京、上海、广州',
        },
        province: {
          type: 'string',
          description: '省份名称（可选），例如：广东、浙江',
        },
      },
      required: ['city'],
    },
  },
  {
    name: 'get_status_options',
    description: '获取所有可用的打卡状态选项',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_checkin_history',
    description: '查询指定用户的打卡历史记录（需要用户授权）',
    inputSchema: {
      type: 'object',
      properties: {
        openid: {
          type: 'string',
          description: '用户的微信 OpenID',
        },
        page: {
          type: 'number',
          description: '页码，从1开始',
        },
        limit: {
          type: 'number',
          description: '每页记录数，最大50',
        },
      },
      required: ['openid'],
    },
  },
  {
    name: 'get_popular_cities',
    description: '获取打卡最活跃的城市列表',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: '返回城市数量',
        },
      },
    },
  },
  {
    name: 'get_hourly_trends',
    description: '获取指定城市24小时打卡趋势数据',
    inputSchema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称',
        },
        hours: {
          type: 'number',
          description: '查询小时数，默认24小时',
        },
      },
      required: ['city'],
    },
  },
];

export class CityRhythmMCPServer {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 工具列表
    if (path === '/mcp/tools' || path === '/mcp/') {
      return this.jsonResponse({ tools: TOOLS });
    }

    // JSON-RPC 端点
    if (path === '/mcp/rpc' || path === '/mcp/jsonrpc') {
      return this.handleJSONRPC(request);
    }

    // SSE 端点
    if (path === '/mcp/sse') {
      return this.handleSSE(request);
    }

    // 直接工具调用（简化版）
    if (path.startsWith('/mcp/call/')) {
      const toolName = path.replace('/mcp/call/', '');
      return this.handleDirectCall(request, toolName);
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleJSONRPC(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return this.errorResponse('Method not allowed', 405);
    }

    try {
      const body = await request.json() as {
        jsonrpc?: string;
        method?: string;
        params?: unknown;
        id?: string | number;
      };

      if (body.jsonrpc !== '2.0') {
        return this.jsonResponse({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Invalid Request' },
          id: body.id || null,
        }, 400);
      }

      let result: unknown;

      switch (body.method) {
        case 'tools/list':
          result = { tools: TOOLS };
          break;
        case 'tools/call': {
          const params = body.params as { name: string; arguments: Record<string, unknown> };
          result = await this.executeTool(params.name, params.arguments);
          break;
        }
        default:
          return this.jsonResponse({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${body.method}` },
            id: body.id || null,
          }, 404);
      }

      return this.jsonResponse({
        jsonrpc: '2.0',
        result,
        id: body.id || null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      return this.jsonResponse({
        jsonrpc: '2.0',
        error: { code: -32603, message },
        id: null,
      }, 500);
    }
  }

  private async handleDirectCall(request: Request, toolName: string): Promise<Response> {
    if (request.method !== 'POST') {
      return this.errorResponse('Method not allowed', 405);
    }

    try {
      const args = await request.json() as Record<string, unknown>;
      const result = await this.executeTool(toolName, args);
      return this.jsonResponse(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      return this.errorResponse(message, 500);
    }
  }

  private async handleSSE(request: Request): Promise<Response> {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // 发送初始事件
    writer.write(
      encoder.encode(
        `event: connected\ndata: ${JSON.stringify({ message: 'MCP SSE Connected' })}\n\n`
      )
    );

    // 定期发送心跳
    const heartbeat = setInterval(() => {
      writer.write(encoder.encode('event: heartbeat\ndata: {}\n\n'));
    }, 30000);

    // 清理
    request.signal?.addEventListener('abort', () => {
      clearInterval(heartbeat);
      writer.close();
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    switch (name) {
      case 'get_city_statistics':
        return this.getCityStatistics(args.city as string);
      case 'get_status_options':
        return this.getStatusOptions();
      case 'query_checkin_history':
        return this.queryCheckinHistory(
          args.openid as string,
          (args.page as number) || 1,
          (args.limit as number) || 20
        );
      case 'get_popular_cities':
        return this.getPopularCities((args.limit as number) || 10);
      case 'get_hourly_trends':
        return this.getHourlyTrends(args.city as string, (args.hours as number) || 24);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getCityStatistics(city: string): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { results: statusResults } = await this.env.DB.prepare(
      `SELECT status_code, COUNT(*) as count
       FROM checkins
       WHERE city = ? AND timestamp > ?
       GROUP BY status_code`
    )
      .bind(city, oneDayAgo)
      .all<{ status_code: number; count: number }>();

    const { results: totalResults } = await this.env.DB.prepare(
      `SELECT COUNT(DISTINCT openid) as total
       FROM checkins
       WHERE city = ? AND timestamp > ?`
    )
      .bind(city, oneDayAgo)
      .first<{ total: number }>();

    const totalParticipants = totalResults?.total || 0;

    const statusMap: Record<number, string> = {
      1: '搬砖中',
      2: '休息中',
      3: '充电中',
      4: '自由态',
    };

    const statusDistribution: Record<string, { count: number; percentage: number }> = {};
    let totalCheckins = 0;

    for (const row of statusResults) {
      totalCheckins += row.count;
    }

    for (const row of statusResults) {
      const statusName = statusMap[row.status_code] || '未知';
      const percentage = totalCheckins > 0
        ? Math.round((row.count / totalCheckins) * 100)
        : 0;
      statusDistribution[statusName] = { count: row.count, percentage };
    }

    for (const [code, name] of Object.entries(statusMap)) {
      if (!(name in statusDistribution)) {
        statusDistribution[name] = { count: 0, percentage: 0 };
      }
    }

    let fuzzyTotal: string;
    if (totalParticipants < 10) {
      fuzzyTotal = '10人以下';
    } else if (totalParticipants < 100) {
      fuzzyTotal = '10+';
    } else if (totalParticipants < 1000) {
      fuzzyTotal = '100+';
    } else if (totalParticipants < 10000) {
      fuzzyTotal = '1000+';
    } else {
      fuzzyTotal = '10000+';
    }

    const result = {
      city,
      status_distribution: statusDistribution,
      total_participants: fuzzyTotal,
      period: '最近24小时',
      last_updated: new Date().toISOString(),
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async getStatusOptions(): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const statusOptions = [
      { code: 1, name: '搬砖中', icon: '💼', color: '#FF6B6B', description: '正在工作中' },
      { code: 2, name: '休息中', icon: '☕', color: '#4ECDC4', description: '正在休息放松' },
      { code: 3, name: '充电中', icon: '🔋', color: '#45B7D1', description: '正在学习或提升自己' },
      { code: 4, name: '自由态', icon: '🌈', color: '#96CEB4', description: '享受自由时光' },
    ];

    return {
      content: [{ type: 'text', text: JSON.stringify(statusOptions, null, 2) }],
    };
  }

  private async queryCheckinHistory(
    openid: string,
    page: number,
    limit: number
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const offset = (page - 1) * limit;

    const countResult = await this.env.DB.prepare(
      'SELECT COUNT(*) as total FROM checkins WHERE openid = ?'
    )
      .bind(openid)
      .first<{ total: number }>();

    const total = countResult?.total || 0;

    const { results } = await this.env.DB.prepare(
      `SELECT id, status_code, city, timestamp, comment
       FROM checkins
       WHERE openid = ?
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`
    )
      .bind(openid, limit, offset)
      .all<{
        id: number;
        status_code: number;
        city: string;
        timestamp: string;
        comment: string | null;
      }>();

    const statusMap: Record<number, string> = {
      1: '搬砖中',
      2: '休息中',
      3: '充电中',
      4: '自由态',
    };

    const records = results.map((record) => ({
      id: record.id,
      status_code: record.status_code,
      status_name: statusMap[record.status_code] || '未知',
      city: record.city,
      timestamp: record.timestamp,
      comment: record.comment,
    }));

    const result = {
      records,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async getPopularCities(limit: number): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { results } = await this.env.DB.prepare(
      `SELECT city, COUNT(*) as checkin_count, COUNT(DISTINCT openid) as user_count
       FROM checkins
       WHERE timestamp > ?
       GROUP BY city
       ORDER BY checkin_count DESC
       LIMIT ?`
    )
      .bind(oneDayAgo, limit)
      .all<{ city: string; checkin_count: number; user_count: number }>();

    const cities = results.map((row, index) => ({
      rank: index + 1,
      city: row.city,
      checkin_count: row.checkin_count,
      user_count: row.user_count,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(cities, null, 2) }],
    };
  }

  private async getHourlyTrends(city: string, hours: number): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { results: hourlyResults } = await this.env.DB.prepare(
      `SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as count
       FROM checkins
       WHERE city = ? AND timestamp > ?
       GROUP BY hour
       ORDER BY hour`
    )
      .bind(city, timeAgo)
      .all<{ hour: number; count: number }>();

    const hourMap = new Map(hourlyResults.map((r) => [r.hour, r.count]));
    const hourlyDistribution = [];

    for (let hour = 0; hour < 24; hour++) {
      const count = hourMap.get(hour) || 0;
      hourlyDistribution.push({
        hour,
        hour_formatted: `${hour.toString().padStart(2, '0')}:00`,
        count,
      });
    }

    const totalCheckins = hourlyResults.reduce((sum, r) => sum + r.count, 0);

    const result = {
      city,
      period: `最近${hours}小时`,
      total_checkins: totalCheckins,
      hourly_distribution: hourlyDistribution,
      peak_hour: hourlyDistribution.reduce((max, curr) =>
        curr.count > max.count ? curr : max
      , hourlyDistribution[0]),
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  private errorResponse(message: string, status = 500): Response {
    return this.jsonResponse({ error: message }, status);
  }
}

// 导出工厂函数
export function createMCPServer(env: Env): CityRhythmMCPServer {
  return new CityRhythmMCPServer(env);
}

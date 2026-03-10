// 统计路由
import type { Env, ApiResponse, StatisticsData } from '../types';
import { verifyToken } from '../utils/jwt';

export async function handleGetStatistics(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse<ApiResponse<never>>({
      success: false,
      error: 'Method not allowed',
    }, 405);
  }

  try {
    // 验证 JWT
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Unauthorized',
      }, 401);
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token, env.JWT_SECRET);

    if (!payload) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Invalid token',
      }, 401);
    }

    // 获取查询参数
    const url = new URL(request.url);
    const city = url.searchParams.get('city');
    const province = url.searchParams.get('province');

    if (!city) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Missing city parameter',
      }, 400);
    }

    // 计算 24 小时前的时间
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 查询状态分布（最近 24 小时）
    const { results: statusResults } = await env.DB.prepare(
      `SELECT status_code, COUNT(*) as count
       FROM checkins
       WHERE city = ? AND timestamp > ?
       GROUP BY status_code`
    )
      .bind(city, oneDayAgo)
      .all<{ status_code: number; count: number }>();

    // 查询总参与者数（去重 openid）
    const { results: totalResults } = await env.DB.prepare(
      `SELECT COUNT(DISTINCT openid) as total
       FROM checkins
       WHERE city = ? AND timestamp > ?`
    )
      .bind(city, oneDayAgo)
      .first<{ total: number }>();

    const totalParticipants = totalResults?.total || 0;

    // 查询 24 小时时段分布
    const { results: hourlyResults } = await env.DB.prepare(
      `SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as count
       FROM checkins
       WHERE city = ? AND timestamp > ?
       GROUP BY hour
       ORDER BY hour`
    )
      .bind(city, oneDayAgo)
      .all<{ hour: number; count: number }>();

    // 计算状态分布百分比
    const statusMap: Record<number, string> = {
      1: '搬砖中',
      2: '休息中',
      3: '充电中',
      4: '自由态',
    };

    const statusDistribution: Record<string, number> = {};
    let totalCheckins = 0;

    for (const row of statusResults) {
      totalCheckins += row.count;
    }

    // 计算各状态百分比（四舍五入到整数）
    for (const row of statusResults) {
      const statusName = statusMap[row.status_code] || '未知';
      const percentage = totalCheckins > 0
        ? Math.round((row.count / totalCheckins) * 100)
        : 0;
      statusDistribution[statusName] = percentage;
    }

    // 确保所有状态都有值
    for (const [code, name] of Object.entries(statusMap)) {
      if (!(name in statusDistribution)) {
        statusDistribution[name] = 0;
      }
    }

    // 计算时段分布百分比
    const hourlyDistribution: Array<{ hour: number; percentage: number }> = [];
    const hourMap = new Map(hourlyResults.map(r => [r.hour, r.count]));

    for (let hour = 0; hour < 24; hour++) {
      const count = hourMap.get(hour) || 0;
      const percentage = totalCheckins > 0
        ? Math.round((count / totalCheckins) * 100)
        : 0;
      hourlyDistribution.push({ hour, percentage });
    }

    // 模糊化总参与者数
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

    const data: StatisticsData = {
      status_distribution: statusDistribution,
      hourly_distribution: hourlyDistribution,
      total_participants: fuzzyTotal,
      last_updated: new Date().toISOString(),
    };

    return jsonResponse<ApiResponse<StatisticsData>>({
      success: true,
      data,
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    return jsonResponse<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
}

function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

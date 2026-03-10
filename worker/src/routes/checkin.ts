// 打卡路由
import type { Env, ApiResponse, CheckinRecord, STATUS_OPTIONS } from '../types';
import { verifyToken } from '../utils/jwt';
import { contentSecurityMiddleware, rateLimitMiddleware } from '../middleware/content-security';

interface CheckinRequest {
  status_code: number;
  province: string;
  city: string;
  location_lat?: number;
  location_lng?: number;
  comment?: string;
}

interface CheckinResponse {
  id: number;
  timestamp: string;
}

interface HistoryResponse {
  records: Array<{
    id: number;
    status_code: number;
    status_name: string;
    city: string;
    timestamp: string;
    comment: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
}

// 提交打卡
export async function handleCheckin(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
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

    const body = await request.json() as CheckinRequest;

    // 参数验证
    if (!body.status_code || ![1, 2, 3, 4].includes(body.status_code)) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Invalid status_code. Must be 1, 2, 3, or 4',
      }, 400);
    }

    if (!body.city) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Missing city parameter',
      }, 400);
    }

    // 检查留言长度
    if (body.comment && body.comment.length > 50) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Comment exceeds 50 characters limit',
      }, 400);
    }

    // 频率限制检查
    const rateCheck = await rateLimitMiddleware(payload.openid, env);
    if (!rateCheck.success) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: rateCheck.error,
      }, rateCheck.status || 429);
    }

    // 内容安全检查
    if (body.comment) {
      const securityCheck = await contentSecurityMiddleware(
        body.comment,
        payload.openid,
        env
      );
      if (!securityCheck.success) {
        return jsonResponse<ApiResponse<never>>({
          success: false,
          error: securityCheck.error,
        }, securityCheck.status || 400);
      }
    }

    // 插入打卡记录
    const result = await env.DB.prepare(
      `INSERT INTO checkins (openid, status_code, province, city, location_lat, location_lng, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING id, timestamp`
    )
      .bind(
        payload.openid,
        body.status_code,
        body.province || null,
        body.city,
        body.location_lat || null,
        body.location_lng || null,
        body.comment || null
      )
      .first<{ id: number; timestamp: string }>();

    if (!result) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Failed to create checkin record',
      }, 500);
    }

    return jsonResponse<ApiResponse<CheckinResponse>>({
      success: true,
      data: {
        id: result.id,
        timestamp: result.timestamp,
      },
    });

  } catch (error) {
    console.error('Checkin error:', error);
    return jsonResponse<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
}

// 获取打卡历史
export async function handleGetHistory(
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

    // 获取分页参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);
    const offset = (page - 1) * limit;

    // 查询总记录数
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM checkins WHERE openid = ?'
    )
      .bind(payload.openid)
      .first<{ total: number }>();

    const total = countResult?.total || 0;

    // 查询记录
    const { results } = await env.DB.prepare(
      `SELECT id, status_code, city, timestamp, comment
       FROM checkins
       WHERE openid = ?
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`
    )
      .bind(payload.openid, limit, offset)
      .all<{
        id: number;
        status_code: number;
        city: string;
        timestamp: string;
        comment: string | null;
      }>();

    // 映射状态名称
    const statusMap: Record<number, string> = {
      1: '搬砖中',
      2: '休息中',
      3: '充电中',
      4: '自由态',
    };

    const records = results.map(record => ({
      id: record.id,
      status_code: record.status_code,
      status_name: statusMap[record.status_code] || '未知',
      city: record.city,
      timestamp: record.timestamp,
      comment: record.comment,
    }));

    return jsonResponse<ApiResponse<HistoryResponse>>({
      success: true,
      data: {
        records,
        total,
        page,
        limit,
      },
    });

  } catch (error) {
    console.error('Get history error:', error);
    return jsonResponse<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
}

// 删除用户数据
export async function handleDeleteUserData(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'DELETE') {
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

    // 删除用户所有打卡记录
    const result = await env.DB.prepare(
      'DELETE FROM checkins WHERE openid = ?'
    )
      .bind(payload.openid)
      .run();

    return jsonResponse<ApiResponse<{ deleted_count: number }>>({
      success: true,
      data: {
        deleted_count: result.meta?.changes || 0,
      },
    });

  } catch (error) {
    console.error('Delete user data error:', error);
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

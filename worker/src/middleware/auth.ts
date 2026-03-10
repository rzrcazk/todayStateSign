// 认证中间件
import type { Env, JwtPayload } from '../types';
import { verifyToken } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  openid?: string;
  jwtPayload?: JwtPayload;
}

export async function authMiddleware(
  request: AuthenticatedRequest,
  env: Env
): Promise<{ success: boolean; error?: string; status?: number }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return { success: false, error: '缺少认证信息', status: 401 };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { success: false, error: '认证格式错误', status: 401 };
  }

  const token = parts[1];
  const payload = await verifyToken(token, env.JWT_SECRET);

  if (!payload) {
    return { success: false, error: 'Token 无效或已过期', status: 401 };
  }

  request.openid = payload.openid;
  request.jwtPayload = payload;

  return { success: true };
}

// CORS 中间件
export function corsMiddleware(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  return null;
}

// 通用响应头
export function addCorsHeaders(response: Response): Response {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// 认证路由
import type { Env, ApiResponse } from '../types';
import { getWechatSession } from '../utils/wechat';
import { generateToken } from '../utils/jwt';

interface LoginRequest {
  code: string;
}

interface LoginResponse {
  token: string;
  openid: string;
}

export async function handleLogin(
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
    const body = await request.json() as LoginRequest;

    if (!body.code) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Missing code parameter',
      }, 400);
    }

    // 验证微信登录
    const session = await getWechatSession(body.code, env);

    if (!session || !session.openid) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'WeChat login failed',
      }, 401);
    }

    // 生成 JWT Token
    const token = await generateToken(session.openid, env.JWT_SECRET);

    // 脱敏处理 openid
    const maskedOpenid = `${session.openid.slice(0, 8)}****${session.openid.slice(-4)}`;

    return jsonResponse<ApiResponse<LoginResponse>>({
      success: true,
      data: {
        token,
        openid: maskedOpenid,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
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

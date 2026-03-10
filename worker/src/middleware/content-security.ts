// 内容安全中间件
import type { Env } from '../types';
import { checkSensitiveWords } from '../utils/sensitive-words';
import { checkMessageSecurity } from '../utils/wechat';

interface ContentCheckResult {
  success: boolean;
  error?: string;
  status?: number;
}

export async function contentSecurityMiddleware(
  content: string,
  openid: string,
  env: Env
): Promise<ContentCheckResult> {
  // 1. 本地敏感词检查
  const localCheck = await checkSensitiveWords(content, env.DB);
  if (localCheck.hasSensitive) {
    return {
      success: false,
      error: `内容包含敏感词: ${localCheck.words.join(', ')}`,
      status: 400,
    };
  }

  // 2. 微信内容安全 API 检查
  const wechatCheck = await checkMessageSecurity(content, openid, env);
  if (!wechatCheck) {
    return {
      success: false,
      error: '内容未能通过安全检测',
      status: 400,
    };
  }

  return { success: true };
}

// 频率限制中间件
export async function rateLimitMiddleware(
  openid: string,
  env: Env
): Promise<ContentCheckResult> {
  // 检查用户最近 1 小时内是否已打卡
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { results } = await env.DB.prepare(
    `SELECT id FROM checkins
     WHERE openid = ? AND created_at > ?
     ORDER BY created_at DESC
     LIMIT 1`
  )
    .bind(openid, oneHourAgo)
    .all<{ id: number }>();

  if (results.length > 0) {
    return {
      success: false,
      error: '您 1 小时内已经打卡过了，请稍后再试',
      status: 429,
    };
  }

  return { success: true };
}

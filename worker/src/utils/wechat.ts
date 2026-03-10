// 微信 API 工具函数
import type { WechatSessionResponse, WechatMsgCheckResponse, Env } from '../types';

export async function getWechatSession(
  code: string,
  env: Env
): Promise<WechatSessionResponse | null> {
  const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
  url.searchParams.append('appid', env.WECHAT_APPID);
  url.searchParams.append('secret', env.WECHAT_APPSECRET);
  url.searchParams.append('js_code', code);
  url.searchParams.append('grant_type', 'authorization_code');

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }

  const data = await response.json() as WechatSessionResponse;
  return data;
}

export async function checkMessageSecurity(
  content: string,
  openid: string,
  env: Env
): Promise<boolean> {
  // 先获取 access_token
  const tokenUrl = new URL('https://api.weixin.qq.com/cgi-bin/token');
  tokenUrl.searchParams.append('grant_type', 'client_credential');
  tokenUrl.searchParams.append('appid', env.WECHAT_APPID);
  tokenUrl.searchParams.append('secret', env.WECHAT_APPSECRET);

  const tokenResponse = await fetch(tokenUrl.toString());
  if (!tokenResponse.ok) {
    return false;
  }

  const tokenData = await tokenResponse.json() as { access_token?: string; errcode?: number };
  if (!tokenData.access_token) {
    return false;
  }

  // 调用内容安全检测接口
  const checkUrl = `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${tokenData.access_token}`;
  const checkResponse = await fetch(checkUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      version: 2,
      openid,
      scene: 1, // 场景值，1-资料；2-评论；3-论坛；4-社交日志
    }),
  });

  if (!checkResponse.ok) {
    return false;
  }

  const result = await checkResponse.json() as WechatMsgCheckResponse;
  // errcode 为 0 表示通过检测
  return result.errcode === 0;
}

export function maskOpenid(openid: string): string {
  if (openid.length <= 8) {
    return '****';
  }
  return openid.slice(0, 4) + '****' + openid.slice(-4);
}

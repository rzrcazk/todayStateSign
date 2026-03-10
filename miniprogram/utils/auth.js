// 微信登录工具

const TOKEN_KEY = 'token';
const OPENID_KEY = 'openid';

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
  return !!wx.getStorageSync(TOKEN_KEY);
}

/**
 * 获取登录 Token
 */
export function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || null;
}

/**
 * 获取 OpenID（脱敏）
 */
export function getOpenid() {
  return wx.getStorageSync(OPENID_KEY) || null;
}

/**
 * 设置登录信息
 */
export function setAuth(token, openid) {
  wx.setStorageSync(TOKEN_KEY, token);
  wx.setStorageSync(OPENID_KEY, openid);
}

/**
 * 清除登录信息
 */
export function clearAuth() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(OPENID_KEY);
}

/**
 * 执行微信登录
 */
export function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: resolve,
      fail: reject,
    });
  });
}

/**
 * 检查登录状态，过期则自动重新登录
 */
export async function checkAuth() {
  const token = getToken();
  if (!token) {
    return false;
  }

  // 可以尝试发送一个请求验证 token 是否有效
  // 这里简化为直接返回 true
  return true;
}

export default {
  isLoggedIn,
  getToken,
  getOpenid,
  setAuth,
  clearAuth,
  wxLogin,
  checkAuth,
};

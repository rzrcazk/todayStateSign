// API 基础配置
const API_BASE_URL = 'https://gap.952712.xyz';

// 请求封装
function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');

    wx.request({
      ...options,
      url: `${API_BASE_URL}${options.url}`,
      header: {
        ...options.header,
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      success: (res) => {
        const data = res.data;
        if (res.statusCode === 200 && data.success) {
          resolve(data.data);
        } else if (res.statusCode === 401) {
          // Token 过期，清除并重新登录
          wx.removeStorageSync('token');
          wx.redirectTo({ url: '/pages/index/index' });
          reject(new Error('Unauthorized'));
        } else {
          reject(new Error(data.error || `Request failed: ${res.statusCode}`));
        }
      },
      fail: reject,
    });
  });
}

// 登录接口
export function login(code) {
  return request({
    url: '/api/auth/login',
    method: 'POST',
    data: { code },
  });
}

// 提交打卡
export function submitCheckin(data) {
  return request({
    url: '/api/checkin',
    method: 'POST',
    data,
  });
}

// 获取统计数据
export function getStatistics(city, province) {
  return request({
    url: `/api/statistics?city=${encodeURIComponent(city)}${province ? `&province=${encodeURIComponent(province)}` : ''}`,
    method: 'GET',
  });
}

// 获取打卡历史
export function getHistory(page = 1, limit = 20) {
  return request({
    url: `/api/checkin/history?page=${page}&limit=${limit}`,
    method: 'GET',
  });
}

// 获取最后一次打卡记录
export function getLastCheckin() {
  return request({
    url: '/api/checkin/last',
    method: 'GET',
  });
}

// 位置服务 - 逆地址解析
export function reverseGeocode(latitude, longitude) {
  return request({
    url: '/api/location/reverse',
    method: 'POST',
    data: { latitude, longitude },
  });
}

// 位置服务 - IP 定位
export function getLocationByIP() {
  return request({
    url: '/api/location/ip',
    method: 'GET',
  });
}

export default {
  login,
  submitCheckin,
  getStatistics,
  getHistory,
  deleteUserData,
  reverseGeocode,
  getLocationByIP,
  getLastCheckin,
};

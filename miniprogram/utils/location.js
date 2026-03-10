// 地理位置工具
// 通过 Worker API 获取位置信息

import api from './api.js';

/**
 * 获取当前地理位置（仅经纬度）
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: resolve,
      fail: reject,
    });
  });
}

/**
 * 逆地址解析 - 调用 Worker API 获取真实位置信息
 * @param {number} latitude 纬度
 * @param {number} longitude 经度
 */
export async function reverseGeocoder(latitude, longitude) {
  try {
    // 调用 Worker API 进行逆地址解析
    const result = await api.reverseGeocode(latitude, longitude);
    return result;
  } catch (error) {
    console.error('Reverse geocode failed:', error);
    // 如果 API 调用失败，返回基础信息
    return {
      province: '未知',
      city: '未知',
      district: '未知',
      address: '未知位置',
      latitude,
      longitude,
    };
  }
}

/**
 * IP 定位 - 获取大致位置（备用方案）
 */
export async function getLocationByIP() {
  try {
    const result = await api.getLocationByIP();
    return result;
  } catch (error) {
    console.error('IP location failed:', error);
    return null;
  }
}

/**
 * 综合获取位置信息
 * 优先使用 GPS 坐标，失败时回退到 IP 定位
 */
export async function getLocationInfo() {
  try {
    // 1. 获取 GPS 坐标
    const location = await getCurrentLocation();
    console.log('Got GPS location:', location);

    // 2. 调用 Worker API 解析地址
    const geoInfo = await reverseGeocoder(location.latitude, location.longitude);
    console.log('Got geocode info:', geoInfo);

    return geoInfo;
  } catch (error) {
    console.error('GPS location failed, trying IP location:', error);

    // GPS 失败，尝试 IP 定位
    const ipLocation = await getLocationByIP();
    if (ipLocation) {
      console.log('Got IP location:', ipLocation);
      return ipLocation;
    }

    // 都失败了
    throw new Error('Failed to get location');
  }
}

/**
 * 检查位置权限
 */
export function checkLocationPermission() {
  return new Promise((resolve) => {
    wx.getSetting({
      success: (res) => {
        resolve(!!res.authSetting['scope.userLocation']);
      },
      fail: () => {
        resolve(false);
      },
    });
  });
}

/**
 * 请求位置权限
 */
export function requestLocationPermission() {
  return new Promise((resolve) => {
    wx.authorize({
      scope: 'scope.userLocation',
      success: () => resolve(true),
      fail: () => resolve(false),
    });
  });
}

export default {
  getCurrentLocation,
  reverseGeocoder,
  getLocationByIP,
  getLocationInfo,
  checkLocationPermission,
  requestLocationPermission,
};

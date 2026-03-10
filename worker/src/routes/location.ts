// 位置服务路由
import type { Env, ApiResponse } from '../types';
import { reverseGeocode, getLocationByIP } from '../utils/location';

interface LocationRequest {
  latitude: number;
  longitude: number;
}

interface LocationResponse {
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * 处理逆地址解析请求
 * POST /api/location/reverse
 */
export async function handleReverseGeocode(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse<ApiResponse<never>>({
      success: false,
      error: 'Method not allowed',
    }, 405);
  }

  // 检查是否配置了高德地图 API Key
  if (!env.AMAP_KEY) {
    return jsonResponse<ApiResponse<never>>({
      success: false,
      error: 'Location service not configured',
    }, 500);
  }

  try {
    const body = await request.json() as LocationRequest;

    // 验证参数
    if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Invalid latitude or longitude',
      }, 400);
    }

    // 验证坐标范围
    if (body.latitude < -90 || body.latitude > 90 || body.longitude < -180 || body.longitude > 180) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Coordinates out of range',
      }, 400);
    }

    // 调用高德地图 API
    const locationInfo = await reverseGeocode(
      body.latitude,
      body.longitude,
      env.AMAP_KEY
    );

    if (!locationInfo) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Failed to get location info',
      }, 500);
    }

    const response: LocationResponse = {
      province: locationInfo.province,
      city: locationInfo.city,
      district: locationInfo.district,
      address: locationInfo.address,
      latitude: locationInfo.latitude,
      longitude: locationInfo.longitude,
    };

    return jsonResponse<ApiResponse<LocationResponse>>({
      success: true,
      data: response,
    });

  } catch (error) {
    console.error('Reverse geocode handler error:', error);
    return jsonResponse<ApiResponse<never>>({
      success: false,
      error: 'Internal server error',
    }, 500);
  }
}

/**
 * 处理 IP 定位请求
 * GET /api/location/ip
 */
export async function handleIPLocation(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse<ApiResponse<never>>({
      success: false,
      error: 'Method not allowed',
    }, 405);
  }

  // 检查是否配置了高德地图 API Key
  if (!env.AMAP_KEY) {
    return jsonResponse<ApiResponse<never>>({
      success: false,
      error: 'Location service not configured',
    }, 500);
  }

  try {
    // 获取客户端 IP
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    console.log('Client IP:', clientIP);

    // 调用 IP 定位 API
    const locationInfo = await getLocationByIP(env.AMAP_KEY);

    if (!locationInfo) {
      return jsonResponse<ApiResponse<never>>({
        success: false,
        error: 'Failed to get location by IP',
      }, 500);
    }

    const response: LocationResponse = {
      province: locationInfo.province,
      city: locationInfo.city,
      district: locationInfo.district,
      address: locationInfo.address,
      latitude: locationInfo.latitude,
      longitude: locationInfo.longitude,
    };

    return jsonResponse<ApiResponse<LocationResponse>>({
      success: true,
      data: response,
    });

  } catch (error) {
    console.error('IP location handler error:', error);
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

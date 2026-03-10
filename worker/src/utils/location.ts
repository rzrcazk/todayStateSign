// 位置服务工具函数
// 使用高德地图 API 进行逆地址解析

export interface LocationInfo {
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface AMapResult {
  status: string;
  info: string;
  regeocode: {
    formatted_address: string;
    addressComponent: {
      province: string;
      city: string;
      district: string;
      street: string;
      streetNumber: string;
    };
  };
}

/**
 * 逆地址解析 - 将经纬度转换为地址信息
 * 使用高德地图 API（微信小程序坐标系为 gcj02，与高德地图一致）
 * 注意：高德 location 参数格式为 "经度,纬度"
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  apiKey: string
): Promise<LocationInfo | null> {
  try {
    const url = new URL('https://restapi.amap.com/v3/geocode/regeo');
    url.searchParams.append('location', `${longitude},${latitude}`);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('extensions', 'base');
    url.searchParams.append('output', 'JSON');

    console.log('AMap reverse geocode URL:', url.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('AMap API error:', response.status);
      return null;
    }

    const data = await response.json() as AMapResult;
    console.log('AMap response:', JSON.stringify(data));

    if (data.status !== '1' || !data.regeocode) {
      console.error('AMap API error:', data.info);
      return null;
    }

    const { addressComponent } = data.regeocode;

    // 处理直辖市情况：city 可能为空，此时用 province 替代
    const city = addressComponent.city || addressComponent.province;

    return {
      province: addressComponent.province,
      city: city,
      district: addressComponent.district,
      address: data.regeocode.formatted_address,
      latitude,
      longitude,
    };
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
}

/**
 * IP 定位 - 根据 IP 获取大致位置
 * 作为 GPS 获取失败的备用方案
 */
export async function getLocationByIP(apiKey: string): Promise<LocationInfo | null> {
  try {
    const url = new URL('https://restapi.amap.com/v3/ip');
    url.searchParams.append('key', apiKey);
    url.searchParams.append('output', 'JSON');

    console.log('AMap IP location URL:', url.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      return null;
    }

    const data = await response.json() as {
      status: string;
      info: string;
      province: string;
      city: string;
      adcode: string;
      rectangle: string;
    };

    console.log('AMap IP response:', JSON.stringify(data));

    if (data.status !== '1') {
      console.error('AMap IP API error:', data.info);
      return null;
    }

    // 高德 IP 定位返回的是省份和城市名称
    return {
      province: data.province || '未知',
      city: data.city || data.province || '未知',
      district: '',
      address: `${data.province}${data.city}`,
      latitude: 0,
      longitude: 0,
    };
  } catch (error) {
    console.error('IP location error:', error);
    return null;
  }
}

// 类型定义

export interface Env {
  DB: D1Database;
  WECHAT_APPID: string;
  WECHAT_APPSECRET: string;
  JWT_SECRET: string;
  AMAP_KEY: string;
}

export interface JwtPayload {
  openid: string;
  exp: number;
}

export interface CheckinRecord {
  id: number;
  openid: string;
  timestamp: string;
  status_code: number;
  province: string | null;
  city: string;
  location_lat: number | null;
  location_lng: number | null;
  comment: string | null;
  created_at: string;
}

export interface StatusOption {
  code: number;
  name: string;
  icon: string;
  color: string;
}

export interface StatisticsData {
  status_distribution: Record<string, number>;
  hourly_distribution: Array<{ hour: number; percentage: number }>;
  total_participants: string;
  last_updated: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WechatSessionResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WechatMsgCheckResponse {
  errcode: number;
  errmsg: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { code: 1, name: '搬砖中', icon: '💼', color: '#FF6B6B' },
  { code: 2, name: '休息中', icon: '☕', color: '#4ECDC4' },
  { code: 3, name: '充电中', icon: '🔋', color: '#45B7D1' },
  { code: 4, name: '自由态', icon: '🌈', color: '#96CEB4' },
];

export function getStatusByCode(code: number): StatusOption | undefined {
  return STATUS_OPTIONS.find(s => s.code === code);
}

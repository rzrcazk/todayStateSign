// 首页 - 打卡页面
import api from '../../utils/api.js';
import auth from '../../utils/auth.js';
import location from '../../utils/location.js';
import { getProvinceNames, getCitiesByProvince } from '../../utils/regions.js';

// 状态选项
const STATUS_OPTIONS = [
  { code: 1, name: '搬砖中', icon: '💼', color: '#FF6B6B' },
  { code: 2, name: '休息中', icon: '☕', color: '#4ECDC4' },
  { code: 3, name: '充电中', icon: '🔋', color: '#45B7D1' },
  { code: 4, name: '自由态', icon: '🌈', color: '#96CEB4' },
];

Page({
  data: {
    // 状态选择
    selectedStatus: null,
    statusOptions: STATUS_OPTIONS,
    // 地理位置
    location: null,
    locationName: '获取位置中...',
    // 位置选择器
    showLocationPicker: false,
    provinces: [],
    cities: [],
    selectedProvinceIndex: 0,
    selectedCityIndex: 0,
    selectedProvince: '',
    selectedCity: '',
    // 留言
    comment: '',
    commentCount: 0,
    // 加载状态
    loading: false,
    locationLoading: false,
    // 登录状态
    isLoggedIn: false,
    // 上次打卡时间
    lastCheckinTime: null,
    canCheckin: true,
  },

  onLoad() {
    this.checkLogin();
    this.initRegionData();
    this.loadLastLocation();
  },

  // 加载上次打卡位置（优先后端，其次本地，最后定位）
  async loadLastLocation() {
    try {
      // 1. 优先从后端获取最后一次打卡位置
      const lastCheckin = await api.getLastCheckin();
      if (lastCheckin && lastCheckin.city) {
        const locationInfo = {
          province: lastCheckin.province,
          city: lastCheckin.city,
          district: '',
          address: `${lastCheckin.province} ${lastCheckin.city}`,
          latitude: lastCheckin.latitude,
          longitude: lastCheckin.longitude,
        };
        // 保存到本地缓存
        wx.setStorageSync('lastCheckinLocation', locationInfo);
        this.setData({
          location: locationInfo,
          locationName: locationInfo.city || locationInfo.province || '点击选择位置',
          locationLoading: false,
        });
        return;
      }
    } catch (error) {
      console.log('Backend last checkin not found, trying local storage');
    }

    // 2. 后端没有，尝试本地存储
    try {
      const lastLocation = wx.getStorageSync('lastCheckinLocation');
      if (lastLocation && lastLocation.city) {
        this.setData({
          location: lastLocation,
          locationName: lastLocation.city || lastLocation.province || '点击选择位置',
          locationLoading: false,
        });
        return;
      }
    } catch (error) {
      console.error('Load local location failed:', error);
    }

    // 3. 都没有，获取真实位置
    this.getLocation();
  },

  onShow() {
    this.checkLogin();
  },

  // 初始化省市区数据
  initRegionData() {
    const provinces = getProvinceNames();
    this.setData({
      provinces,
      selectedProvince: provinces[0],
    });
    this.updateCities(provinces[0]);
  },

  // 更新城市列表
  updateCities(provinceName) {
    const cities = getCitiesByProvince(provinceName);
    const cityNames = cities.map(c => c.name);
    this.setData({
      cities: cityNames,
      selectedCity: cityNames[0] || '',
      selectedCityIndex: 0,
    });
  },

  // 检查登录状态
  async checkLogin() {
    const loggedIn = auth.isLoggedIn();
    this.setData({ isLoggedIn: loggedIn });

    if (!loggedIn) {
      await this.handleLogin();
    }
  },

  // 微信登录
  async handleLogin() {
    try {
      wx.showLoading({ title: '登录中...' });

      const { code } = await auth.wxLogin();
      const result = await api.login(code);

      auth.setAuth(result.token, result.openid);
      this.setData({ isLoggedIn: true });

      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '登录失败',
        icon: 'error',
      });
      console.error('Login failed:', error);
    }
  },

  // 获取地理位置
  async getLocation() {
    this.setData({ locationLoading: true });

    try {
      const hasPermission = await location.checkLocationPermission();

      if (!hasPermission) {
        const granted = await location.requestLocationPermission();
        if (!granted) {
          this.setData({
            locationName: '点击选择位置',
            locationLoading: false,
          });
          return;
        }
      }

      const locationInfo = await location.getLocationInfo();

      // 检查是否获取到了有效位置
      if (locationInfo.province === '未知' || locationInfo.city === '未知') {
        this.setData({
          location: null,
          locationName: '点击选择位置',
          locationLoading: false,
        });
      } else {
        this.setData({
          location: locationInfo,
          locationName: locationInfo.city || locationInfo.province || '点击选择位置',
          locationLoading: false,
        });
      }
    } catch (error) {
      console.error('Get location failed:', error);
      this.setData({
        locationName: '点击选择位置',
        locationLoading: false,
      });
    }
  },

  // 点击位置栏 - 打开选择器
  onLocationTap() {
    this.setData({
      showLocationPicker: true,
    });
  },

  // 关闭位置选择器
  closeLocationPicker() {
    this.setData({
      showLocationPicker: false,
    });
  },

  // 省份变化
  onProvinceChange(e) {
    const index = e.detail.value;
    const province = this.data.provinces[index];
    this.setData({
      selectedProvinceIndex: index,
      selectedProvince: province,
    });
    this.updateCities(province);
  },

  // 城市变化
  onCityChange(e) {
    const index = e.detail.value;
    const city = this.data.cities[index];
    this.setData({
      selectedCityIndex: index,
      selectedCity: city,
    });
  },

  // 确认选择位置
  confirmLocation() {
    const { selectedProvince, selectedCity } = this.data;

    // 创建位置对象
    const locationInfo = {
      province: selectedProvince,
      city: selectedCity,
      district: '',
      address: `${selectedProvince} ${selectedCity}`,
      latitude: null,
      longitude: null,
      isManual: true, // 标记为手动选择
    };

    this.setData({
      location: locationInfo,
      locationName: selectedCity || selectedProvince,
      showLocationPicker: false,
    });

    wx.showToast({
      title: '位置已选择',
      icon: 'success',
      duration: 1500,
    });
  },

  // 重新获取定位
  async retryGetLocation() {
    this.closeLocationPicker();
    await this.getLocation();
  },

  // 选择状态
  selectStatus(e) {
    const code = e.currentTarget.dataset.code;
    this.setData({
      selectedStatus: code,
    });
  },

  // 输入留言
  onCommentInput(e) {
    const value = e.detail.value;
    this.setData({
      comment: value,
      commentCount: value.length,
    });
  },

  // 提交打卡
  async submitCheckin() {
    const { selectedStatus, location, comment, isLoggedIn } = this.data;

    if (!isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }

    if (!selectedStatus) {
      wx.showToast({
        title: '请选择当前状态',
        icon: 'none',
      });
      return;
    }

    if (!location) {
      wx.showToast({
        title: '请先选择位置',
        icon: 'none',
      });
      return;
    }

    if (comment.length > 50) {
      wx.showToast({
        title: '留言超过50字',
        icon: 'none',
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const checkinData = {
        status_code: selectedStatus,
        province: location.province,
        city: location.city,
        comment: comment.trim() || undefined,
      };

      // 如果是GPS定位的，加上经纬度
      if (!location.isManual && location.latitude && location.longitude) {
        checkinData.location_lat = location.latitude;
        checkinData.location_lng = location.longitude;
      }

      const result = await api.submitCheckin(checkinData);

      // 保存本次打卡位置到本地存储
      const locationToSave = {
        province: location.province,
        city: location.city,
        district: location.district || '',
        address: location.address || `${location.province} ${location.city}`,
        latitude: location.latitude || null,
        longitude: location.longitude || null,
      };
      wx.setStorageSync('lastCheckinLocation', locationToSave);

      this.setData({
        loading: false,
        selectedStatus: null,
        comment: '',
        commentCount: 0,
        lastCheckinTime: result.timestamp,
      });

      wx.showToast({
        title: '打卡成功！',
        icon: 'success',
        duration: 2000,
      });

      this.showSuccessAnimation();

    } catch (error) {
      this.setData({ loading: false });

      if (error.message?.includes('429') || error.message?.includes('频繁')) {
        wx.showToast({
          title: '1小时内只能打卡一次',
          icon: 'none',
          duration: 2000,
        });
      } else if (error.message?.includes('敏感')) {
        wx.showToast({
          title: '留言包含敏感词',
          icon: 'none',
        });
      } else {
        wx.showToast({
          title: '打卡失败',
          icon: 'error',
        });
      }
    }
  },

  // 显示成功动画
  showSuccessAnimation() {
    wx.vibrateShort({ type: 'light' });
  },

  // 导航到统计页
  goToStatistics() {
    wx.switchTab({
      url: '/pages/statistics/statistics',
    });
  },

  // 导航到个人中心
  goToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile',
    });
  },
});

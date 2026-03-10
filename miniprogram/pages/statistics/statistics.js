// 统计页
import api from '../../utils/api.js';
import auth from '../../utils/auth.js';
import location from '../../utils/location.js';
import { getProvinceNames, getCitiesByProvince } from '../../utils/regions.js';

Page({
  data: {
    // 位置信息
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
    // 统计数据
    statistics: null,
    // 加载状态
    loading: false,
    // 错误状态
    error: null,
    // 选中状态
    selectedStatus: null,
  },

  onLoad() {
    this.initRegionData();
    this.initPage();
  },

  onShow() {
    if (this.data.location) {
      this.loadStatistics();
    }
  },

  onPullDownRefresh() {
    this.loadStatistics().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async initPage() {
    try {
      await this.getLocation();
      await this.loadStatistics();
    } catch (error) {
      console.error('Init page failed:', error);
    }
  },

  // 获取地理位置
  async getLocation() {
    try {
      const locationInfo = await location.getLocationInfo();
      this.setData({
        location: locationInfo,
        locationName: locationInfo.city || locationInfo.province || '未知位置',
      });
    } catch (error) {
      console.error('Get location failed:', error);
      this.setData({
        locationName: '获取位置失败',
      });
    }
  },

  // 加载统计数据
  async loadStatistics() {
    const { location } = this.data;

    if (!location) {
      return;
    }

    this.setData({ loading: true, error: null });

    try {
      const result = await api.getStatistics(location.city, location.province);
      this.setData({
        statistics: result,
        loading: false,
      });
    } catch (error) {
      console.error('Load statistics failed:', error);
      this.setData({
        loading: false,
        error: error.message || '加载失败',
      });

      if (error.message?.includes('Unauthorized')) {
        // 需要重新登录
        auth.clearAuth();
        wx.showToast({
          title: '请重新登录',
          icon: 'none',
        });
      }
    }
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
  async confirmLocation() {
    const { selectedProvince, selectedCity } = this.data;

    // 创建位置对象
    const locationInfo = {
      province: selectedProvince,
      city: selectedCity,
      district: '',
      address: `${selectedProvince} ${selectedCity}`,
      latitude: null,
      longitude: null,
      isManual: true,
    };

    this.setData({
      location: locationInfo,
      locationName: selectedCity || selectedProvince,
      showLocationPicker: false,
    });

    // 重新加载统计数据
    await this.loadStatistics();

    wx.showToast({
      title: '位置已更新',
      icon: 'success',
      duration: 1500,
    });
  },

  // 重新获取定位
  async retryGetLocation() {
    this.closeLocationPicker();
    await this.getLocation();
    await this.loadStatistics();
  },

  // 阻止冒泡
  preventBubble() {
    // 什么都不做，只是阻止冒泡
  },

  // 刷新数据
  refreshData() {
    this.loadStatistics();
  },

  // 选择状态查看详情
  selectStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({
      selectedStatus: status,
    });

    // 可以在这里添加更多交互，比如显示该状态的详细信息
    const percentage = this.data.statistics?.status_distribution[status] || 0;
    wx.showToast({
      title: `${status}: ${percentage}%`,
      icon: 'none',
      duration: 2000,
    });
  },

  // 格式化小时
  formatHour(hour) {
    return `${hour.toString().padStart(2, '0')}:00`;
  },

  // 获取时段分布最高值（用于计算柱状图高度）
  getMaxHourlyPercentage() {
    const { statistics } = this.data;
    if (!statistics?.hourly_distribution) return 100;
    return Math.max(...statistics.hourly_distribution.map(h => h.percentage), 1);
  },
});

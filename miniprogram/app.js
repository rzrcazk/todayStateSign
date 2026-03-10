// 小程序入口
import auth from './utils/auth.js';

App({
  globalData: {
    userInfo: null,
    location: null,
    systemInfo: null,
  },

  onLaunch() {
    // 获取系统信息
    this.getSystemInfo();

    // 检查登录状态
    this.checkLoginStatus();

    // 控制台输出启动信息
    console.log('城市节奏小程序已启动');
  },

  onShow() {
    // 小程序显示时
  },

  onHide() {
    // 小程序隐藏时
  },

  onError(msg) {
    console.error('小程序错误:', msg);
  },

  // 获取系统信息
  getSystemInfo() {
    try {
      const deviceInfo = wx.getDeviceInfo();
      const windowInfo = wx.getWindowInfo();
      const appBaseInfo = wx.getAppBaseInfo();
      this.globalData.systemInfo = { ...deviceInfo, ...windowInfo, ...appBaseInfo };
    } catch (error) {
      console.error('获取系统信息失败:', error);
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = auth.isLoggedIn();
    console.log('登录状态:', isLoggedIn ? '已登录' : '未登录');
  },

  // 全局方法：显示错误提示
  showError(message) {
    wx.showToast({
      title: message,
      icon: 'error',
      duration: 2000,
    });
  },

  // 全局方法：显示成功提示
  showSuccess(message) {
    wx.showToast({
      title: message,
      icon: 'success',
      duration: 2000,
    });
  },
});

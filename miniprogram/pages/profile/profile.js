// 个人中心页
import api from '../../utils/api.js';
import auth from '../../utils/auth.js';

// 状态映射
const STATUS_MAP = {
  1: { name: '搬砖中', icon: '💼', color: '#FF6B6B' },
  2: { name: '休息中', icon: '☕', color: '#4ECDC4' },
  3: { name: '充电中', icon: '🔋', color: '#45B7D1' },
  4: { name: '自由态', icon: '🌈', color: '#96CEB4' },
};

Page({
  data: {
    // 用户信息
    openid: '',
    // 最后一次打卡
    lastCheckin: null,
    // 打卡历史
    history: [],
    // 分页
    page: 1,
    limit: 20,
    hasMore: true,
    loading: false,
    // 个人统计
    personalStats: null,
    // 菜单项
    menuItems: [
      { id: 'privacy', icon: '📋', name: '隐私协议', action: 'showPrivacy' },
      { id: 'clear', icon: '🗑️', name: '清除数据', action: 'clearData' },
      { id: 'about', icon: 'ℹ️', name: '关于我们', action: 'showAbout' },
    ],
  },

  onLoad() {
    this.loadUserInfo();
    this.loadHistory();
    this.calculatePersonalStats();
  },

  onShow() {
    // 每次显示时刷新数据
    this.setData({ page: 1, history: [], lastCheckin: null });
    this.loadHistory();
  },

  // 加载用户信息
  loadUserInfo() {
    const openid = auth.getOpenid();
    this.setData({ openid: openid || '' });
  },

  // 加载打卡历史
  async loadHistory() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const result = await api.getHistory(this.data.page, this.data.limit);

      // 格式化时间
      const formattedRecords = result.records.map(record => ({
        ...record,
        formattedDate: this.formatDate(record.timestamp),
        formattedTime: this.formatDateTime(record.timestamp),
        statusInfo: STATUS_MAP[record.status_code] || { name: '未知', icon: '❓', color: '#999' },
      }));

      const allHistory = [...this.data.history, ...formattedRecords];

      this.setData({
        history: allHistory,
        lastCheckin: allHistory.length > 0 ? allHistory[0] : null,
        page: this.data.page + 1,
        hasMore: formattedRecords.length === this.data.limit,
        loading: false,
      });

      // 计算个人统计
      this.calculatePersonalStatsFromHistory(allHistory);
    } catch (error) {
      console.error('Load history failed:', error);
      this.setData({ loading: false });

      if (error.message?.includes('Unauthorized')) {
        auth.clearAuth();
        wx.showToast({
          title: '请重新登录',
          icon: 'none',
        });
      }
    }
  },

  // 计算个人统计
  calculatePersonalStats() {
    // 基于当前已加载的历史记录计算
    this.calculatePersonalStatsFromHistory(this.data.history);
  },

  calculatePersonalStatsFromHistory(records) {
    if (records.length === 0) {
      this.setData({
        personalStats: {
          total: 0,
          distribution: {},
        },
      });
      return;
    }

    const distribution = {};
    records.forEach(record => {
      distribution[record.status_code] = (distribution[record.status_code] || 0) + 1;
    });

    // 转换为百分比
    const total = records.length;
    const percentageDistribution = {};

    Object.entries(distribution).forEach(([code, count]) => {
      const statusInfo = STATUS_MAP[parseInt(code, 10)];
      if (statusInfo) {
        percentageDistribution[statusInfo.name] = Math.round((count / total) * 100);
      }
    });

    this.setData({
      personalStats: {
        total,
        distribution: percentageDistribution,
      },
    });
  },

  // 格式化日期时间
  formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (isToday) {
      return `今天 ${hours}:${minutes}`;
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日 ${hours}:${minutes}`;
  },

  // 格式化日期
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // 小于1小时
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return minutes < 1 ? '刚刚' : `${minutes}分钟前`;
    }

    // 小于24小时
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}小时前`;
    }

    // 小于7天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}天前`;
    }

    // 其他情况显示具体日期
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 加载更多
  loadMore() {
    this.loadHistory();
  },

  // 菜单点击
  onMenuTap(e) {
    const action = e.currentTarget.dataset.action;
    switch (action) {
      case 'showPrivacy':
        this.showPrivacy();
        break;
      case 'clearData':
        this.confirmClearData();
        break;
      case 'showAbout':
        this.showAbout();
        break;
    }
  },

  // 显示隐私协议
  showPrivacy() {
    wx.showModal({
      title: '隐私协议',
      content: '本小程序仅收集您的位置信息用于城市识别，仅存储您的微信 OpenID 用于身份验证。我们不会收集您的真实姓名、手机号等个人信息。您可以随时删除您的打卡数据。',
      showCancel: false,
    });
  },

  // 确认清除数据
  confirmClearData() {
    wx.showModal({
      title: '清除数据',
      content: '确定要删除所有打卡记录吗？此操作不可恢复。',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          this.clearData();
        }
      },
    });
  },

  // 清除数据
  async clearData() {
    wx.showLoading({ title: '清除中...' });

    try {
      await api.deleteUserData();

      this.setData({
        history: [],
        lastCheckin: null,
        page: 1,
        hasMore: true,
        personalStats: { total: 0, distribution: {} },
      });

      wx.hideLoading();
      wx.showToast({
        title: '数据已清除',
        icon: 'success',
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '清除失败',
        icon: 'error',
      });
    }
  },

  // 显示关于
  showAbout() {
    wx.showModal({
      title: '关于城市节奏',
      content: '城市节奏 v1.0.0\n\n一个关于个人生活状态记录与同城共鸣的小程序工具。\n\n记录当下，感受城市节奏。',
      showCancel: false,
    });
  },

  // 生成分享海报
  generatePoster() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },
});

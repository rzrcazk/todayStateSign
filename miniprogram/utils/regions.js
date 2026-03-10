// 省市区数据 - 常用省市
export const REGION_DATA = {
  provinces: [
    { code: '110000', name: '北京市', cities: [{ code: '110100', name: '北京市' }] },
    { code: '310000', name: '上海市', cities: [{ code: '310100', name: '上海市' }] },
    { code: '440000', name: '广东省', cities: [
      { code: '440100', name: '广州市' },
      { code: '440300', name: '深圳市' },
      { code: '440600', name: '佛山市' },
      { code: '441900', name: '东莞市' },
    ]},
    { code: '330000', name: '浙江省', cities: [
      { code: '330100', name: '杭州市' },
      { code: '330200', name: '宁波市' },
      { code: '330300', name: '温州市' },
    ]},
    { code: '320000', name: '江苏省', cities: [
      { code: '320100', name: '南京市' },
      { code: '320200', name: '无锡市' },
      { code: '320500', name: '苏州市' },
    ]},
    { code: '510000', name: '四川省', cities: [
      { code: '510100', name: '成都市' },
    ]},
    { code: '420000', name: '湖北省', cities: [
      { code: '420100', name: '武汉市' },
    ]},
    { code: '430000', name: '湖南省', cities: [
      { code: '430100', name: '长沙市' },
    ]},
    { code: '500000', name: '重庆市', cities: [{ code: '500100', name: '重庆市' }] },
    { code: '610000', name: '陕西省', cities: [
      { code: '610100', name: '西安市' },
    ]},
    { code: '370000', name: '山东省', cities: [
      { code: '370100', name: '济南市' },
      { code: '370200', name: '青岛市' },
    ]},
    { code: '410000', name: '河南省', cities: [
      { code: '410100', name: '郑州市' },
    ]},
    { code: '130000', name: '河北省', cities: [
      { code: '130100', name: '石家庄市' },
    ]},
    { code: '210000', name: '辽宁省', cities: [
      { code: '210100', name: '沈阳市' },
      { code: '210200', name: '大连市' },
    ]},
    { code: '220000', name: '吉林省', cities: [
      { code: '220100', name: '长春市' },
    ]},
    { code: '230000', name: '黑龙江省', cities: [
      { code: '230100', name: '哈尔滨市' },
    ]},
    { code: '340000', name: '安徽省', cities: [
      { code: '340100', name: '合肥市' },
    ]},
    { code: '350000', name: '福建省', cities: [
      { code: '350100', name: '福州市' },
      { code: '350200', name: '厦门市' },
    ]},
    { code: '360000', name: '江西省', cities: [
      { code: '360100', name: '南昌市' },
    ]},
    { code: '450000', name: '广西壮族自治区', cities: [
      { code: '450100', name: '南宁市' },
      { code: '450300', name: '桂林市' },
    ]},
    { code: '460000', name: '海南省', cities: [
      { code: '460100', name: '海口市' },
      { code: '460200', name: '三亚市' },
    ]},
    { code: '520000', name: '贵州省', cities: [
      { code: '520100', name: '贵阳市' },
    ]},
    { code: '530000', name: '云南省', cities: [
      { code: '530100', name: '昆明市' },
    ]},
    { code: '540000', name: '西藏自治区', cities: [
      { code: '540100', name: '拉萨市' },
    ]},
    { code: '620000', name: '甘肃省', cities: [
      { code: '620100', name: '兰州市' },
    ]},
    { code: '630000', name: '青海省', cities: [
      { code: '630100', name: '西宁市' },
    ]},
    { code: '640000', name: '宁夏回族自治区', cities: [
      { code: '640100', name: '银川市' },
    ]},
    { code: '650000', name: '新疆维吾尔自治区', cities: [
      { code: '650100', name: '乌鲁木齐市' },
    ]},
    { code: '120000', name: '天津市', cities: [{ code: '120100', name: '天津市' }] },
    { code: '140000', name: '山西省', cities: [
      { code: '140100', name: '太原市' },
    ]},
    { code: '150000', name: '内蒙古自治区', cities: [
      { code: '150100', name: '呼和浩特市' },
    ]},
  ]
};

// 根据省代码获取城市列表
export function getCitiesByProvince(provinceName) {
  const province = REGION_DATA.provinces.find(p => p.name === provinceName);
  return province ? province.cities : [];
}

// 获取所有省份名称（用于 picker）
export function getProvinceNames() {
  return REGION_DATA.provinces.map(p => p.name);
}

export default {
  REGION_DATA,
  getCitiesByProvince,
  getProvinceNames,
};

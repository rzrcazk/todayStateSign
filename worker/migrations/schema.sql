-- 城市节奏数据库 Schema
-- Cloudflare D1 (SQLite)

-- 打卡记录表
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openid TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  status_code INTEGER NOT NULL CHECK (status_code IN (1,2,3,4)),
  province TEXT,
  city TEXT NOT NULL,
  location_lat REAL,
  location_lng REAL,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_checkins_openid ON checkins(openid);
CREATE INDEX IF NOT EXISTS idx_checkins_city_timestamp ON checkins(city, timestamp);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins(created_at);

-- 敏感词表
CREATE TABLE IF NOT EXISTS sensitive_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'general',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初始化敏感词（就业相关）
INSERT OR IGNORE INTO sensitive_words (word, category) VALUES
('失业', 'employment'),
('就业率', 'employment'),
('下岗', 'employment'),
('裁员', 'employment'),
('招聘', 'employment'),
('找工作', 'employment'),
('求职', 'employment'),
('简历', 'employment'),
('面试', 'employment'),
('offer', 'employment'),
('薪资', 'employment'),
('工资', 'employment'),
('待遇', 'employment'),
('福利', 'employment'),
('加班', 'employment'),
('996', 'employment'),
('内卷', 'employment'),
('躺平', 'employment'),
('跳槽', 'employment'),
('离职', 'employment'),
('辞职', 'employment'),
('裸辞', 'employment');

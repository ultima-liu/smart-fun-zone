-- 聪明乐园服务端 MySQL 建表脚本（MySQL 8，utf8mb4）
CREATE DATABASE IF NOT EXISTS smart_fun_zone DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_fun_zone;

-- 家长账号
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  nickname VARCHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 家庭
CREATE TABLE IF NOT EXISTS families (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(64) NOT NULL DEFAULT '我的家庭',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_family_owner (owner_user_id)
) ENGINE=InnoDB;

-- 儿童档案
CREATE TABLE IF NOT EXISTS children (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  family_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(64) NOT NULL,
  avatar VARCHAR(32) NOT NULL DEFAULT '🐯',
  grade VARCHAR(8) NOT NULL DEFAULT 'g1',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_children_family (family_id)
) ENGINE=InnoDB;

-- 短信验证码（开发态 mock 之外，生产接入短信平台时使用）
CREATE TABLE IF NOT EXISTS sms_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(8) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sms_phone (phone, created_at)
) ENGINE=InnoDB;

-- 内容包（版本化：curriculum/contents/enhance 整包 JSON）
CREATE TABLE IF NOT EXISTS content_packages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  version INT NOT NULL,
  payload LONGTEXT NOT NULL,
  note VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_content_version (version)
) ENGINE=InnoDB;

-- 内容分片（增量下载：按 hash 比对，只拉变化的分片）
CREATE TABLE IF NOT EXISTS content_chunks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  version INT NOT NULL,
  chunk_idx INT NOT NULL,
  hash CHAR(64) NOT NULL,
  size INT NOT NULL,
  payload LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_content_chunk (version, chunk_idx),
  KEY idx_chunk_hash (version, hash)
) ENGINE=InnoDB;

-- 学习进度（child × lesson；增量同步：updated_at 作版本）
CREATE TABLE IF NOT EXISTS progress (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id BIGINT UNSIGNED NOT NULL,
  lesson_id VARCHAR(64) NOT NULL,
  step_idx INT NOT NULL DEFAULT 0,
  stars INT NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  payload JSON NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_progress (child_id, lesson_id),
  KEY idx_progress_child_updated (child_id, updated_at)
) ENGINE=InnoDB;

-- 练习/错题记录
CREATE TABLE IF NOT EXISTS practice_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id BIGINT UNSIGNED NOT NULL,
  lesson_id VARCHAR(64) NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'quiz',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  wrong TINYINT NOT NULL DEFAULT 0,
  duration_ms INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_practice_child (child_id, created_at)
) ENGINE=InnoDB;

-- 跟读评测记录
CREATE TABLE IF NOT EXISTS read_aloud_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id BIGINT UNSIGNED NOT NULL,
  lesson_id VARCHAR(64) NOT NULL,
  sentence TEXT NOT NULL,
  transcript TEXT NOT NULL,
  score DECIMAL(5,2) NOT NULL DEFAULT 0,
  accuracy DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_read_aloud_child (child_id, created_at)
) ENGINE=InnoDB;

-- 学习计划
CREATE TABLE IF NOT EXISTS plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(16) NOT NULL DEFAULT 'custom',   -- system(系统排期) / custom(家长布置)
  title VARCHAR(128) NOT NULL,
  detail VARCHAR(512) NOT NULL DEFAULT '',
  due_date DATE NULL,
  done TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_plans_child (child_id, due_date)
) ENGINE=InnoDB;

-- TTS 音频缓存索引（音频文件存本地磁盘，这里记录元信息与命中）
CREATE TABLE IF NOT EXISTS tts_cache (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  file_path VARCHAR(512) NOT NULL,
  bytes INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tts_created (created_at)
) ENGINE=InnoDB;


-- 系统设置（key-value：active_content_version 等）
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  k VARCHAR(64) NOT NULL UNIQUE,
  v VARCHAR(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB;

-- 课文内容覆盖（管理后台可视化编辑，未发布前有效）
CREATE TABLE IF NOT EXISTS content_overrides (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lesson_key VARCHAR(64) NOT NULL UNIQUE,
  text LONGTEXT,
  words JSON NULL,
  points JSON NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 管理员操作审计
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(64) NOT NULL,
  detail VARCHAR(512) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 积分流水（幂等：source_id 唯一；余额可在客户端按流水汇总或单独存储）
CREATE TABLE IF NOT EXISTS points_ledger (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id BIGINT UNSIGNED NOT NULL,
  source_id VARCHAR(128) NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  reason VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_points_source (child_id, source_id),
  KEY idx_points_child (child_id, created_at)
) ENGINE=InnoDB;

-- 已兑换虚拟商品
CREATE TABLE IF NOT EXISTS child_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id BIGINT UNSIGNED NOT NULL,
  item_id VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_child_item (child_id, item_id)
) ENGINE=InnoDB;

-- 积分·奖励兑换请求（孩子提交→家长审批；跨设备同步）
CREATE TABLE IF NOT EXISTS reward_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id BIGINT UNSIGNED NOT NULL,
  request_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL DEFAULT '',
  icon VARCHAR(16) NOT NULL DEFAULT '',
  kind VARCHAR(32) NOT NULL DEFAULT 'parent-reward',
  cost INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL DEFAULT 0,
  decided_at BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_reward (child_id, request_id)
) ENGINE=InnoDB;

-- 全局「积分与商店」配置（单行：管理员编辑，客户端同步读取）
CREATE TABLE IF NOT EXISTS store_config (
  id BIGINT UNSIGNED PRIMARY KEY,
  store_overrides JSON NULL,
  task_overrides JSON NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

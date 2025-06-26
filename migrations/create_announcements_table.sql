-- 创建公告表
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `content` TEXT NOT NULL COMMENT '公告内容',
  `type` ENUM('info', 'warning', 'error') NOT NULL DEFAULT 'info' COMMENT '公告类型',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `priority` INT NOT NULL DEFAULT 0 COMMENT '显示优先级',
  `start_time` DATETIME NULL COMMENT '生效开始时间',
  `end_time` DATETIME NULL COMMENT '生效结束时间',
  `created_by` INT UNSIGNED NOT NULL COMMENT '创建者ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_time` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统公告表'; 
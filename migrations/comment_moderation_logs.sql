-- 创建评论审核日志表
CREATE TABLE IF NOT EXISTS `comment_moderation_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `comment_id` INT NOT NULL,
  `result` ENUM('approved', 'rejected', 'pending') NOT NULL DEFAULT 'pending',
  `reason` VARCHAR(255) NULL,
  `score` FLOAT NULL,
  `raw_data` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; 
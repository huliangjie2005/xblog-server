-- 创建AI配置表
CREATE TABLE IF NOT EXISTS `ai_config` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider` VARCHAR(50) NOT NULL COMMENT 'AI服务提供商',
  `api_key` VARCHAR(255) NOT NULL COMMENT 'API密钥',
  `base_url` VARCHAR(255) NULL COMMENT 'API基础URL',
  `model` VARCHAR(50) NOT NULL COMMENT '使用的模型',
  `temperature` FLOAT NOT NULL DEFAULT 0.7 COMMENT '温度参数',
  `max_tokens` INT NOT NULL DEFAULT 2000 COMMENT '最大令牌数',
  `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用',
  `enable_summary` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用摘要生成',
  `enable_seo_suggestion` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用SEO建议',
  `enable_writing_help` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用写作辅助',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI配置表';

-- 创建AI生成历史表
CREATE TABLE IF NOT EXISTS `ai_generation_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `type` VARCHAR(50) NOT NULL COMMENT '生成类型',
  `prompt` TEXT NOT NULL COMMENT '提示词',
  `result` TEXT NOT NULL COMMENT '生成结果',
  `tokens_used` INT NOT NULL DEFAULT 0 COMMENT '使用的令牌数',
  `model` VARCHAR(50) NOT NULL COMMENT '使用的模型',
  `provider` VARCHAR(50) NOT NULL COMMENT '服务提供商',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI生成历史表';

-- 插入默认配置
INSERT INTO `ai_config` (`id`, `provider`, `api_key`, `model`, `enabled`) 
VALUES (1, 'openai', 'sk-your-api-key', 'gpt-3.5-turbo', 1)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP; 
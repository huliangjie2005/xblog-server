-- Create AI config table
CREATE TABLE IF NOT EXISTS `ai_config` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider` VARCHAR(50) NOT NULL COMMENT 'AI provider',
  `api_key` VARCHAR(255) NOT NULL COMMENT 'API key',
  `base_url` VARCHAR(255) NULL COMMENT 'API base URL',
  `model` VARCHAR(50) NOT NULL COMMENT 'Model name',
  `temperature` FLOAT NOT NULL DEFAULT 0.7 COMMENT 'Temperature parameter',
  `max_tokens` INT NOT NULL DEFAULT 2000 COMMENT 'Max tokens',
  `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT 'Enabled',
  `enable_summary` TINYINT NOT NULL DEFAULT 1 COMMENT 'Enable summary',
  `enable_seo_suggestion` TINYINT NOT NULL DEFAULT 1 COMMENT 'Enable SEO suggestion',
  `enable_writing_help` TINYINT NOT NULL DEFAULT 1 COMMENT 'Enable writing help',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI config table';

-- Create AI generation history table
CREATE TABLE IF NOT EXISTS `ai_generation_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL COMMENT 'User ID',
  `type` VARCHAR(50) NOT NULL COMMENT 'Generation type',
  `prompt` TEXT NOT NULL COMMENT 'Prompt',
  `result` TEXT NOT NULL COMMENT 'Result',
  `tokens_used` INT NOT NULL DEFAULT 0 COMMENT 'Tokens used',
  `model` VARCHAR(50) NOT NULL COMMENT 'Model used',
  `provider` VARCHAR(50) NOT NULL COMMENT 'Provider',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
  PRIMARY KEY (`id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI generation history table';

-- Insert default config
INSERT INTO `ai_config` (`id`, `provider`, `api_key`, `model`, `enabled`) 
VALUES (1, 'openai', 'sk-your-api-key', 'gpt-3.5-turbo', 1)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP; 
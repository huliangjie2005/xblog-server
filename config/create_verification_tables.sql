-- 用户注册验证码表
CREATE TABLE IF NOT EXISTS `public_users_verification` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL COMMENT '用户邮箱',
  `verification_code` VARCHAR(10) NOT NULL COMMENT '验证码',
  `verification_expires` DATETIME NOT NULL COMMENT '过期时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_email` (`email`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户注册验证码';

-- 用户密码重置验证码表
CREATE TABLE IF NOT EXISTS `public_users_reset_password` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL COMMENT '用户邮箱',
  `reset_code` VARCHAR(10) NOT NULL COMMENT '重置验证码',
  `reset_expires` DATETIME NOT NULL COMMENT '过期时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_email` (`email`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户密码重置验证码';

-- 定期清理过期验证码的事件
DELIMITER $$

CREATE EVENT IF NOT EXISTS `event_clean_verification_codes`
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
  -- 清理过期的注册验证码
  DELETE FROM `public_users_verification` 
  WHERE verification_expires < NOW();
  
  -- 清理过期的密码重置验证码
  DELETE FROM `public_users_reset_password` 
  WHERE reset_expires < NOW();
  
  -- 清理超过7天的所有验证码记录
  DELETE FROM `public_users_verification` 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
  
  DELETE FROM `public_users_reset_password` 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
END$$

DELIMITER ; 
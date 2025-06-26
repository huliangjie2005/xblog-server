USE xblog;

-- 创建文件夹表
CREATE TABLE IF NOT EXISTS `folders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT '文件夹名称',
  `path` varchar(255) NOT NULL COMMENT '文件夹路径',
  `parent_id` int(11) DEFAULT NULL COMMENT '父文件夹ID',
  `created_by` bigint DEFAULT NULL COMMENT '创建者ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 在文件表中添加文件夹字段
ALTER TABLE `files` ADD COLUMN IF NOT EXISTS `folder_id` int(11) DEFAULT NULL COMMENT '所属文件夹ID' AFTER `storage_type`;
ALTER TABLE `files` ADD KEY IF NOT EXISTS `idx_folder_id` (`folder_id`);

-- 创建根文件夹
INSERT INTO `folders` (`id`, `name`, `path`, `parent_id`) VALUES (1, 'Root', '/', NULL);

-- 添加外键约束（可选执行）
-- ALTER TABLE `folders` ADD CONSTRAINT `fk_folders_parent` FOREIGN KEY (`parent_id`) REFERENCES `folders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- ALTER TABLE `folders` ADD CONSTRAINT `fk_folders_creator` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- ALTER TABLE `files` ADD CONSTRAINT `fk_files_folder` FOREIGN KEY (`folder_id`) REFERENCES `folders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE; 
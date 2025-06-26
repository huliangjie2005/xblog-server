USE xblog;

-- Create folders table
CREATE TABLE IF NOT EXISTS `folders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'folder name',
  `path` varchar(255) NOT NULL COMMENT 'folder path',
  `parent_id` int(11) DEFAULT NULL COMMENT 'parent folder id',
  `created_by` bigint DEFAULT NULL COMMENT 'creator id',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create root folder if it doesn't exist
INSERT IGNORE INTO `folders` (`id`, `name`, `path`, `parent_id`) VALUES (1, 'Root', '/', NULL); 
SET @add_parent_column := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `post_comments` ADD COLUMN `parent_comment_id` BIGINT UNSIGNED NULL AFTER `user_id`',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post_comments'
    AND COLUMN_NAME = 'parent_comment_id'
);
PREPARE add_parent_column_stmt FROM @add_parent_column;
EXECUTE add_parent_column_stmt;
DEALLOCATE PREPARE add_parent_column_stmt;

SET @add_parent_index := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `post_comments` ADD INDEX `idx_post_comments_parent` (`parent_comment_id`)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post_comments'
    AND INDEX_NAME = 'idx_post_comments_parent'
);
PREPARE add_parent_index_stmt FROM @add_parent_index;
EXECUTE add_parent_index_stmt;
DEALLOCATE PREPARE add_parent_index_stmt;

SET @add_parent_fk := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `post_comments` ADD CONSTRAINT `fk_post_comments_parent` FOREIGN KEY (`parent_comment_id`) REFERENCES `post_comments` (`id`) ON DELETE SET NULL',
    'SELECT 1'
  )
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post_comments'
    AND COLUMN_NAME = 'parent_comment_id'
    AND REFERENCED_TABLE_NAME = 'post_comments'
);
PREPARE add_parent_fk_stmt FROM @add_parent_fk;
EXECUTE add_parent_fk_stmt;
DEALLOCATE PREPARE add_parent_fk_stmt;

CREATE TABLE IF NOT EXISTS `comment_reactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `comment_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `reaction_type` ENUM('agree','disagree') NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_comment_reactions_comment_user` (`comment_id`, `user_id`),
  KEY `idx_comment_reactions_user` (`user_id`),
  CONSTRAINT `fk_comment_reactions_comment`
    FOREIGN KEY (`comment_id`) REFERENCES `post_comments` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_comment_reactions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

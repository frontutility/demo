-- Add pin fields to posts table
ALTER TABLE `posts` 
ADD COLUMN IF NOT EXISTS `is_pinned` TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `pinned_at` DATETIME NULL,
ADD COLUMN IF NOT EXISTS `is_globally_pinned` TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS `globally_pinned_at` DATETIME NULL,
ADD COLUMN IF NOT EXISTS `globally_pinned_by_admin_id` BIGINT UNSIGNED NULL,
ADD INDEX IF NOT EXISTS `idx_posts_pinned` (`is_pinned`, `pinned_at`),
ADD INDEX IF NOT EXISTS `idx_posts_globally_pinned` (`is_globally_pinned`, `globally_pinned_at`);

-- Add foreign key constraint for globally_pinned_by_admin_id if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = 'posts';
SET @constraintname = 'fk_posts_globally_pinned_admin';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE
      table_schema = @dbname
      AND table_name = @tablename
      AND constraint_name = @constraintname
  ) > 0,
  'SELECT 1',
  CONCAT(
    'ALTER TABLE `', @tablename, '` ',
    'ADD CONSTRAINT `', @constraintname, '` ',
    'FOREIGN KEY (`globally_pinned_by_admin_id`) REFERENCES `admins` (`id`) ',
    'ON UPDATE CASCADE ON DELETE SET NULL'
  )
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

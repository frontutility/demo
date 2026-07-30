-- Add is_verified flag to businesses
ALTER TABLE `businesses`
  ADD COLUMN `is_verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `views_count`;

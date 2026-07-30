-- Admin editable count overrides for the Users module.
-- These values let admins persist manual count corrections in MySQL
-- without breaking the existing live aggregation queries elsewhere.
ALTER TABLE `users`
  ADD COLUMN `followers_count_override` INT UNSIGNED NULL DEFAULT NULL AFTER `blue_tick_status`,
  ADD COLUMN `following_count_override` INT UNSIGNED NULL DEFAULT NULL AFTER `followers_count_override`,
  ADD COLUMN `posts_count_override` INT UNSIGNED NULL DEFAULT NULL AFTER `following_count_override`,
  ADD COLUMN `comments_count_override` INT UNSIGNED NULL DEFAULT NULL AFTER `posts_count_override`,
  ADD COLUMN `agree_count_override` INT UNSIGNED NULL DEFAULT NULL AFTER `comments_count_override`,
  ADD COLUMN `disagree_count_override` INT UNSIGNED NULL DEFAULT NULL AFTER `agree_count_override`,
  ADD COLUMN `shares_count_override` INT UNSIGNED NULL DEFAULT NULL AFTER `disagree_count_override`;

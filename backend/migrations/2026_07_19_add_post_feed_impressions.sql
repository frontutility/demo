-- Per-user viewport impressions used to keep already-seen posts from dominating Home.
CREATE TABLE IF NOT EXISTS `post_feed_impressions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `post_id` BIGINT UNSIGNED NOT NULL,
  `seen_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `first_seen_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_post_feed_impressions_user_post` (`user_id`, `post_id`),
  KEY `idx_post_feed_impressions_user_last_seen` (`user_id`, `last_seen_at`),
  KEY `idx_post_feed_impressions_post` (`post_id`),
  CONSTRAINT `fk_post_feed_impressions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_post_feed_impressions_post`
    FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `connectnkt`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `connectnkt`;

CREATE TABLE IF NOT EXISTS `token_revocations` (
  `jti` CHAR(32) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`jti`),
  KEY `idx_token_revocations_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `auth_email_otps` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `purpose` ENUM('registration','password_reset') NOT NULL,
  `otp_hash` VARCHAR(255) NOT NULL,
  `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `consumed_at` DATETIME NULL DEFAULT NULL,
  `reset_token_hash` CHAR(64) NULL DEFAULT NULL,
  `reset_token_expires_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_auth_email_otps_lookup` (`email`, `purpose`, `consumed_at`, `expires_at`),
  KEY `idx_auth_email_otps_reset_token` (`reset_token_hash`, `reset_token_expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `admins` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `username` VARCHAR(60) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('super_admin', 'moderator', 'editor') NOT NULL DEFAULT 'super_admin',
  `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  `last_login_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admins_username` (`username`),
  UNIQUE KEY `uq_admins_email` (`email`),
  KEY `idx_admins_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- INSERT INTO `admins` (`name`, `username`, `email`, `password_hash`, `role`, `status`, `last_login_at`) VALUES
-- ('adminrajkumar', 'admin_rajkumar', 'aminrajkumar@gmail.com', '$2y$10$YourHashedPasswordHere', 'super_admin', 'active', NULL);

CREATE TABLE `villages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(170) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_villages_name` (`name`),
  UNIQUE KEY `uq_villages_slug` (`slug`),
  KEY `idx_villages_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `post_categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_post_categories_name` (`name`),
  UNIQUE KEY `uq_post_categories_slug` (`slug`),
  KEY `idx_post_categories_active_order` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `village_id` BIGINT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(120) NOT NULL,
  `username` VARCHAR(60) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `mobile` VARCHAR(20) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `father_name` VARCHAR(120) DEFAULT NULL,
  `gender` ENUM('male','female','other','prefer_not_to_say') DEFAULT NULL,
  `date_of_birth` DATE DEFAULT NULL,
  `bio` VARCHAR(500) DEFAULT NULL,
  `profile_image_url` LONGTEXT DEFAULT NULL,
  `blue_tick_status` ENUM('none','pending','verified','rejected')
    NOT NULL DEFAULT 'none',
  `can_create_media_posts` TINYINT(1)
    NOT NULL DEFAULT 0,
  `followers_count_override` INT UNSIGNED DEFAULT NULL,
  `following_count_override` INT UNSIGNED DEFAULT NULL,
  `posts_count_override` INT UNSIGNED DEFAULT NULL,
  `comments_count_override` INT UNSIGNED DEFAULT NULL,
  `agree_count_override` INT UNSIGNED DEFAULT NULL,
  `disagree_count_override` INT UNSIGNED DEFAULT NULL,
  `shares_count_override` INT UNSIGNED DEFAULT NULL,
  `account_status` ENUM('active','hidden','suspended')
    NOT NULL DEFAULT 'active',
  `hidden_at` DATETIME DEFAULT NULL,
  `suspended_at` DATETIME DEFAULT NULL,
  `last_login_at` DATETIME DEFAULT NULL,
  `remember_token` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_mobile` (`mobile`),
  KEY `idx_users_village_id` (`village_id`),
  KEY `idx_users_account_status` (`account_status`),
  KEY `idx_users_blue_tick_status` (`blue_tick_status`),
  FULLTEXT KEY `ft_users_search`
  (
    `name`,
    `username`,
    `email`,
    `mobile`,
    `bio`
  ),
  CONSTRAINT `fk_users_village`
    FOREIGN KEY (`village_id`)
    REFERENCES `villages` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_settings` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `email_notifications` TINYINT(1) NOT NULL DEFAULT 1,
  `hide_from_search` TINYINT(1) NOT NULL DEFAULT 0,
  `profile_visibility` ENUM('public', 'followers', 'private') NOT NULL DEFAULT 'public',
  `email_visibility` ENUM('public', 'followers', 'private') NOT NULL DEFAULT 'public',
  `phone_visibility` ENUM('public', 'followers', 'private') NOT NULL DEFAULT 'public',
  `followers_visibility` ENUM('public', 'followers', 'private') NOT NULL DEFAULT 'public',
  `following_visibility` ENUM('public', 'followers', 'private') NOT NULL DEFAULT 'public',
  `show_in_search` TINYINT(1) NOT NULL DEFAULT 1,
  `two_factor_reminders` TINYINT(1) NOT NULL DEFAULT 1,
  `theme_preference` ENUM('light', 'dark', 'system') NOT NULL DEFAULT 'system',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_settings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `posts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `slug` VARCHAR(220) NULL,
  `post_type` ENUM('text','image','image_text','poll')
    NOT NULL DEFAULT 'text',
  `content` TEXT NULL,
  `is_hidden` TINYINT(1) NOT NULL DEFAULT 0,
  `agrees_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `disagrees_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `comments_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `shares_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_posts_user_id` (`user_id`),
  KEY `idx_posts_category_id` (`category_id`),
  KEY `idx_posts_created_at` (`created_at`),
  KEY `idx_posts_hidden_created` (`is_hidden`, `created_at`),
  KEY `idx_posts_type` (`post_type`),
  FULLTEXT KEY `ft_posts_content` (`content`),
  CONSTRAINT `fk_posts_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_posts_category`
    FOREIGN KEY (`category_id`)
    REFERENCES `post_categories` (`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `post_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` BIGINT UNSIGNED NOT NULL,
  `image_url` LONGTEXT NOT NULL,
  `alt_text` VARCHAR(255) NULL,
  `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_post_images_post_sort` (`post_id`, `sort_order`),
  KEY `idx_post_images_post_id` (`post_id`),
  CONSTRAINT `fk_post_images_post`
    FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `followers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `follower_id` BIGINT UNSIGNED NOT NULL,
  `followed_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_followers_pair` (`follower_id`, `followed_id`),
  KEY `idx_followers_followed_id` (`followed_id`),
  CONSTRAINT `fk_followers_follower`
    FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_followers_followed`
    FOREIGN KEY (`followed_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `post_reactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `reaction_type` ENUM('agree', 'disagree') NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_post_reactions_pair` (`post_id`, `user_id`),
  KEY `idx_post_reactions_user_id` (`user_id`),
  KEY `idx_post_reactions_type` (`reaction_type`),
  CONSTRAINT `fk_post_reactions_post`
    FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_post_reactions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `post_comments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `parent_comment_id` BIGINT UNSIGNED NULL,
  `body` TEXT NOT NULL,
  `is_hidden` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_post_comments_post_id` (`post_id`),
  KEY `idx_post_comments_parent_id` (`parent_comment_id`),
  KEY `idx_post_comments_user_id` (`user_id`),
  CONSTRAINT `fk_post_comments_post`
    FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_post_comments_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_post_comments_parent`
    FOREIGN KEY (`parent_comment_id`) REFERENCES `post_comments` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recipient_user_id` BIGINT UNSIGNED NOT NULL,
  `actor_user_id` BIGINT UNSIGNED NULL,
  `notification_type` ENUM('follow', 'comment', 'blue_tick', 'system', 'post_reaction', 'report') NOT NULL DEFAULT 'system',
  `title` VARCHAR(160) NOT NULL,
  `body` TEXT NOT NULL,
  `entity_type` VARCHAR(50) NULL,
  `entity_id` BIGINT UNSIGNED NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_recipient_read_created` (`recipient_user_id`, `is_read`, `created_at`),
  KEY `idx_notifications_actor_id` (`actor_user_id`),
  CONSTRAINT `fk_notifications_recipient`
    FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_actor`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `report_type` ENUM('post', 'user', 'comment') NOT NULL DEFAULT 'post',
  `reported_post_id` BIGINT UNSIGNED NULL,
  `reported_user_id` BIGINT UNSIGNED NULL,
  `reported_comment_id` BIGINT UNSIGNED NULL,
  `reporter_user_id` BIGINT UNSIGNED NULL,
  `reported_by_display_name` VARCHAR(120) NULL,
  `reason` VARCHAR(255) NOT NULL,
  `custom_reason` TEXT NULL,
  `status` ENUM('pending', 'resolved', 'dismissed') NOT NULL DEFAULT 'pending',
  `moderation_notes` TEXT NULL,
  `resolved_by_admin_id` BIGINT UNSIGNED NULL,
  `resolved_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reports_status_type` (`status`, `report_type`),
  KEY `idx_reports_reported_post` (`reported_post_id`),
  KEY `idx_reports_reported_user` (`reported_user_id`),
  KEY `idx_reports_reporter_user` (`reporter_user_id`),
  KEY `idx_reports_resolved_by_admin` (`resolved_by_admin_id`),
  CONSTRAINT `fk_reports_post`
    FOREIGN KEY (`reported_post_id`) REFERENCES `posts` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_reports_user`
    FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_reports_comment`
    FOREIGN KEY (`reported_comment_id`) REFERENCES `post_comments` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_reports_reporter`
    FOREIGN KEY (`reporter_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT `fk_reports_admin`
    FOREIGN KEY (`resolved_by_admin_id`) REFERENCES `admins` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `blue_tick_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `request_reason` TEXT NULL,
  `followers_count_snapshot` INT UNSIGNED NOT NULL DEFAULT 0,
  `request_status` ENUM('pending', 'approved', 'rejected', 'revoked') NOT NULL DEFAULT 'pending',
  `requested_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_by_admin_id` BIGINT UNSIGNED NULL,
  `reviewed_at` DATETIME NULL,
  `review_notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_blue_tick_requests_user_id` (`user_id`),
  KEY `idx_blue_tick_requests_status_requested` (`request_status`, `requested_at`),
  KEY `idx_blue_tick_requests_reviewed_by_admin` (`reviewed_by_admin_id`),
  CONSTRAINT `fk_blue_tick_requests_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_blue_tick_requests_admin`
    FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `admins` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cms_pages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(170) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `seo_title` VARCHAR(160) NULL,
  `meta_description` VARCHAR(255) NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cms_pages_title` (`title`),
  UNIQUE KEY `uq_cms_pages_slug` (`slug`),
  KEY `idx_cms_pages_published_sort` (`is_published`, `sort_order`),
  KEY `idx_cms_pages_updated_by_admin` (`updated_by_admin_id`),
  CONSTRAINT `fk_cms_pages_admin`
    FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admins` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `help_center_articles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(170) NOT NULL,
  `question` VARCHAR(255) NOT NULL,
  `answer` LONGTEXT NOT NULL,
  `category` VARCHAR(120) NOT NULL,
  `tags` JSON NULL,
  `keywords` JSON NULL,
  `helpful_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `not_helpful_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_updated` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_help_center_articles_slug` (`slug`),
  KEY `idx_help_center_articles_category` (`category`),
  KEY `idx_help_center_articles_last_updated` (`last_updated`),
  KEY `idx_help_center_articles_published` (`is_published`),
  FULLTEXT KEY `ft_help_center_articles_search` (`question`, `answer`, `category`),
  CONSTRAINT `fk_help_center_articles_admin`
    FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admins` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `help_center_article_votes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `article_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `voter_key` VARCHAR(128) NOT NULL,
  `vote_type` ENUM('helpful', 'not_helpful') NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_help_center_votes_article_voter` (`article_id`, `voter_key`),
  KEY `idx_help_center_votes_user_id` (`user_id`),
  CONSTRAINT `fk_help_center_votes_article`
    FOREIGN KEY (`article_id`) REFERENCES `help_center_articles` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_help_center_votes_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contact_queries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `submitted_by_user_id` BIGINT UNSIGNED NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `category` ENUM('general', 'feedback', 'bug', 'feature', 'privacy', 'abuse', 'business', 'other') NOT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('new', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'new',
  `response_message` TEXT NULL,
  `responded_by_admin_id` BIGINT UNSIGNED NULL,
  `responded_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_contact_queries_status_created` (`status`, `created_at`),
  KEY `idx_contact_queries_category` (`category`),
  KEY `idx_contact_queries_email` (`email`),
  CONSTRAINT `fk_contact_queries_user`
    FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT `fk_contact_queries_admin`
    FOREIGN KEY (`responded_by_admin_id`) REFERENCES `admins` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `site_settings` (
  `id` TINYINT UNSIGNED NOT NULL,
  `website_name` VARCHAR(150) NOT NULL,
  `website_tagline` VARCHAR(180) NOT NULL,
  `website_description` TEXT NOT NULL,
  `logo_url` LONGTEXT NULL,
  `favicon_url` LONGTEXT NULL,
  `default_theme` ENUM('light', 'dark', 'system') NOT NULL DEFAULT 'light',
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_site_settings_updated_by_admin` (`updated_by_admin_id`),
  CONSTRAINT `fk_site_settings_admin`
    FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admins` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE polls (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id BIGINT UNSIGNED NOT NULL,
    question VARCHAR(500) NOT NULL,
    total_votes INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_polls_post_id (post_id),
    CONSTRAINT fk_polls_post
        FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE poll_options (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    poll_id BIGINT UNSIGNED NOT NULL,
    option_text VARCHAR(255) NOT NULL,
    votes_count INT UNSIGNED NOT NULL DEFAULT 0,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_poll_options_poll_id (poll_id),
    CONSTRAINT fk_poll_options_poll
        FOREIGN KEY (poll_id)
        REFERENCES polls(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE poll_votes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    poll_id BIGINT UNSIGNED NOT NULL,
    option_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_poll_votes_user (poll_id, user_id),
    KEY idx_poll_votes_option_id (option_id),
    KEY idx_poll_votes_user_id (user_id),
    CONSTRAINT fk_poll_votes_poll
        FOREIGN KEY (poll_id)
        REFERENCES polls(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_poll_votes_option
        FOREIGN KEY (option_id)
        REFERENCES poll_options(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_poll_votes_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE news (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    featured_image LONGTEXT NULL,
    content LONGTEXT NOT NULL,
    author_name VARCHAR(120) NOT NULL,
    status ENUM('draft','published','hidden')
    NOT NULL DEFAULT 'published',
    views_count INT UNSIGNED NOT NULL DEFAULT 0,
    published_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_news_slug (slug),
    KEY idx_news_status (status),
    KEY idx_news_published (published_at),
    FULLTEXT KEY ft_news_search (
        title,
        content,
        author_name
    )
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE post_mentions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT UNSIGNED NOT NULL,
    mentioned_user_id BIGINT UNSIGNED NOT NULL,
    mentioned_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_mention (post_id, mentioned_user_id),
    INDEX idx_post (post_id),
    INDEX idx_mentioned_user (mentioned_user_id),
    INDEX idx_mentioned_by (mentioned_by),
    CONSTRAINT fk_pm_post
        FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_pm_user
        FOREIGN KEY (mentioned_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_pm_by
        FOREIGN KEY (mentioned_by)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE TABLE `user_blocks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `blocker_user_id` BIGINT UNSIGNED NOT NULL,
    `blocked_user_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_block` (`blocker_user_id`, `blocked_user_id`),
    KEY `idx_blocker` (`blocker_user_id`),
    KEY `idx_blocked` (`blocked_user_id`),
    CONSTRAINT `fk_user_blocks_blocker`
        FOREIGN KEY (`blocker_user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_user_blocks_blocked`
        FOREIGN KEY (`blocked_user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `businesses` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `village_id` BIGINT UNSIGNED NOT NULL,
    `logo` LONGTEXT DEFAULT NULL,
    `business_name` VARCHAR(150) NOT NULL,
    `owner_name` VARCHAR(150) NOT NULL,
    `tagline` VARCHAR(100) DEFAULT NULL,
    `address` VARCHAR(500) NOT NULL,
    `website` VARCHAR(255) DEFAULT NULL,
    `whatsapp` VARCHAR(20) DEFAULT NULL,
    `facebook` VARCHAR(255) DEFAULT NULL,
    `instagram` VARCHAR(255) DEFAULT NULL,
    `youtube` VARCHAR(255) DEFAULT NULL,
    `opening_time` TIME DEFAULT NULL,
    `closing_time` TIME DEFAULT NULL,
    `days_open` JSON DEFAULT NULL,
    `offers` TEXT DEFAULT NULL,
    `services` TEXT DEFAULT NULL,
    `established_year` YEAR NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `business_license` VARCHAR(150) DEFAULT NULL,
    `gst_number` VARCHAR(30) DEFAULT NULL,
    `status` ENUM(
        'pending',
        'approved',
        'rejected',
        'suspended'
    ) NOT NULL DEFAULT 'pending',
    `admin_remark` TEXT DEFAULT NULL,
    `approved_at` DATETIME DEFAULT NULL,
    `approved_by` BIGINT UNSIGNED DEFAULT NULL,
    `followers_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `views_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_business_user` (`user_id`),
    KEY `idx_business_category` (`category_id`),
    KEY `idx_business_village` (`village_id`),
    KEY `idx_business_status` (`status`),
    FULLTEXT KEY `ft_business_search`
    (
        `business_name`,
        `owner_name`,
        `address`,
        `description`
    ),
    CONSTRAINT `fk_business_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_business_category`
        FOREIGN KEY (`category_id`)
        REFERENCES `business_categories` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT `fk_business_village`
        FOREIGN KEY (`village_id`)
        REFERENCES `villages` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `business_categories` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `icon` VARCHAR(255) DEFAULT NULL,
    `icon_web` VARCHAR(50) DEFAULT NULL,
    `icon_emoji` VARCHAR(10) DEFAULT NULL,
    `type` ENUM('business', 'person', 'both') DEFAULT 'business',
    `image` VARCHAR(255) DEFAULT NULL,
    `description` TEXT DEFAULT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_business_categories_name` (`name`),
    UNIQUE KEY `uq_business_categories_slug` (`slug`),
    KEY `idx_business_categories_active` (`is_active`),
    KEY `idx_business_categories_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE deleted_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    account_type ENUM('personal','business') NOT NULL,
    name VARCHAR(120) NOT NULL,
    username VARCHAR(60) NOT NULL,
    email VARCHAR(191) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    village_id BIGINT UNSIGNED DEFAULT NULL,
    delete_reason VARCHAR(100) NOT NULL,
    custom_reason TEXT DEFAULT NULL,
    total_posts INT DEFAULT 0,
    total_comments INT DEFAULT 0,
    total_followers INT DEFAULT 0,
    total_following INT DEFAULT 0,
    deleted_by ENUM('user','admin') NOT NULL,
    admin_id BIGINT UNSIGNED DEFAULT NULL,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX(user_id),
    INDEX(username),
    INDEX(email),
    INDEX(deleted_at)
);

CREATE TABLE `events` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `event_title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL UNIQUE,
    `category` ENUM(
        'Shop Opening',
        'Celebration',
        'Religious Program',
        'Social & Community Event',
        'Education & Sports'
    ) NOT NULL,
    `organizer_name` VARCHAR(150) NOT NULL,
    `organizer_phone` VARCHAR(20) NOT NULL,
    `organizer_email` VARCHAR(150) DEFAULT NULL,
    `event_description` TEXT NOT NULL,
    `banner_image` VARCHAR(255) NOT NULL,
    `event_date` DATE NOT NULL,
    `start_time` TIME DEFAULT NULL,
    `end_time` TIME DEFAULT NULL,
    `venue_name` VARCHAR(255) NOT NULL,
    `full_address` TEXT NOT NULL,
    `village_area` VARCHAR(150) NOT NULL,
    `contact_person_1` VARCHAR(150) DEFAULT NULL,
    `contact_person_1_phone` VARCHAR(20) DEFAULT NULL,
    `contact_person_2` VARCHAR(150) DEFAULT NULL,
    `contact_person_2_phone` VARCHAR(20) DEFAULT NULL,
    `contact_person_3` VARCHAR(150) DEFAULT NULL,
    `contact_person_3_phone` VARCHAR(20) DEFAULT NULL,
    `whatsapp_number` VARCHAR(20) NOT NULL,
    `facebook_link` VARCHAR(255) DEFAULT NULL,
    `instagram_link` VARCHAR(255) DEFAULT NULL,
    `website_link` VARCHAR(255) DEFAULT NULL,
    `views` INT UNSIGNED NOT NULL DEFAULT 0,
    `status` ENUM(
        'Active',
        'Deleted'
    ) NOT NULL DEFAULT 'Active',
    `frontend_visible_until` DATETIME NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user` (`user_id`),
    KEY `idx_category` (`category`),
    KEY `idx_event_date` (`event_date`),
    KEY `idx_status` (`status`),
    KEY `idx_visible_until` (`frontend_visible_until`),
    CONSTRAINT `fk_events_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE donation_settings (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    qr_image VARCHAR(255) NOT NULL,
    upi_id VARCHAR(150) DEFAULT NULL,
    account_holder_name VARCHAR(150) DEFAULT NULL,
    donation_enabled TINYINT(1) NOT NULL DEFAULT 1,
    show_upi TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;






























INSERT INTO `post_categories` (`name`, `slug`, `is_active`, `sort_order`) VALUES
('News', 'news', 1, 1),
('Politics', 'politics', 1, 2),
('Education', 'education', 1, 3),
('Agriculture', 'agriculture', 1, 4),
('Jobs', 'jobs', 1, 5),
('Business', 'business', 1, 6),
('Events', 'events', 1, 7),
('Sports', 'sports', 1, 8),
('Health', 'health', 1, 9),
('Government Schemes', 'government-schemes', 1, 10),
('Village Issues', 'village-issues', 1, 11),
('Village Development', 'village-development', 1, 12),
('Community Activities', 'community-activities', 1, 13),
('Buy & Sell', 'buy-sell', 1, 14),
('Emergency Help', 'emergency-help', 1, 15),
('Other', 'other', 1, 16);

=====================================================================================================================================



INSERT INTO `site_settings` (`id`, `website_name`, `website_tagline`, `website_description`, `logo_url`, `favicon_url`, `default_theme`, `updated_by_admin_id`) VALUES
(1, 'ConnectNKT', 'Neem Ka Thana - Your City, Your Community', 'ConnectNKT is a hyperlocal social networking platform for Neem Ka Thana and surrounding villages.', NULL, NULL, 'light', 1);

=====================================================================================================================================



INSERT INTO `donation_settings` (`qr_image`, `upi_id`, `account_holder_name`, `donation_enabled`, `show_upi`) VALUES
('donation-qr.png', 'connectnkt@upi', 'ConnectNKT Foundation', 1, 1);
======================================================================================================================================

INSERT INTO `villages` (`name`, `slug`, `is_active`, `created_at`, `updated_at`, `deleted_at`) VALUES
('Aagri', 'aagri', 0, NOW(), NOW(), NULL),
('Abhay colony nkt', 'abhay-colony-nkt', 0, NOW(), NOW(), NULL),
('Agawari', 'agawari', 0, NOW(), NOW(), NULL),
('Antala', 'antala', 1, NOW(), NOW(), NULL),
('Baghpat Nagar', 'baghpat-nagar', 0, NOW(), NOW(), NULL),
('Ballabh Das Pura', 'ballabh-das-pura', 0, NOW(), NOW(), NULL),
('Bandhawala-Bhopalpura', 'bandhawala-bhopalpura', 0, NOW(), NOW(), NULL),
('Baniyala', 'baniyala', 0, NOW(), NOW(), NULL),
('Baniyala Nagar', 'baniyala-nagar', 0, NOW(), NOW(), NULL),
('Barsinghwas', 'barsinghwas', 0, NOW(), NOW(), NULL),
('Basri Kalan', 'basri-kalan', 0, NOW(), NOW(), NULL),
('Basri Khurd', 'basri-khurd', 0, NOW(), NOW(), NULL),
('Bhagega', 'bhagega', 0, NOW(), NOW(), NULL),
('Bhagega Rs', 'bhagega-rs', 0, NOW(), NOW(), NULL),
('Bhagoth', 'bhagoth', 0, NOW(), NOW(), NULL),
('Bharala', 'bharala', 0, NOW(), NOW(), NULL),
('Bheetarli Ganwari', 'bheetarli-ganwari', 0, NOW(), NOW(), NULL),
('Bhomgarh', 'bhomgarh', 0, NOW(), NOW(), NULL),
('Bhoodoli', 'bhoodoli', 0, NOW(), NOW(), NULL),
('Bujiyala', 'bujiyala', 0, NOW(), NOW(), NULL),
('Chak Charawas', 'chak-charawas', 0, NOW(), NOW(), NULL),
('Chak Mandoli', 'chak-mandoli', 0, NOW(), NOW(), NULL),
('Chala', 'chala', 0, NOW(), NOW(), NULL),
('Charansingh Nagar', 'charansingh-nagar', 0, NOW(), NOW(), NULL),
('Charanwas Urf Puranabas', 'charanwas-urf-puranabas', 0, NOW(), NOW(), NULL),
('Chawani nkt', 'chawani-nkt', 0, NOW(), NOW(), NULL),
('Chhapar', 'chhapar', 0, NOW(), NOW(), NULL),
('Dareeba', 'dareeba', 0, NOW(), NOW(), NULL),
('Dayal Ki Nangal', 'dayal-ki-nangal', 0, NOW(), NOW(), NULL),
('Deepawas', 'deepawas', 0, NOW(), NOW(), NULL),
('Dehra Johri', 'dehra-johri', 0, NOW(), NOW(), NULL),
('Devnagar', 'devnagar', 0, NOW(), NOW(), NULL),
('Dhani Chala', 'dhani-chala', 0, NOW(), NOW(), NULL),
('Dungarwas', 'dungarwas', 0, NOW(), NOW(), NULL),
('Ganeshwar', 'ganeshwar', 0, NOW(), NOW(), NULL),
('Ganwari', 'ganwari', 0, NOW(), NOW(), NULL),
('Ganwari mod circle nkt', 'ganwari-mod-circle-nkt', 0, NOW(), NOW(), NULL),
('Ghata Guwar', 'ghata-guwar', 0, NOW(), NOW(), NULL),
('Godawas', 'godawas', 0, NOW(), NOW(), NULL),
('Gopalgarh', 'gopalgarh', 0, NOW(), NOW(), NULL),
('Gordhanpura', 'gordhanpura', 0, NOW(), NOW(), NULL),
('Govindpura', 'govindpura', 0, NOW(), NOW(), NULL),
('Guhala (Ct)', 'guhala-ct', 0, NOW(), NOW(), NULL),
('Guwar', 'guwar', 0, NOW(), NOW(), NULL),
('Harjan Pura', 'harjan-pura', 0, NOW(), NOW(), NULL),
('Heera Nagar', 'heera-nagar', 0, NOW(), NOW(), NULL),
('Hulda Ka Bas', 'hulda-ka-bas', 0, NOW(), NOW(), NULL),
('Jagat Singh Nagar', 'jagat-singh-nagar', 0, NOW(), NOW(), NULL),
('Jassi Ka Bas', 'jassi-ka-bas', 0, NOW(), NOW(), NULL),
('Jatala', 'jatala', 0, NOW(), NOW(), NULL),
('Jeelo', 'jeelo', 0, NOW(), NOW(), NULL),
('Jhalra', 'jhalra', 0, NOW(), NOW(), NULL),
('Jhankra', 'jhankra', 0, NOW(), NOW(), NULL),
('Jhareenda', 'jhareenda', 0, NOW(), NOW(), NULL),
('Jheerana', 'jheerana', 0, NOW(), NOW(), NULL),
('Jodli', 'jodli', 0, NOW(), NOW(), NULL),
('Jyotiba Nagar', 'jyotiba-nagar', 0, NOW(), NOW(), NULL),
('Kairwali', 'kairwali', 0, NOW(), NOW(), NULL),
('Kalakota', 'kalakota', 0, NOW(), NOW(), NULL),
('kamla modi dharmshala nkt', 'kamla-modi-dharmshala-nkt', 0, NOW(), NOW(), NULL),
('Kapil govt hospital', 'kapil-govt-hospital', 0, NOW(), NOW(), NULL),
('Karnpura', 'karnpura', 0, NOW(), NOW(), NULL),
('Khadag Beejpur', 'khadag-beejpur', 0, NOW(), NOW(), NULL),
('Khadra', 'khadra', 0, NOW(), NOW(), NULL),
('Khetri mod nkt', 'khetri-mod-nkt', 0, NOW(), NOW(), NULL),
('Khudaliya', 'khudaliya', 0, NOW(), NOW(), NULL),
('Kotra', 'kotra', 0, NOW(), NOW(), NULL),
('Kunwara', 'kunwara', 0, NOW(), NOW(), NULL),
('Kurbara', 'kurbara', 0, NOW(), NOW(), NULL),
('Kushal Pura', 'kushal-pura', 0, NOW(), NOW(), NULL),
('Lakhaki Nangal', 'lakhaki-nangal', 0, NOW(), NOW(), NULL),
('Luharwas', 'luharwas', 0, NOW(), NOW(), NULL),
('Mahawa', 'mahawa', 1, NOW(), NOW(), NULL),
('Malnagar', 'malnagar', 0, NOW(), NOW(), NULL),
('Mandoli', 'mandoli', 0, NOW(), NOW(), NULL),
('Mangalpura', 'mangalpura', 0, NOW(), NOW(), NULL),
('Mankri', 'mankri', 0, NOW(), NOW(), NULL),
('Manpura', 'manpura', 0, NOW(), NOW(), NULL),
('Mansingh colony nkt', 'mansingh-colony-nkt', 0, NOW(), NOW(), NULL),
('Maukalwas', 'maukalwas', 0, NOW(), NOW(), NULL),
('Mawanda Kalan', 'mawanda-kalan', 0, NOW(), NOW(), NULL),
('Mawanda Khurd', 'mawanda-khurd', 0, NOW(), NOW(), NULL),
('Mawanda Railway Station', 'mawanda-railway-station', 0, NOW(), NOW(), NULL),
('Mokalwas', 'mokalwas', 0, NOW(), NOW(), NULL),
('Nanagwas', 'nanagwas', 0, NOW(), NOW(), NULL),
('Napawali', 'napawali', 0, NOW(), NOW(), NULL),
('Narsinghpuri', 'narsinghpuri', 0, NOW(), NOW(), NULL),
('Natha Ki Nangal', 'natha-ki-nangal', 0, NOW(), NOW(), NULL),
('Naya Bas', 'naya-bas', 0, NOW(), NOW(), NULL),
('Naya Nagar', 'naya-nagar', 0, NOW(), NOW(), NULL),
('Near by Nagar palika office nkt', 'nagar-palika-office-nkt', 0, NOW(), NOW(), NULL),
('Near by nehru park nkt', 'nehru-park-nkt', 0, NOW(), NOW(), NULL),
('Near by santoshi mata mandir nkt', 'santoshi-mata-mandir-nkt', 0, NOW(), NOW(), NULL),
('Near by snkp college nkt', 'snkp-college-nkt', 0, NOW(), NOW(), NULL),
('Near ghar super market nkt', 'ghar-super-market-nkt', 0, NOW(), NOW(), NULL),
('Near Govind tower nkt', 'govind-tower-nkt', 0, NOW(), NOW(), NULL),
('Near Gurjar hostel nkt', 'gurjar-hostel-nkt', 0, NOW(), NOW(), NULL),
('Near Laxmi talkies nkt', 'laxmi-talkies-nkt', 0, NOW(), NOW(), NULL),
('Near purana bus stand nkt', 'purana-bus-stand-nkt', 0, NOW(), NOW(), NULL),
('Near Railway puliya nkt', 'railway-puliya-nkt', 0, NOW(), NOW(), NULL),
('Near Rajput hostel nkt', 'rajput-hostel-nkt', 0, NOW(), NOW(), NULL),
('Neem Ka Thana(City)', 'neem-ka-thana-city', 0, NOW(), NOW(), NULL),
('Neemod', 'neemod', 1, NOW(), NOW(), NULL),
('Palasala', 'palasala', 1, NOW(), NOW(), NULL),
('Patel Nagar', 'patel-nagar', 0, NOW(), NOW(), NULL),
('Peethampuri', 'peethampuri', 0, NOW(), NOW(), NULL),
('Rajnagar', 'rajnagar', 0, NOW(), NOW(), NULL),
('Ramlila maidan rod nkt', 'ramlila-maidan-rod-nkt', 0, NOW(), NOW(), NULL),
('Ramlyawas', 'ramlyawas', 0, NOW(), NOW(), NULL),
('Ranasar', 'ranasar', 0, NOW(), NOW(), NULL),
('RIICO area nkt', 'riico-area-nkt', 0, NOW(), NOW(), NULL),
('Roopawas', 'roopawas', 0, NOW(), NOW(), NULL),
('Salawali', 'salawali', 0, NOW(), NOW(), NULL),
('Sedu Ka Bas', 'sedu-ka-bas', 0, NOW(), NOW(), NULL),
('Shivnagar', 'shivnagar', 0, NOW(), NOW(), NULL),
('Shyam nagar nkt', 'shyam-nagar-nkt', 0, NOW(), NOW(), NULL),
('Shyamnagar', 'shyamnagar', 0, NOW(), NOW(), NULL),
('Sirohi', 'sirohi', 0, NOW(), NOW(), NULL),
('Tetarwalo Ka Bas', 'tetarwalo-ka-bas', 0, NOW(), NOW(), NULL),
('Theekariya', 'theekariya', 0, NOW(), NOW(), NULL),
('Tiwari Ka Bas', 'tiwari-ka-bas', 0, NOW(), NOW(), NULL),
('Toda', 'toda', 0, NOW(), NOW(), NULL),
('yadav colony nkt', 'yadav-colony-nkt', 0, NOW(), NOW(), NULL);




INSERT INTO business_categories (name, slug, icon, icon_web, icon_emoji, type, sort_order, is_active) VALUES
('Restaurant', 'restaurant', NULL, 'fa-utensils', '🍽️', 'business', 1, 1),
('Hotel', 'hotel', NULL, 'fa-hotel', '🏨', 'business', 2, 1),
('Cafe', 'cafe', NULL, 'fa-mug-saucer', '☕', 'business', 3, 1),
('Bakery', 'bakery', NULL, 'fa-bread-slice', '🍞', 'business', 4, 1),
('Sweet Shop', 'sweet-shop', NULL, 'fa-candy-cane', '🍬', 'business', 5, 1),
('Medical Store', 'medical-store', NULL, 'fa-prescription-bottle', '💊', 'business', 6, 1),
('Hospital', 'hospital', NULL, 'fa-hospital', '🏥', 'business', 7, 1),
('Clinic', 'clinic', NULL, 'fa-user-md', '🩺', 'business', 8, 1),
('Diagnostic Center', 'diagnostic-center', NULL, 'fa-microscope', '🔬', 'business', 9, 1),
('School', 'school', NULL, 'fa-school', '🏫', 'business', 10, 1),
('College', 'college', NULL, 'fa-university', '🎓', 'business', 11, 1),
('Coaching Institute', 'coaching-institute', NULL, 'fa-chalkboard-user', '📚', 'business', 12, 1),
('Computer Institute', 'computer-institute', NULL, 'fa-laptop-code', '💻', 'business', 13, 1),
('Grocery Store', 'grocery-store', NULL, 'fa-store', '🏪', 'business', 14, 1),
('Electronics Shop', 'electronics-shop', NULL, 'fa-tv', '📺', 'business', 15, 1),
('Mobile Shop', 'mobile-shop', NULL, 'fa-mobile-screen-button', '📱', 'business', 16, 1),
('Clothing Store', 'clothing-store', NULL, 'fa-vest', '👗', 'business', 17, 1),
('Footwear Store', 'footwear-store', NULL, 'fa-shoe-prints', '👟', 'business', 18, 1),
('Jewellery Shop', 'jewellery-shop', NULL, 'fa-gem', '💎', 'business', 19, 1),
('Furniture Store', 'furniture-store', NULL, 'fa-couch', '🛋️', 'business', 20, 1),
('Salon', 'salon', NULL, 'fa-wand-magic-sparkles', '💇', 'business', 21, 1),
('Beauty Parlour', 'beauty-parlour', NULL, 'fa-spa', '🌸', 'business', 22, 1),
('Gym & Fitness', 'gym-fitness', NULL, 'fa-dumbbell', '🏋️', 'business', 23, 1),
('Yoga Center', 'yoga-center', NULL, 'fa-person-walking', '🧘', 'business', 24, 1),
('Photographer', 'photographer', NULL, 'fa-camera', '📸', 'person', 25, 1),
('Event Planner', 'event-planner', NULL, 'fa-calendar-check', '🎉', 'person', 26, 1),
('Travel Agency', 'travel-agency', NULL, 'fa-plane', '✈️', 'business', 27, 1),
('Taxi Service', 'taxi-service', NULL, 'fa-car', '🚕', 'business', 28, 1),
('Real Estate', 'real-estate', NULL, 'fa-building', '🏢', 'business', 29, 1),
('Ladies Dress', 'ladies-dress', NULL, 'fa-vest', '👗', 'business', 30, 1),
('Rajputi Dress', 'rajputi-dress', NULL, 'fa-crown', '👘', 'business', 31, 1),
('Saree Shop', 'saree-shop', NULL, 'fa-female', '🥻', 'business', 32, 1),
('Gents Tailor', 'gents-tailor', NULL, 'fa-vest-patches', '👔', 'business', 33, 1),
('Kids Wear', 'kids-wear', NULL, 'fa-child', '🧸', 'business', 34, 1),
('Handicraft Store', 'handicraft-store', NULL, 'fa-hand-sparkles', '🏺', 'business', 35, 1),
('Advocate / Lawyer', 'advocate-lawyer', NULL, 'fa-scale-balanced', '⚖️', 'person', 36, 1),
('Teacher / Tutor', 'teacher-tutor', NULL, 'fa-chalkboard-user', '📚', 'person', 37, 1),
('Chartered Accountant', 'chartered-accountant', NULL, 'fa-calculator', '🧾', 'person', 38, 1),
('Architect', 'architect', NULL, 'fa-drafting-compass', '📐', 'person', 39, 1),
('Interior Designer', 'interior-designer', NULL, 'fa-paint-roller', '🎨', 'person', 40, 1),
('Makeup Artist', 'makeup-artist', NULL, 'fa-paintbrush', '💄', 'person', 41, 1),
('Fitness Trainer', 'fitness-trainer', NULL, 'fa-person-walking', '🏃', 'person', 42, 1),
('Software Developer', 'software-developer', NULL, 'fa-code', '💻', 'person', 43, 1),
('Digital Marketer', 'digital-marketer', NULL, 'fa-bullhorn', '📢', 'person', 44, 1),
('Astrologer / Pandit', 'astrologer-pandit', NULL, 'fa-star', '🔮', 'person', 45, 1),
('Hardware Store', 'hardware-store', NULL, 'fa-hammer', '🔨', 'business', 46, 1),
('Plumbing Service', 'plumbing-service', NULL, 'fa-wrench', '🔧', 'business', 47, 1),
('Electrician', 'electrician', NULL, 'fa-bolt', '⚡', 'person', 48, 1),
('Carpenter', 'carpenter', NULL, 'fa-hammer', '🪚', 'person', 49, 1),
('Painter', 'painter', NULL, 'fa-paint-roller', '🎨', 'person', 50, 1),
('Car Dealer', 'car-dealer', NULL, 'fa-car', '🚗', 'business', 51, 1),
('Bike Dealer', 'bike-dealer', NULL, 'fa-motorcycle', '🏍️', 'business', 52, 1),
('Garage / Mechanic', 'garage-mechanic', NULL, 'fa-wrench', '🔧', 'business', 53, 1),
('Petrol Pump', 'petrol-pump', NULL, 'fa-gas-pump', '⛽', 'business', 54, 1),
('Tyre Shop', 'tyre-shop', NULL, 'fa-circle', '⚙️', 'business', 55, 1),
('Meat Shop', 'meat-shop', NULL, 'fa-drumstick-bite', '🍗', 'business', 56, 1),
('Fish Shop', 'fish-shop', NULL, 'fa-fish', '🐟', 'business', 57, 1),
('Fruits & Vegetables', 'fruits-vegetables', NULL, 'fa-apple-whole', '🍎', 'business', 58, 1),
('General Store', 'general-store', NULL, 'fa-basket-shopping', '🛒', 'business', 59, 1),
('Spa Center', 'spa-center', NULL, 'fa-spa', '🌿', 'business', 60, 1),
('Nail Art Studio', 'nail-art-studio', NULL, 'fa-hand', '💅', 'business', 61, 1),
('Home Tutor', 'home-tutor', NULL, 'fa-house-chimney-user', '🏠📖', 'person', 62, 1),
('Content Writer', 'content-writer', NULL, 'fa-pen-fancy', '✍️', 'person', 63, 1),
('Graphic Designer', 'graphic-designer', NULL, 'fa-palette', '🎨', 'person', 64, 1),
('Video Editor', 'video-editor', NULL, 'fa-video', '🎬', 'person', 65, 1),
('Web Developer', 'web-developer', NULL, 'fa-globe', '🌐', 'person', 66, 1),
('Laundry Service', 'laundry-service', NULL, 'fa-shirt', '👕', 'business', 67, 1),
('Pest Control Service', 'pest-control', NULL, 'fa-bug', '🐜', 'business', 68, 1),
('Packers & Movers', 'packers-movers', NULL, 'fa-truck', '🚚', 'business', 69, 1),
('Courier Service', 'courier-service', NULL, 'fa-box', '📦', 'business', 70, 1),
('Printing Press', 'printing-press', NULL, 'fa-print', '🖨️', 'business', 71, 1),
('Stationery Shop', 'stationery-shop', NULL, 'fa-pen', '✏️', 'business', 72, 1),
('Optical Shop', 'optical-shop', NULL, 'fa-glasses', '👓', 'business', 73, 1),
('Watch Shop', 'watch-shop', NULL, 'fa-clock', '⌚', 'business', 74, 1),
('Toy Shop', 'toy-shop', NULL, 'fa-gamepad', '🧸', 'business', 75, 1),
('Sports Shop', 'sports-shop', NULL, 'fa-football', '⚽', 'business', 76, 1),
('Other', 'other', NULL, 'fa-ellipsis-h', '📌', 'business', 77, 1);













-- ============================================
-- HELP CENTER ARTICLES INSERT
-- ============================================
INSERT INTO `help_center_articles` (`slug`, `question`, `answer`, `category`, `tags`, `keywords`, `is_published`, `updated_by_admin_id`) VALUES
('what-is-connectnkt', 'What is ConnectNKT?', '<p>ConnectNKT is a hyperlocal text-based social community platform built for Neem Ka Thana and surrounding villages. It helps residents share local updates, ask questions, and support each other through meaningful conversations.</p>', 'Getting Started', '["connectnkt","platform","local"]', '["what is connectnkt","connectnkt meaning","local platform"]', 1, 1),
('who-can-use-connectnkt', 'Who can use ConnectNKT?', '<p>Anyone living in Neem Ka Thana or the surrounding villages can use ConnectNKT. The platform is designed for local residents, students, business owners, and community leaders to connect and share updates.</p>', 'Getting Started', '["users","community","access"]', '["who can use connectnkt","connectnkt users","eligibility"]', 1, 1),
('is-connectnkt-free', 'Is ConnectNKT free?', '<p>Yes, ConnectNKT is free to use for all residents. There are no subscription fees for creating an account, posting updates, or browsing community content.</p>', 'Getting Started', '["pricing","free","cost"]', '["is connectnkt free","connectnkt cost","pricing"]', 1, 1),
('why-was-connectnkt-created', 'Why was ConnectNKT created?', '<p>ConnectNKT was created to provide a local space for Neem Ka Thana residents to share news, ask questions, and stay informed without the noise of larger social networks.</p>', 'Getting Started', '["mission","purpose","community"]', '["why connectnkt","connectnkt purpose","mission"]', 1, 1),
('what-makes-connectnkt-different', 'What makes ConnectNKT different?', '<p>ConnectNKT focuses on local gatherings, text-based discussion, and community support. It limits distractions from photos and videos and promotes helpful local information.</p>', 'Getting Started', '["difference","features","focus"]', '["what makes connectnkt different","connectnkt benefits"]', 1, 1),
('how-do-i-create-an-account', 'How do I create an account?', '<p>To create an account, open the ConnectNKT app or website and use the Register page. Enter your details, choose a username, and verify your account as prompted.</p>', 'Account & Registration', '["register","sign up","account"]', '["create account","register","sign up"]', 1, 1),
('why-is-my-username-unavailable', 'Why is my username unavailable?', '<p>Usernames must be unique. If your desired username is already taken, choose a different variation or add numbers to create a unique name.</p>', 'Account & Registration', '["username","unavailable","registration"]', '["username unavailable","username taken","register username"]', 1, 1),
('can-i-change-my-username', 'Can I change my username?', '<p>Username changes may be limited for security and identity reasons. If changing your username is supported, follow the profile settings instructions or contact support.</p><p>If you do not see the option, your account may not allow username changes yet.</p>', 'Account & Registration', '["username","profile","settings"]', '["change username","edit username","username settings"]', 1, 1),
('how-do-i-update-profile-information', 'How do I update profile information?', '<p>Go to your profile settings and edit your name, bio, village, and other account details. Save changes after updating the fields.</p>', 'Account & Registration', '["profile","edit","settings"]', '["update profile","edit profile","profile information"]', 1, 1),
('can-i-change-village-information', 'Can I change my village information?', '<p>Village information is usually tied to your local identity. If the system allows village edits, update it in your settings. Otherwise, contact support with your verification details.</p>', 'Account & Registration', '["village","profile","identity"]', '["change village","edit village","village information"]', 1, 1),
('why-do-i-need-to-verify-information', 'Why do I need to verify information?', '<p>Verification helps keep the community trusted and reduces abuse. Verified details make it easier for other residents to trust your posts and profile.</p>', 'Account & Registration', '["verification","security","trust"]', '["verify information","verification reason","account trust"]', 1, 1),
('how-do-i-upload-profile-photo', 'How do I upload profile photo?', '<p>Open your profile page, choose the photo upload option, and select an image from your device. Follow the guidelines for size and content.</p>', 'Account & Registration', '["photo","profile","upload"]', '["upload profile photo","profile picture","avatar"]', 1, 1),
('why-is-my-photo-rejected', 'Why is my photo rejected?', '<p>Photos may be rejected if they do not meet the community guidelines or if they contain prohibited content. Use a clear image of yourself and avoid logos, text, or offensive material.</p><p>Check the photo policy for exact requirements.</p>', 'Account & Registration', '["photo","rejected","guidelines"]', '["photo rejected","profile photo issue"]', 1, 1),
('can-i-delete-my-account', 'Can I delete my account?', '<p>Yes, you can delete your account if the platform supports it. Visit account settings and look for the delete account option, or contact support for assistance.</p>', 'Account & Registration', '["delete account","close account","privacy"]', '["delete account","account removal","remove profile"]', 1, 1),
('can-i-hide-my-account', 'Can I hide my account?', '<p>You may be able to hide your account from public search or disable certain visibility settings. Check your privacy controls in the profile settings page.</p>', 'Account & Registration', '["privacy","hide account","visibility"]', '["hide account","private account"]', 1, 1),
('i-forgot-my-password', 'I forgot my password.', '<p>If you forget your password, use the password reset link on the login page. Enter your registered email or username and follow the reset instructions.</p>', 'Login & Security', '["password","login","reset"]', '["forgot password","reset password","login help"]', 1, 1),
('how-do-i-reset-password', 'How do I reset password?', '<p>Click "Forgot password" on the login screen, enter your email, and follow the reset link sent to your inbox. Choose a strong new password and confirm it.</p><p>If you do not receive an email, check your spam folder.</p>', 'Login & Security', '["password reset","account","security"]', '["reset password","forgot password"]', 1, 1),
('why-cant-i-login', 'Why can\'t I login?', '<p>Login issues may happen due to incorrect credentials, expired cookies, or account suspension. Double-check your username and password and try again.</p><p>If the issue persists, reset your password or contact support.</p>', 'Login & Security', '["login","access","errors"]', '["can\'t login","login problem","sign in issue"]', 1, 1),
('how-can-i-secure-my-account', 'How can I secure my account?', '<p>Use a strong password, keep your contact email updated, and avoid sharing your login details. Enable any available security features and report suspicious activity immediately.</p>', 'Login & Security', '["security","account safety","password"]', '["secure account","account security"]', 1, 1),
('what-should-i-do-if-someone-accesses-my-account', 'What should I do if someone accesses my account?', '<p>If someone else accessed your account, change your password immediately and contact support. Review recent activity and remove any unauthorized devices if available.</p>', 'Login & Security', '["security breach","unauthorized access","account"]', '["account compromised","someone accessed my account"]', 1, 1),
('how-do-i-create-a-post', 'How do I create a post?', '<p>To create a post, click the Create Post button in the sidebar, write your message, choose a category, and publish. Make sure it follows community guidelines.</p>', 'Posts & Content', '["post","create","content"]', '["create post","new post"]', 1, 1),
('what-is-the-maximum-post-limit', 'What is the maximum post limit?', '<p>The platform allows up to five posts per day to keep discussions focused and reduce spam. This limit helps maintain quality and fairness for everyone.</p>', 'Posts & Content', '["limit","post limit","daily posts"]', '["maximum post limit","post limit"]', 1, 1),
('why-can-i-post-only-5-times-per-day', 'Why can I post only 5 times per day?', '<p>The five-post daily limit is designed to prevent spam and encourage thoughtful participation. It helps keep the feed useful for everyone.</p>', 'Posts & Content', '["daily limit","spam prevention","posting"]', '["post only 5 times","daily post limit"]', 1, 1),
('why-was-my-post-removed', 'Why was my post removed?', '<p>Posts may be removed for violating community guidelines, posting prohibited content, or being reported by other users. Review the rules and adjust your post accordingly.</p><p>Contact support if you believe it was removed in error.</p>', 'Posts & Content', '["removed","guidelines","moderation"]', '["post removed","why post removed"]', 1, 1),
('can-i-edit-my-post', 'Can I edit my post?', '<p>Yes, you can edit your own posts within the allowed time window. Open the post and use the edit option to update the content.</p>', 'Posts & Content', '["edit post","update","content"]', '["edit post","change post"]', 1, 1),
('can-i-delete-my-post', 'Can I delete my post?', '<p>You can delete your own posts from the post actions menu. Deleted posts are removed from the feed, and you can create a new post later.</p>', 'Posts & Content', '["delete post","remove post","content"]', '["delete my post","remove post"]', 1, 1),
('why-are-photos-not-allowed', 'Why are photos not allowed?', '<p>Photos are not allowed to keep the platform lightweight and focused on local conversations. Text-only posts make the app faster and easier to use for everyone.</p>', 'Posts & Content', '["photos","content policy","format"]', '["photos not allowed","why photos prohibited"]', 1, 1),
('why-are-videos-not-allowed', 'Why are videos not allowed?', '<p>Videos are restricted to ensure the platform remains fast and accessible for users with slower connections. Text-based content also keeps discussions clearer and easier to moderate.</p>', 'Posts & Content', '["videos","content policy","format"]', '["videos not allowed","why videos prohibited"]', 1, 1),
('why-is-connectnkt-text-only', 'Why is ConnectNKT text-only?', '<p>ConnectNKT is text-only to make communication simple, fast, and inclusive. This keeps focus on meaningful local updates rather than media content.</p>', 'Posts & Content', '["text only","design","platform"]', '["text only","why text only"]', 1, 1),
('how-do-i-follow-someone', 'How do I follow someone?', '<p>Visit the user\'s profile and click the Follow button. Once you follow them, their posts will appear more often in your feed.</p>', 'Followers & Following', '["follow","profile","social"]', '["follow someone","following"]', 1, 1),
('how-many-users-can-i-follow-daily', 'How many users can I follow daily?', '<p>The platform may limit daily follows to prevent spam and encourage genuine connections. Follow responsibly and focus on people you know or trust.</p>', 'Followers & Following', '["follow limit","daily limit","social"]', '["follow daily limit","how many can I follow"]', 1, 1),
('why-cant-i-follow-more-users', 'Why can\'t I follow more users?', '<p>You may have reached the follow limit or the other user may have blocked follows. Wait until the follow limit resets or check if you\'ve reached your daily cap.</p>', 'Followers & Following', '["follow","limit","error"]', '["cant follow more","follow limit"]', 1, 1),
('how-do-i-unfollow-someone', 'How do I unfollow someone?', '<p>Visit the profile of the person you are following and click the Unfollow button to stop seeing their posts in your feed.</p>', 'Followers & Following', '["unfollow","profile","social"]', '["unfollow someone","stop following"]', 1, 1),
('how-are-followers-counted', 'How are followers counted?', '<p>Followers are counted when another user chooses to follow your profile. The follower count updates automatically as people follow or unfollow you.</p>', 'Followers & Following', '["followers","count","social"]', '["followers counted","how followers work"]', 1, 1),
('what-is-agree', 'What is Agree?', '<p>Agree is a reaction you can use when you support a post or find it helpful. It is similar to an upvote and helps highlight positive content.</p>', 'Agree / Disagree', '["agree","reaction","reactions"]', '["what is agree","agree reaction"]', 1, 1),
('what-is-disagree', 'What is Disagree?', '<p>Disagree is a reaction used when you do not agree with a post. It helps provide feedback while keeping the conversation respectful.</p>', 'Agree / Disagree', '["disagree","reaction","feedback"]', '["what is disagree","disagree reaction"]', 1, 1),
('can-i-change-my-reaction', 'Can I change my reaction?', '<p>Yes, you can usually change your reaction by selecting a different reaction button on the same post. This updates your feedback immediately.</p>', 'Agree / Disagree', '["reaction","change","agree"]', '["change reaction","edit reaction"]', 1, 1),
('why-is-my-reaction-not-visible', 'Why is my reaction not visible?', '<p>Your reaction may not be visible if there was a temporary issue or if the post was removed. Try refreshing the page and checking the post again.</p>', 'Agree / Disagree', '["reaction","visibility","issue"]', '["reaction not visible","reaction issue"]', 1, 1),
('how-do-comments-work', 'How do comments work?', '<p>Comments let you reply to posts and join conversations. Add your message below a post and submit it to share your thoughts with other users.</p>', 'Comments', '["comments","reply","interaction"]', '["how comments work","comment feature"]', 1, 1),
('can-i-delete-my-comment', 'Can I delete my comment?', '<p>Yes, you can delete your own comments. Open the comment menu and choose delete to remove it from the post thread.</p>', 'Comments', '["delete comment","comment","management"]', '["delete comment","remove comment"]', 1, 1),
('why-was-my-comment-removed', 'Why was my comment removed?', '<p>Comments may be removed if they violate guidelines, contain offensive language, or are reported by other users. Keep comments respectful and on-topic.</p>', 'Comments', '["comment removed","moderation","guidelines"]', '["comment removed","why comment removed"]', 1, 1),
('what-is-blue-tick', 'What is Blue Tick?', '<p>Blue Tick is a verification badge that shows an account is trusted or notable within the community. It helps people recognize authentic local voices.</p>', 'Blue Tick', '["blue tick","verification","badge"]', '["what is blue tick","blue tick meaning"]', 1, 1),
('how-do-i-apply', 'How do I apply?', '<p>To apply for Blue Tick, go to the Blue Tick section in your profile or settings and submit the verification request with any required details.</p>', 'Blue Tick', '["apply","blue tick","verification"]', '["apply blue tick","blue tick application"]', 1, 1),
('do-i-need-500-followers', 'Do I need 500 followers?', '<p>Follower requirements may vary. While higher follower counts can improve eligibility, the Blue Tick review also considers community activity and authenticity.</p>', 'Blue Tick', '["followers","eligibility","blue tick"]', '["500 followers","blue tick followers"]', 1, 1),
('who-can-receive-blue-tick', 'Who can receive Blue Tick?', '<p>Users who demonstrate a real connection to the community, responsible posting, and a trustworthy profile may be eligible for Blue Tick verification.</p><p>It is not available for anonymous or fake profiles.</p>', 'Blue Tick', '["eligibility","verification","badge"]', '["who can receive blue tick","blue tick eligibility"]', 1, 1),
('why-was-my-request-rejected', 'Why was my request rejected?', '<p>Blue Tick requests may be rejected if the profile does not meet verification criteria, lacks sufficient activity, or appears incomplete. Review the requirements and reapply if eligible.</p>', 'Blue Tick', '["rejected","verification","blue tick"]', '["request rejected","blue tick rejected"]', 1, 1),
('can-blue-tick-be-removed', 'Can Blue Tick be removed?', '<p>Yes, Blue Tick can be removed if the account violates community rules or loses verification requirements. Maintain good conduct to keep it active.</p>', 'Blue Tick', '["remove","verification","badge"]', '["blue tick removed","lose blue tick"]', 1, 1),
('how-do-i-report-a-post', 'How do I report a post?', '<p>Use the report option on the post menu, choose the reason, and submit. Reports help moderators review content that may violate policies.</p><p>Reports can be anonymous.</p>', 'Reporting', '["report post","moderation","safety"]', '["report a post","report post"]', 1, 1),
('how-do-i-report-a-user', 'How do I report a user?', '<p>Open the user profile or post menu and select the report user option. Provide the reason and details for the moderation team to review.</p>', 'Reporting', '["report user","safety","moderation"]', '["report user","how to report user"]', 1, 1),
('what-happens-after-reporting', 'What happens after reporting?', '<p>The moderation team reviews the report and may take action on content or accounts that violate community rules. You may not receive public details for privacy reasons.</p>', 'Reporting', '["reporting","moderation","follow up"]', '["after reporting","report process"]', 1, 1),
('can-reports-remain-anonymous', 'Can reports remain anonymous?', '<p>Yes, reports can remain anonymous so users can safely flag issues without revealing their identity. The moderation team protects reporter privacy.</p>', 'Reporting', '["anonymous report","privacy","safety"]', '["anonymous reports","report privacy"]', 1, 1),
('why-was-my-account-suspended', 'Why was my account suspended?', '<p>Accounts can be suspended for repeated rule violations, abusive content, or other serious community guideline breaches. Review the suspension notice for details.</p>', 'Account Suspension', '["suspension","ban","account"]', '["account suspended","why suspended"]', 1, 1),
('how-can-i-appeal-suspension', 'How can I appeal suspension?', '<p>If your account is suspended, follow the appeal instructions included in the suspension notice or contact support to request a review.</p>', 'Account Suspension', '["appeal","suspension","support"]', '["appeal suspension","suspension appeal"]', 1, 1),
('what-happens-after-repeated-violations', 'What happens after repeated violations?', '<p>Repeated violations may lead to longer suspension periods or permanent account removal. Follow the community guidelines to avoid escalation.</p>', 'Account Suspension', '["violations","suspension","policy"]', '["repeated violations","account consequences"]', 1, 1),
('can-suspended-accounts-be-restored', 'Can suspended accounts be restored?', '<p>Some suspended accounts can be restored after review, depending on the reason and whether the issue is resolved. Follow appeal procedures for help.</p>', 'Account Suspension', '["restore account","suspension","recovery"]', '["restore suspended account","account restoration"]', 1, 1),
('how-is-my-information-protected', 'How is my information protected?', '<p>Your information is protected using secure storage and privacy controls. Only the details you choose to share publicly are visible to other users.</p>', 'Privacy & Safety', '["privacy","security","data"]', '["information protected","privacy"]', 1, 1),
('can-others-see-my-phone-number', 'Can others see my phone number?', '<p>Phone numbers are not shared publicly by default. If the platform includes phone details, you can control their visibility through privacy settings.</p>', 'Privacy & Safety', '["phone number","privacy","visibility"]', '["see phone number","phone privacy"]', 1, 1),
('can-i-hide-my-account-privacy', 'Can I hide my account?', '<p>Yes, you can hide your account or limit profile visibility depending on the privacy options available. Use the privacy settings in your profile controls.</p>', 'Privacy & Safety', '["hide account","privacy","visibility"]', '["hide account","privacy settings"]', 1, 1),
('what-information-is-public', 'What information is public?', '<p>Public information typically includes your username, profile name, and posts you publish. Sensitive details like email and phone number are kept private unless you choose to share them.</p>', 'Privacy & Safety', '["public info","privacy","profile"]', '["what information is public","public profile"]', 1, 1),
('feed-not-loading', 'Feed not loading.', '<p>If the feed is not loading, refresh the page or check your internet connection. Clearing your browser cache or restarting the app may also help.</p>', 'Technical Issues', '["feed","loading","bug"]', '["feed not loading","feed issue"]', 1, 1),
('search-not-working', 'Search not working.', '<p>If search is not working, try reloading the page or clearing the search field. Ensure your query is spelled correctly and use simple keywords.</p>', 'Technical Issues', '["search","bug","technical"]', '["search not working","search issue"]', 1, 1),
('login-problems', 'Login problems.', '<p>If you experience login problems, verify your credentials and try using the password reset flow. If the issue continues, contact support with details.</p>', 'Technical Issues', '["login","error","technical"]', '["login problems","sign in issue"]', 1, 1),
('profile-update-failed', 'Profile update failed.', '<p>If your profile update failed, check that all fields are complete and valid. Refresh the page and try again or clear your browser cache.</p>', 'Technical Issues', '["profile","update","bug"]', '["profile update failed","profile issue"]', 1, 1),
('website-loading-slowly', 'Website loading slowly.', '<p>If the website is loading slowly, try using a stable internet connection and close other tabs or apps. The platform is optimized for lightweight performance, but network quality matters.</p>', 'Technical Issues', '["slow","performance","technical"]', '["website loading slowly","slow website"]', 1, 1);







INSERT INTO `cms_pages` (`title`, `slug`, `content`, `seo_title`, `meta_description`, `is_published`, `sort_order`, `updated_by_admin_id`) VALUES
(
    'About Us',
    'about-us',
    '<h1>About ConnectNKT</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <p>ConnectNKT is a hyperlocal social networking platform built exclusively for the people of Neem Ka Thana and its surrounding villages — a digital space where our community connects, shares, and grows together.</p>
    
    <h2>Welcome to ConnectNKT — Your City, Your Community</h2>
    <p>ConnectNKT is a modern, text-based social media platform designed specifically for the residents of Neem Ka Thana. We are more than just a website — we are a digital community hub where citizens, students, business owners, and community leaders come together to share ideas, discuss local issues, and stay informed about everything happening in and around our city.</p>
    
    <p>Unlike traditional social media platforms that focus on photos, videos, and entertainment, ConnectNKT is built around meaningful conversations. We believe that the people of Neem Ka Thana deserve a platform that prioritizes information, awareness, and community engagement over mindless scrolling.</p>
    
    <p>Whether you want to discuss local politics, share important announcements, ask for recommendations, or simply connect with fellow residents — ConnectNKT is the place where your voice matters.</p>
    
    <h2>Our Mission</h2>
    <ul>
        <li><strong>Connect Every Village:</strong> Bridge the gap between Neem Ka Thana city and its surrounding villages through a unified digital platform where every community has a voice.</li>
        <li><strong>Promote Local Awareness:</strong> Encourage responsible sharing of local news, events, and public information that impacts the daily lives of residents across Neem Ka Thana.</li>
        <li><strong>Empower Every Citizen:</strong> Give every resident — from students to senior citizens — a platform to discuss local issues, share ideas, and contribute to the city''s growth.</li>
        <li><strong>Build a Stronger Community:</strong> Foster meaningful connections and strengthen relationships between people through constructive conversations and community-driven initiatives.</li>
    </ul>
    
    <h2>Why ConnectNKT is Different</h2>
    <ul>
        <li><strong>📝 Text-First Social Media:</strong> Only text posts are allowed to keep discussions focused, informative, and meaningful — no distractions from photos or videos.</li>
        <li><strong>🏘️ Exclusively for NKT:</strong> ConnectNKT is built for Neem Ka Thana and its villages — stay connected with people and updates from your own community.</li>
        <li><strong>⚡ Fast & Lightweight:</strong> Designed for quick loading and smooth performance, even on slower internet connections and older devices.</li>
        <li><strong>🔒 Safe & Respectful:</strong> We promote respectful discussions and take content moderation seriously to ensure a safe environment for all users.</li>
        <li><strong>📢 Local News & Info:</strong> Get real-time updates on local events, public announcements, civic issues, and community initiatives.</li>
        <li><strong>🌍 Hyperlocal Focus:</strong> Every post, discussion, and conversation is relevant to Neem Ka Thana — no global noise, only local relevance.</li>
    </ul>
    
    <h2>Who Can Join ConnectNKT?</h2>
    <ul>
        <li><strong>🏛️ Citizens:</strong> Every resident of Neem Ka Thana and surrounding villages can join to stay informed and participate in local discussions.</li>
        <li><strong>🎓 Students:</strong> Students can share ideas, ask questions, and connect with peers from schools and colleges across the city.</li>
        <li><strong>🏪 Business Owners:</strong> Local businesses can share updates, offers, and connect with customers in their own community.</li>
        <li><strong>👥 Community Leaders:</strong> Ward members, social workers, and community organizers can share announcements and engage with residents.</li>
    </ul>
    
    <h2>Our Vision</h2>
    <p>To become the digital town square of Neem Ka Thana — a vibrant, inclusive, and responsible social media platform where citizens, villages, businesses, students, and community leaders can connect, communicate, and collaborate towards building a stronger, more informed, and united community.</p>
    
    <p>We envision a future where every resident of Neem Ka Thana feels connected, heard, and empowered to contribute to the growth and well-being of their city — one conversation at a time.</p>
    
    <h2>Be a Part of the Community</h2>
    <p>Ready to join the community? <a href="/register">Create your account</a> today and start connecting with the people of Neem Ka Thana.</p>
    
    <h2>Contact Us</h2>
    <p>For any questions or concerns, please email us at <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>',
    'About ConnectNKT - Neem Ka Thana''s Social Media Platform',
    'ConnectNKT is a hyperlocal social media platform for Neem Ka Thana. Connect with your community, share local news, and stay informed about your city.',
    1, 1, 1
),
(
    'Privacy Policy',
    'privacy-policy',
    '<h1>Privacy Policy</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <h2>1. Information We Collect</h2>
    
    <h3>1.1 Personal Information You Provide</h3>
    <ul>
        <li>Name, username, email address, mobile number</li>
        <li>Profile information (profile picture, bio, date of birth, gender)</li>
        <li>Father''s name and village information</li>
        <li>Login credentials and password</li>
    </ul>
    
    <h3>1.2 Content Information</h3>
    <ul>
        <li>Posts, comments, and reactions you create</li>
        <li>People you follow and who follow you</li>
        <li>Interaction history and engagement</li>
    </ul>
    
    <h3>1.3 Usage Information</h3>
    <ul>
        <li>How you interact with the platform</li>
        <li>Pages and features you use</li>
        <li>Time and frequency of visits</li>
        <li>Device and browser information</li>
        <li>IP address and location data</li>
    </ul>
    
    <h2>2. How We Use Your Information</h2>
    <ul>
        <li>To provide and maintain our services</li>
        <li>To personalize your experience</li>
        <li>To send notifications about updates and activities</li>
        <li>To moderate content and ensure platform safety</li>
        <li>To comply with legal obligations</li>
        <li>To improve our platform and services</li>
        <li>To process blue tick verification requests</li>
    </ul>
    
    <h2>3. Data Sharing</h2>
    <p>ConnectNKT does not sell your personal data to third parties. We may share data only:</p>
    <ul>
        <li>With your explicit consent</li>
        <li>To comply with legal requirements</li>
        <li>To protect the rights and safety of users</li>
        <li>With service providers who assist us (under confidentiality agreements)</li>
    </ul>
    
    <h2>4. Data Security</h2>
    <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>
    
    <h2>5. Your Rights</h2>
    <ul>
        <li>Access and update your personal information</li>
        <li>Request deletion of your account</li>
        <li>Opt-out of marketing communications</li>
        <li>Withdraw consent at any time</li>
        <li>Request a copy of your data</li>
    </ul>
    
    <h2>6. Cookies</h2>
    <p>We use cookies to improve your experience, remember preferences, and analyze site traffic. You can control cookie preferences in your browser settings.</p>
    
    <h2>7. Children''s Privacy</h2>
    <p>ConnectNKT is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
    
    <h2>8. Data Retention</h2>
    <p>We retain your data for as long as your account is active. When you delete your account, we securely remove your personal information within 30 days, except where retention is required by law.</p>
    
    <h2>9. Changes to Policy</h2>
    <p>We may update this privacy policy from time to time. Users will be notified of significant changes via email or platform notification.</p>
    
    <h2>10. Contact Us</h2>
    <p>For privacy-related questions, please email us at <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>',
    'Privacy Policy - ConnectNKT',
    'Read ConnectNKT''s privacy policy to understand how we collect, use, and protect your personal information.',
    1, 2, 1
),
(
    'Terms & Conditions',
    'terms-conditions',
    '<h1>Terms & Conditions</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <h2>1. Acceptance of Terms</h2>
    <p>By creating an account or using ConnectNKT, you agree to these Terms & Conditions. If you don''t agree, please don''t use our platform.</p>
    
    <h2>2. Eligibility</h2>
    <p>You must:</p>
    <ul>
        <li>Be at least 13 years old</li>
        <li>Have legal capacity to form a binding contract</li>
        <li>Not be previously banned or suspended</li>
        <li>Provide accurate, complete registration information</li>
    </ul>
    
    <h2>3. Account Registration</h2>
    <h3>3.1 Account Creation</h3>
    <ul>
        <li>You need one account per person</li>
        <li>Use your real name</li>
        <li>Provide valid email or phone number</li>
        <li>Choose a secure password</li>
        <li>Username must be unique and cannot contain spaces</li>
    </ul>
    
    <h3>3.2 Account Security</h3>
    <ul>
        <li>Keep your login credentials confidential</li>
        <li>Don''t share accounts</li>
        <li>Enable Two-Factor Authentication when available</li>
        <li>Report unauthorized access immediately</li>
    </ul>
    
    <h2>4. User Content</h2>
    <h3>4.1 Ownership</h3>
    <p>You retain ownership of content you create and post.</p>
    
    <h3>4.2 License to Us</h3>
    <p>You grant us a worldwide, non-exclusive, royalty-free license to display, distribute, and promote your content on the platform.</p>
    
    <h3>4.3 Content Responsibilities</h3>
    <p>You''re responsible for ensuring content complies with our Community Guidelines.</p>
    
    <h2>5. Prohibited Activities</h2>
    <ul>
        <li>Hate speech, harassment, threats</li>
        <li>Illegal content or activities</li>
        <li>Nudity, pornography, sexually explicit content</li>
        <li>Misinformation and disinformation</li>
        <li>Impersonation of others</li>
        <li>Spam, scams, phishing</li>
        <li>Using automated systems without permission</li>
    </ul>
    
    <h2>6. Termination</h2>
    <ul>
        <li>Users may delete their account anytime</li>
        <li>We may suspend/terminate for Terms violations</li>
        <li>Illegal activities or extended inactivity</li>
    </ul>
    
    <h2>7. Governing Law</h2>
    <p>These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Rajasthan.</p>
    
    <h2>8. Changes to Terms</h2>
    <p>We may update these terms from time to time. Users will be notified of significant changes.</p>
    
    <h2>9. Contact Us</h2>
    <p>For questions about these terms, please email us at <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>',
    'Terms & Conditions - ConnectNKT',
    'Read the Terms & Conditions for ConnectNKT. Learn about user responsibilities, community guidelines, and platform rules.',
    1, 3, 1
),
(
    'Community Guidelines',
    'community-guidelines',
    '<h1>Community Guidelines</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    <p>ConnectNKT is a platform for constructive community discussions. All users must follow these guidelines to ensure a safe, respectful, and welcoming environment for everyone.</p>
    
    <h2>✅ DO''s</h2>
    <ul>
        <li><strong>Share Relevant Information:</strong> Post content related to Neem Ka Thana and its communities.</li>
        <li><strong>Engage Respectfully:</strong> Participate in discussions with respect and open-mindedness.</li>
        <li><strong>Support Local:</strong> Promote local businesses, events, and community initiatives.</li>
        <li><strong>Report Violations:</strong> Help us maintain a safe space by reporting content that violates guidelines.</li>
        <li><strong>Be Authentic:</strong> Use your real identity and provide accurate information.</li>
        <li><strong>Build Community:</strong> Contribute positively and help make the community stronger.</li>
    </ul>
    
    <h2>❌ DON''Ts</h2>
    <ul>
        <li><strong>No Hate Speech:</strong> Content that promotes hatred, discrimination, or violence against any group is strictly prohibited.</li>
        <li><strong>No Harassment:</strong> Bullying, intimidation, threats, or personal attacks are not allowed.</li>
        <li><strong>No Misinformation:</strong> Sharing false, misleading, or unverified information is prohibited.</li>
        <li><strong>No Spam:</strong> Repeated, irrelevant, or promotional content without context is not allowed.</li>
        <li><strong>No Impersonation:</strong> Pretending to be someone else or using fake identities is prohibited.</li>
        <li><strong>No Privacy Violations:</strong> Sharing others'' personal information without consent is not allowed.</li>
        <li><strong>No Illegal Content:</strong> Content promoting illegal activities is strictly forbidden.</li>
        <li><strong>No Explicit Content:</strong> NSFW content is prohibited.</li>
        <li><strong>No Violence or Threats:</strong> Threatening, intimidating, or inciting violence against any person is prohibited.</li>
        <li><strong>No Spam or Fake Accounts:</strong> Creating fake accounts or spamming is prohibited.</li>
    </ul>
    
    <h2>Content Moderation</h2>
    <h3>Consequences of Violation:</h3>
    <ul>
        <li><strong>First Violation:</strong> Warning and content removal</li>
        <li><strong>Second Violation:</strong> Temporary suspension (1-7 days)</li>
        <li><strong>Third Violation:</strong> Extended suspension (7-30 days)</li>
        <li><strong>Repeated/Severe Violations:</strong> Permanent account termination</li>
        <li><strong>Legal Consequences:</strong> Legal action in severe cases</li>
    </ul>
    
    <h2>Appeals Process</h2>
    <p>If you believe your content was removed or your account was suspended in error, you can submit your appeal through the <a href="/pages/appeal-account">Appeal Account</a> page. Our team will review your case within 3-5 business days.</p>
    
    <h2>Reporting Process</h2>
    <p>To report content or users that violate these guidelines, click the "..." menu on the post/comment/user, select "Report", choose the reason, and submit. Reports are confidential.</p>
    
    <h2>Contact Us</h2>
    <p>For questions about these guidelines, please email us at <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>',
    'Community Guidelines - ConnectNKT',
    'Read ConnectNKT''s community guidelines. Learn about our rules for respectful discussions and safe community interactions.',
    1, 4, 1
),
(
    'Disclaimer',
    'disclaimer',
    '<h1>Disclaimer</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <h2>General Disclaimer</h2>
    
    <h3>1. "As Is" Provision</h3>
    <p>ConnectNKT is provided "AS IS" and "AS AVAILABLE" without express or implied warranties. We do not guarantee uninterrupted service, accuracy, or completeness.</p>
    
    <h3>2. No Responsibility For:</h3>
    <ul>
        <li>User-generated content accuracy</li>
        <li>Third-party content or links</li>
        <li>Decision-making based on platform content</li>
        <li>Device compatibility or performance</li>
    </ul>
    
    <h3>3. User Content Disclaimer</h3>
    <ul>
        <li>Users are responsible for their content</li>
        <li>We don''t verify accuracy</li>
        <li>Information may be incorrect or outdated</li>
        <li>Opinions reflect user views, not endorsed by platform</li>
    </ul>
    
    <h3>4. Third-Party Services</h3>
    <ul>
        <li>Platform contains third-party links</li>
        <li>Not responsible for external content</li>
        <li>Use at your own risk</li>
    </ul>
    
    <h3>5. Medical/Professional Disclaimer</h3>
    <p>No content constitutes professional advice. Not medical, legal, or financial advice. Consult qualified professionals. Use information at your own risk.</p>
    
    <h2>Limitation of Liability</h2>
    <h3>Maximum Liability</h3>
    <p>Not exceeding the amount paid to us (if any). No liability for indirect or consequential damages.</p>
    
    <h3>Specific Limitations</h3>
    <p>No liability for lost profits, data loss, business interruption, reputation damage, or mental distress.</p>
    
    <h2>Indemnification</h2>
    <p>You agree to indemnify and hold harmless ConnectNKT from claims arising from your content, platform use, Terms violations, or third-party claims.</p>
    
    <h2>Governing Law</h2>
    <p>This disclaimer is governed by the laws of India. Disputes subject to jurisdiction of courts in Rajasthan.</p>
    
    <h2>Contact Us</h2>
    <p>For questions about this disclaimer, please email us at <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>',
    'Disclaimer - ConnectNKT',
    'Read ConnectNKT''s disclaimer about platform usage, liability limitations, and user responsibilities.',
    1, 5, 1
),
(
    'Copyright Policy',
    'copyright-policy',
    '<h1>Copyright Policy</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <h2>1. Overview</h2>
    <p>ConnectNKT respects intellectual property rights. This policy explains how copyright claims are handled.</p>
    
    <h2>2. Copyright Ownership</h2>
    <h3>2.1 User Content</h3>
    <ul>
        <li>You own the content you create</li>
        <li>You grant us a license to use it</li>
        <li>You must have rights to content you post</li>
    </ul>
    
    <h3>2.2 Platform Content</h3>
    <ul>
        <li>Our content, logo, design are our property</li>
        <li>Don''t use without permission</li>
    </ul>
    
    <h2>3. Copyright Infringement Reporting</h2>
    
    <h3>3.1 Requirements for Notice</h3>
    <p>To submit a claim, provide:</p>
    <ul>
        <li>Your contact information (name, address, email)</li>
        <li>Identification of copyrighted work</li>
        <li>Identification of infringing material (URL)</li>
        <li>Statement of good faith belief</li>
        <li>Statement under penalty of perjury</li>
        <li>Electronic or physical signature</li>
    </ul>
    
    <h3>3.2 Submission</h3>
    <p>Email: <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>
    
    <h3>3.3 Review Process</h3>
    <ul>
        <li>Receive notice</li>
        <li>Verify validity</li>
        <li>Remove or restrict access (if valid)</li>
        <li>Notify content creator</li>
        <li>Process counter-notification if received</li>
    </ul>
    
    <h2>4. Counter-Notification</h2>
    <p>If your content was removed wrongly, you can respond with your contact information, identification of removed material, statement of good faith belief, consent to jurisdiction, and your signature.</p>
    
    <h2>5. Repeat Infringers</h2>
    <ul>
        <li>Track copyright claims</li>
        <li>Users with multiple violations</li>
        <li>Account termination for repeat infringers</li>
    </ul>
    
    <h2>6. Legal Consequences</h2>
    <p>Knowingly misrepresenting may result in legal liability, account action, and criminal penalties in some cases.</p>
    
    <h2>7. DMCA Compliance</h2>
    <p>We comply with DMCA. Designated agent: <strong>DMCA Agent</strong>, Email: <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>
    
    <h2>8. Contact Us</h2>
    <p><strong>Copyright Agent:</strong> <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>',
    'Copyright Policy - ConnectNKT',
    'Read ConnectNKT''s copyright policy. Learn about copyright ownership, reporting infringement, and DMCA compliance.',
    1, 6, 1
),
(
    'Child Safety Policy',
    'child-safety-policy',
    '<h1>Child Safety Policy</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <h2>Our Commitment</h2>
    <p>ConnectNKT is committed to creating a safe environment for minors. We have zero tolerance for child exploitation, abuse, or endangerment.</p>
    
    <h2>1. Age Requirements</h2>
    <h3>1.1 Minimum Age</h3>
    <ul>
        <li>Users must be at least 13 years old</li>
        <li>Some regions: 16 years old (with parental consent)</li>
        <li>Verify age during registration</li>
    </ul>
    
    <h3>1.2 Age Verification</h3>
    <ul>
        <li>We may request age verification</li>
        <li>Parental consent required for minors in some regions</li>
        <li>Inaccurate age claims may result in suspension</li>
    </ul>
    
    <h2>2. Prohibited Content & Activities</h2>
    <h3>2.1 Strictly Prohibited</h3>
    <ul>
        <li>Child sexual abuse material (CSAM)</li>
        <li>Grooming or inappropriate contact with minors</li>
        <li>Solicitation of minors</li>
        <li>Sharing minors'' private information without consent</li>
        <li>Promoting self-harm or eating disorders</li>
        <li>Abusive content targeting minors</li>
    </ul>
    
    <h3>2.2 Content Restrictions for Minors</h3>
    <ul>
        <li>Restricted content (violence, mature themes)</li>
        <li>Age-gating for sensitive material</li>
        <li>No direct messaging from unknown adults</li>
    </ul>
    
    <h2>3. Detection & Prevention</h2>
    <h3>3.1 Technical Measures</h3>
    <ul>
        <li>Automated detection of CSAM</li>
        <li>Age verification systems</li>
        <li>Moderation algorithms</li>
        <li>Reporting mechanisms</li>
    </ul>
    
    <h3>3.2 Human Review</h3>
    <ul>
        <li>Dedicated child safety team</li>
        <li>Priority review of child safety reports</li>
        <li>Train moderators</li>
    </ul>
    
    <h2>4. Reporting</h2>
    <h3>4.1 How to Report</h3>
    <ul>
        <li>Report through platform tools</li>
        <li>Email: <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></li>
        <li>Emergency: Contact local law enforcement</li>
    </ul>
    
    <h3>4.2 Our Response</h3>
    <ul>
        <li>Immediate investigation</li>
        <li>Content removal</li>
        <li>Account suspension/permanent ban</li>
        <li>Law enforcement referral when necessary</li>
    </ul>
    
    <h2>5. Parental Controls</h2>
    <h3>5.1 Features</h3>
    <ul>
        <li>Privacy settings for minor accounts</li>
        <li>Content filters</li>
        <li>Time management tools</li>
        <li>Activity monitoring</li>
    </ul>
    
    <h2>6. Resources</h2>
    <ul>
        <li>Online safety tips</li>
        <li>Recognizing grooming</li>
        <li>Privacy awareness</li>
        <li>Reporting procedures</li>
    </ul>
    
    <h2>7. Compliance</h2>
    <p>We comply with COPPA, KOSA, GDPR child provisions, and regional child protection laws.</p>
    
    <h2>8. Contact Us</h2>
    <p><strong>Child Safety Team:</strong> <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>',
    'Child Safety Policy - ConnectNKT',
    'Read ConnectNKT''s child safety policy. Learn about age requirements, prohibited content, and how we protect minors.',
    1, 7, 1
),
(
    'Grievance Redressal',
    'grievance-redressal',
    '<h1>Grievance Redressal Policy</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <h2>1. Introduction</h2>
    <p>ConnectNKT is committed to resolving user concerns. This policy outlines how grievances are handled in compliance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.</p>
    
    <h2>2. Scope</h2>
    <p>This policy covers complaints about content moderation, account actions, privacy concerns, Terms violations, platform issues, and user interactions.</p>
    
    <h2>3. Grievance Officer</h2>
    <p>We have a designated Grievance Officer as required by law.</p>
    <ul>
        <li><strong>Name:</strong> Grievance Officer</li>
        <li><strong>Email:</strong> <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></li>
        <li><strong>Phone:</strong> [Phone Number]</li>
        <li><strong>Address:</strong> [Company Address]</li>
    </ul>
    
    <h2>4. Submission Process</h2>
    <h3>4.1 How to Submit</h3>
    <ul>
        <li>Online Form: Grievance Submission Form</li>
        <li>Email: <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></li>
        <li>Post: Grievance Officer, [Address]</li>
    </ul>
    
    <h3>4.2 Information Required</h3>
    <ul>
        <li>Your name and contact info</li>
        <li>Nature of grievance</li>
        <li>Relevant details</li>
        <li>Supporting evidence</li>
        <li>Desired resolution</li>
        <li>Account information</li>
    </ul>
    
    <h3>4.3 Timeline</h3>
    <ul>
        <li>Acknowledgment: Within 24 hours</li>
        <li>Preliminary response: Within 7 days</li>
        <li>Resolution: Within 15 days (complex cases: 30 days)</li>
    </ul>
    
    <h2>5. Grievance Categories</h2>
    <h3>5.1 Content Issues</h3>
    <ul>
        <li>Content removal/appeal</li>
        <li>Copyright claims</li>
        <li>Reporting inaccuracies</li>
        <li>Inappropriate content</li>
    </ul>
    
    <h3>5.2 Account Issues</h3>
    <ul>
        <li>Suspension/appeal</li>
        <li>Verification status</li>
        <li>Data access/portability</li>
        <li>Account deletion</li>
    </ul>
    
    <h3>5.3 Privacy Concerns</h3>
    <ul>
        <li>Data access/erasure</li>
        <li>Privacy violations</li>
        <li>Data breach concerns</li>
        <li>Consent issues</li>
    </ul>
    
    <h2>6. Resolution Process</h2>
    <ul>
        <li>Acknowledgment and case ID assigned</li>
        <li>Investigation of evidence</li>
        <li>Decision communicated with reasoning</li>
        <li>Implementation and monitoring</li>
    </ul>
    
    <h2>7. Escalation</h2>
    <p>If unsatisfied with the resolution, you can:</p>
    <ul>
        <li>Request review (supervisor)</li>
        <li>Escalate to Grievance Officer</li>
        <li>Appeal to higher authority</li>
        <li>Contact regulatory bodies</li>
        <li>Seek legal action (as last resort)</li>
    </ul>
    
    <h2>8. Confidentiality</h2>
    <p>Grievances are handled confidentially. Only relevant parties are involved. Information is protected and privacy is respected.</p>
    
    <h2>9. Record Keeping</h2>
    <p>All grievances are recorded, actions documented, compliance verified, and data retained for 5+ years.</p>
    
    <h2>10. Compliance</h2>
    <p>We comply with IT Rules, GDPR (EU users), CCPA (CA users), and other relevant regulations.</p>
    
    <h2>11. Contact Us</h2>
    <p><strong>Grievance Officer</strong><br>
    Email: <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a><br>
    Phone: [Phone Number]<br>
    Address: [Company Address]</p>',
    'Grievance Redressal - ConnectNKT',
    'Read ConnectNKT''s grievance redressal policy. Learn how to submit complaints and the resolution process.',
    1, 8, 1
),
(
    'Appeal Account',
    'appeal-account',
    '<h1>Appeal Account Policy</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <h2>1. Introduction</h2>
    <p>You have the right to appeal account actions. This policy explains the process when your account is suspended for violating our Privacy Policy, Platform Rules, or Community Guidelines.</p>
    
    <h2>2. When Can You Appeal?</h2>
    <p>Your account may be suspended if you violate:</p>
    <ul>
        <li><strong>Privacy Policy:</strong> Sharing others'' private information, violating data protection rules</li>
        <li><strong>Platform Rules:</strong> Any of the 20 community rules including hate speech, harassment, misinformation, impersonation, etc.</li>
        <li><strong>Community Guidelines:</strong> Posting prohibited content or engaging in prohibited activities</li>
    </ul>
    
    <h2>3. What You Can Appeal</h2>
    <h3>3.1 Account Actions</h3>
    <ul>
        <li>Temporary suspension</li>
        <li>Permanent ban</li>
        <li>Account restrictions</li>
        <li>Feature limitations</li>
        <li>Verification denial or revocation</li>
    </ul>
    
    <h3>3.2 Content Actions</h3>
    <ul>
        <li>Content removal</li>
        <li>Visibility restrictions</li>
        <li>Content deletion</li>
    </ul>
    
    <h2>4. Grounds for Appeal</h2>
    <h3>4.1 Acceptable Grounds</h3>
    <ul>
        <li>Mistaken identity</li>
        <li>Inaccurate information</li>
        <li>Policy misinterpretation</li>
        <li>New evidence or context</li>
        <li>Procedural error</li>
        <li>Erroneous automated action</li>
        <li>False reporting by other users</li>
    </ul>
    
    <h3>4.2 Not Acceptable Grounds</h3>
    <ul>
        <li>Policy disagreement alone</li>
        <li>Technical issues (use support)</li>
        <li>Admission of violation</li>
    </ul>
    
    <h2>5. Appeal Process</h2>
    <h3>5.1 Submission</h3>
    <ol>
        <li>Go to Settings → Account → Appeal</li>
        <li>Fill the online appeal form</li>
        <li>Or email: <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></li>
    </ol>
    
    <h3>5.2 Required Information</h3>
    <ul>
        <li>Full name and contact details</li>
        <li>Account username/email</li>
        <li>Action being appealed (suspension/ban)</li>
        <li>Appeal grounds (why you think it was wrong)</li>
        <li>Supporting evidence (screenshots, explanations)</li>
        <li>Desired outcome</li>
    </ul>
    
    <h3>5.3 Deadline</h3>
    <p>Submit within 30 days of the action. Extensions may be granted for valid reasons.</p>
    
    <h2>6. Review Process</h2>
    <h3>6.1 Acknowledgment</h3>
    <ul>
        <li>Received confirmation</li>
        <li>Reference number provided</li>
        <li>Timeline communicated</li>
    </ul>
    
    <h3>6.2 Investigation</h3>
    <ul>
        <li>Evidence reviewed</li>
        <li>Policies applied</li>
        <li>All sides considered</li>
        <li>Fair assessment</li>
    </ul>
    
    <h3>6.3 Timeline</h3>
    <ul>
        <li><strong>Simple cases:</strong> 5 business days</li>
        <li><strong>Complex cases:</strong> 15 business days</li>
        <li><strong>Emergency cases:</strong> 24-48 hours</li>
    </ul>
    
    <h2>7. Outcomes</h2>
    <h3>7.1 Appeal Approved</h3>
    <ul>
        <li>Action reversed</li>
        <li>Account restored</li>
        <li>Content reinstated</li>
        <li>Explanation provided</li>
        <li>Warning may still apply</li>
    </ul>
    
    <h3>7.2 Appeal Denied</h3>
    <ul>
        <li>Explanation provided</li>
        <li>Alternative remedies suggested</li>
        <li>Escalation options</li>
        <li>Learn from experience</li>
    </ul>
    
    <h3>7.3 Partial Success</h3>
    <ul>
        <li>Some relief provided</li>
        <li>Compromise reached</li>
        <li>Future considerations</li>
    </ul>
    
    <h2>8. Escalation</h2>
    <p>If you''re unsatisfied with the decision:</p>
    <ul>
        <li>Request reconsideration with new evidence</li>
        <li>Escalate to Grievance Officer</li>
        <li>Contact regulatory bodies</li>
        <li>Legal recourse (if applicable)</li>
    </ul>
    
    <h2>9. Confidentiality</h2>
    <p>Appeals are handled confidentially. Only involved parties have access. Information is protected.</p>
    
    <h2>10. Prevention Tips</h2>
    <ul>
        <li>Read and understand all rules before posting</li>
        <li>Think before sharing content</li>
        <li>Respect others'' privacy</li>
        <li>Report issues through proper channels</li>
        <li>Keep your account information accurate</li>
    </ul>
    
    <h2>11. Contact Us</h2>
    <p><strong>Appeals Team:</strong> <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>',
    'Appeal Account - ConnectNKT',
    'Learn how to appeal account suspension or content removal on ConnectNKT. Understand the appeal process and your rights.',
    1, 9, 1
),
(
    'Blue Tick Rules',
    'blue-tick-rules',
    '<h1>Blue Tick Rules</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <h2>1. Introduction</h2>
    <p>Blue Tick verification shows authenticity, trustworthiness, and notability within the ConnectNKT community. A Blue Tick badge helps users identify genuine and influential community members.</p>
    
    <h2>2. Who Can Get Blue Tick?</h2>
    <p>ConnectNKT awards Blue Ticks to:</p>
    <ul>
        <li><strong>Public Figures:</strong> Politicians, elected representatives, government officials, community leaders</li>
        <li><strong>Local Personalities:</strong> Well-known residents, social workers, educators, healthcare professionals</li>
        <li><strong>Businesses:</strong> Registered local businesses, brands, organizations</li>
        <li><strong>Content Creators:</strong> Journalists, writers, artists, influencers</li>
        <li><strong>Professionals:</strong> Doctors, lawyers, engineers, entrepreneurs</li>
        <li><strong>Community Contributors:</strong> Active members who positively contribute to the community</li>
    </ul>
    
    <h2>3. Eligibility Criteria</h2>
    
    <h3>3.1 General Requirements</h3>
    <ul>
        <li><strong>Authentic:</strong> Real identity or legitimate brand</li>
        <li><strong>Notable:</strong> Known within Neem Ka Thana community</li>
        <li><strong>Active:</strong> Regular engagement on the platform</li>
        <li><strong>Complete:</strong> Full profile with accurate information</li>
        <li><strong>Compliant:</strong> No history of policy violations</li>
        <li><strong>Positive Contributor:</strong> Adds value to the community</li>
    </ul>
    
    <h3>3.2 Standard Requirements</h3>
    <ul>
        <li>Minimum 500 followers (for self-request)</li>
        <li>Account must be at least 30 days old</li>
        <li>No previous account suspensions</li>
        <li>No violations of Community Guidelines</li>
        <li>Active engagement in the last 30 days</li>
        <li>Complete profile information (bio, image, etc.)</li>
    </ul>
    
    <h3>3.3 Discretionary Approval</h3>
    <p>ConnectNKT reserves the right to award Blue Tick to any user at its sole discretion, regardless of follower count. The team may proactively verify:</p>
    <ul>
        <li>Popular public figures and politicians</li>
        <li>Well-known business owners and entrepreneurs</li>
        <li>Community leaders and social workers</li>
        <li>Journalists and media personalities</li>
        <li>Government officials and representatives</li>
        <li>Any person who is notable and authentic in the community</li>
    </ul>
    <p><strong>Note:</strong> For discretionary approvals, the 500-follower requirement does not apply. The ConnectNKT team''s decision is final and based on notability and authenticity.</p>
    
    <h2>4. Request Process</h2>
    
    <h3>4.1 How to Apply</h3>
    <ol>
        <li>Ensure you have at least 500 followers</li>
        <li>Go to Settings → Blue Tick → Apply</li>
        <li>Fill the application form</li>
        <li>Provide supporting documents</li>
        <li>Submit for review</li>
    </ol>
    
    <h3>4.2 Required Information</h3>
    <ul>
        <li>Full name</li>
        <li>Account username</li>
        <li>Description of who you are</li>
        <li>Proof of identity (government ID)</li>
        <li>Why you deserve verification</li>
        <li>Links to your public presence</li>
        <li>Contributions to the community</li>
    </ul>
    
    <h3>4.3 Timeline</h3>
    <ul>
        <li>Application acknowledgment: 24 hours</li>
        <li>Review process: 2-4 weeks</li>
        <li>Decision notification via email</li>
        <li>Appeal if denied</li>
    </ul>
    
    <h2>5. Review Process</h2>
    <h3>5.1 Assessment</h3>
    <ul>
        <li>Identity verification</li>
        <li>Notability assessment</li>
        <li>Activity evaluation</li>
        <li>Policy compliance check</li>
        <li>Community impact review</li>
        <li>Follower authenticity check</li>
    </ul>
    
    <h3>5.2 Decision Factors</h3>
    <ul>
        <li>Document authenticity</li>
        <li>Public presence and recognition</li>
        <li>Engagement metrics</li>
        <li>Content quality</li>
        <li>Platform relevance</li>
        <li>Community contributions</li>
    </ul>
    
    <h3>5.3 Outcomes</h3>
    <ul>
        <li><strong>Approved:</strong> Blue Tick awarded</li>
        <li><strong>Pending:</strong> More information needed</li>
        <li><strong>Denied:</strong> Explanation provided</li>
        <li><strong>Revoked:</strong> If criteria no longer met</li>
    </ul>
    
    <h2>6. Benefits of Blue Tick</h2>
    <ul>
        <li>✅ Verification badge on profile</li>
        <li>✅ Enhanced visibility and trust</li>
        <li>✅ Early access to new features</li>
        <li>✅ Priority support</li>
        <li>✅ Increased credibility</li>
        <li>✅ Recognition as a notable community member</li>
    </ul>
    
    <h2>7. Maintaining Blue Tick</h2>
    <h3>7.1 Requirements</h3>
    <ul>
        <li>Stay active on the platform</li>
        <li>Follow all Community Guidelines</li>
        <li>Maintain notability</li>
        <li>Keep profile information updated</li>
        <li>No policy violations</li>
        <li>Positive community engagement</li>
    </ul>
    
    <h3>7.2 Periodic Reviews</h3>
    <ul>
        <li>Monthly activity checks</li>
        <li>Quarterly compliance reviews</li>
        <li>Annual reassessment</li>
        <li>Content quality monitoring</li>
    </ul>
    
    <h2>8. Revocation</h2>
    <h3>8.1 Grounds for Revocation</h3>
    <ul>
        <li>Policy violations</li>
        <li>Misrepresentation</li>
        <li>Inactivity (6+ months)</li>
        <li>Loss of notability</li>
        <li>Fraud or deception</li>
        <li>Business closure</li>
        <li>Fake followers or engagement</li>
        <li>Harassment or bullying</li>
    </ul>
    
    <h3>8.2 Process</h3>
    <ul>
        <li>Investigation</li>
        <li>Notification to user</li>
        <li>Reason provided</li>
        <li>Appeal option available</li>
        <li>Removal of badge</li>
    </ul>
    
    <h2>9. Appeals</h2>
    <p>If your request is denied or your Blue Tick is revoked:</p>
    <ol>
        <li>Submit an appeal within 30 days</li>
        <li>Provide new evidence or explanation</li>
        <li>Our team will review within 2 weeks</li>
        <li>Final decision communicated</li>
    </ol>
    
    <h2>10. Privacy</h2>
    <ul>
        <li>Verification status is public</li>
        <li>Documents are kept confidential</li>
        <li>Used only for verification purposes</li>
        <li>Secure storage and access control</li>
        <li>Data protection compliance</li>
    </ul>
    
    <h2>11. Contact Us</h2>
    <p><strong>Verification Team:</strong> <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>',
    'Blue Tick Rules - ConnectNKT',
    'Learn about ConnectNKT''s Blue Tick verification. Understand eligibility, application process, and how to get verified.',
    1, 10, 1
),
(
    'Platform Rules',
    'platform-rules',
    '<h1>ConnectNKT Platform Rules</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <div class="platform-rules-intro">
        <h2>🌟 Neem Ka Thana की अपनी डिजिटल कम्युनिटी – सुरक्षित, सम्मानजनक और सकारात्मक।</h2>
        <p>ConnectNKT is a platform for constructive community discussions. All users must follow these rules to ensure a safe, respectful, and welcoming environment for everyone.</p>
    </div>
    
    <div class="rule-list">
        <h2>📋 20 Platform Rules</h2>
        
        <div class="rule-item">
            <h3>1. सभी का सम्मान करें (Respect Everyone)</h3>
            <p>किसी भी व्यक्ति के लिए गाली-गलौज, अपमानजनक या अशोभनीय भाषा का प्रयोग न करें।<br>
            <em>Do not use abusive, disrespectful, or obscene language against any person.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>2. झूठी रिपोर्ट न करें (No False Reporting)</h3>
            <p>बिना किसी उचित कारण के किसी पोस्ट, प्रोफ़ाइल या बिज़नेस को रिपोर्ट करना नियमों का उल्लंघन है।<br>
            <em>Reporting posts, profiles, or businesses without valid reason violates platform rules.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>3. बच्चों की सुरक्षा (Child Safety)</h3>
            <p>18 वर्ष से कम आयु के बच्चों से संबंधित किसी भी प्रकार का आपत्तिजनक, शोषणकारी या अनुचित कंटेंट पूरी तरह प्रतिबंधित है।<br>
            <em>Any offensive, exploitative, or inappropriate content related to children under 18 is strictly prohibited.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>4. महिलाओं का सम्मान (Respect Women)</h3>
            <p>महिलाओं के खिलाफ अभद्र, अश्लील, धमकीपूर्ण या अपमानजनक पोस्ट, फोटो, वीडियो या टिप्पणी की अनुमति नहीं है।<br>
            <em>Indecent, obscene, threatening, or disrespectful posts, photos, videos, or comments against women are not permitted.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>5. सही आयु बताएं (Provide Correct Age)</h3>
            <p>यदि आपकी आयु 18 वर्ष से कम है और आपने गलत जानकारी देकर अकाउंट बनाया है, तो सत्यापन होने पर आपका अकाउंट निलंबित या हटाया जा सकता है।<br>
            <em>If you are under 18 and create an account with false information, your account may be suspended or removed upon verification.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>6. जाति, धर्म और समुदाय का सम्मान करें (Respect All Communities)</h3>
            <p>किसी भी जाति, धर्म, समुदाय या समूह के खिलाफ नफरत फैलाने वाले या अपमानजनक शब्दों का उपयोग न करें।<br>
            <em>Do not use hateful or disrespectful words against any caste, religion, community, or group.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>7. फर्जी जानकारी न फैलाएं (No Misinformation)</h3>
            <p>जानबूझकर झूठी खबर, अफवाह या भ्रामक जानकारी साझा न करें।<br>
            <em>Do not deliberately share false news, rumors, or misleading information.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>8. किसी की पहचान का गलत उपयोग न करें (No Impersonation)</h3>
            <p>किसी अन्य व्यक्ति, संस्था या बिज़नेस का बनकर अकाउंट बनाना या लोगों को भ्रमित करना प्रतिबंधित है।<br>
            <em>Creating an account pretending to be another person, organization, or business, or misleading others is prohibited.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>9. निजी जानकारी साझा न करें (Protect Privacy)</h3>
            <p>बिना अनुमति किसी का मोबाइल नंबर, पता, पहचान पत्र या अन्य निजी जानकारी सार्वजनिक न करें।<br>
            <em>Do not share anyone''s mobile number, address, ID, or other personal information without permission.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>10. हिंसा या धमकी नहीं (No Violence or Threats)</h3>
            <p>किसी भी व्यक्ति को धमकी देना, डराना या हिंसा के लिए उकसाना प्रतिबंधित है।<br>
            <em>Threatening, intimidating, or inciting violence against any person is prohibited.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>11. अवैध गतिविधियों का प्रचार नहीं (No Illegal Activities)</h3>
            <p>किसी भी गैरकानूनी कार्य, धोखाधड़ी या अपराध को बढ़ावा देने वाला कंटेंट अनुमति नहीं है।<br>
            <em>Content promoting any illegal activity, fraud, or crime is not permitted.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>12. स्पैम न करें (No Spam)</h3>
            <p>बार-बार एक जैसी पोस्ट, कमेंट या प्रचार सामग्री साझा करके दूसरों को परेशान न करें।<br>
            <em>Do not harass others by repeatedly sharing identical posts, comments, or promotional content.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>13. केवल सही बिज़नेस जानकारी दें (Accurate Business Info)</h3>
            <p>यदि आप बिज़नेस लिस्टिंग बनाते हैं, तो सभी जानकारी सही और सत्य होनी चाहिए।<br>
            <em>If you create a business listing, all information must be correct and truthful.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>14. कॉपीराइट का सम्मान करें (Respect Copyright)</h3>
            <p>दूसरों की फोटो, वीडियो, लेख या अन्य सामग्री बिना अनुमति के पोस्ट न करें।<br>
            <em>Do not post others'' photos, videos, articles, or other content without permission.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>15. स्थानीय माहौल खराब न करें (Don''t Harm Local Harmony)</h3>
            <p>ऐसी पोस्ट न करें जिनसे Neem Ka Thana या आसपास के क्षेत्र में तनाव, विवाद या अशांति फैलने की संभावना हो।<br>
            <em>Do not post content that could cause tension, controversy, or unrest in Neem Ka Thana or surrounding areas.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>16. चुनाव और सामाजिक विषयों पर जिम्मेदारी से पोस्ट करें (Responsible Political & Social Posts)</h3>
            <p>अपनी राय रखें, लेकिन किसी व्यक्ति या समूह के प्रति अपमानजनक भाषा या झूठे आरोपों का प्रयोग न करें।<br>
            <em>Share your opinions, but do not use disrespectful language or false accusations against any person or group.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>17. प्लेटफ़ॉर्म का दुरुपयोग न करें (No Platform Abuse)</h3>
            <p>फर्जी लाइक, फर्जी फॉलोअर्स, बॉट या सिस्टम का गलत उपयोग करना प्रतिबंधित है।<br>
            <em>Fake likes, fake followers, bots, or misuse of the system is prohibited.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>18. एडमिन के निर्णय का सम्मान करें (Respect Admin Decisions)</h3>
            <p>यदि कोई पोस्ट या अकाउंट नियमों का उल्लंघन करता है, तो उसे हटाया, सीमित किया या निलंबित किया जा सकता है।<br>
            <em>If a post or account violates rules, it may be removed, restricted, or suspended.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>19. नियमों का उल्लंघन करने पर कार्रवाई (Actions for Violations)</h3>
            <p>उल्लंघन की गंभीरता के अनुसार चेतावनी, पोस्ट हटाना, अकाउंट सस्पेंड करना या स्थायी रूप से बंद करना जैसी कार्रवाई की जा सकती है।<br>
            <em>Depending on the severity of the violation, actions may include warnings, post removal, account suspension, or permanent closure.</em></p>
        </div>
        
        <div class="rule-item">
            <h3>20. हमारी कम्युनिटी को बेहतर बनाएं (Build a Better Community)</h3>
            <p>ConnectNKT का उद्देश्य Neem Ka Thana की सकारात्मक, सुरक्षित और उपयोगी डिजिटल कम्युनिटी बनाना है। कृपया सम्मान, जिम्मेदारी और ईमानदारी के साथ प्लेटफ़ॉर्म का उपयोग करें।<br>
            <em>ConnectNKT aims to build a positive, safe, and useful digital community for Neem Ka Thana. Please use the platform with respect, responsibility, and honesty.</em></p>
        </div>
    </div>
    
    <div class="consequences">
        <h2>⚖️ Consequences of Violation</h2>
        <ul>
            <li><strong>First Violation:</strong> Warning and content removal</li>
            <li><strong>Second Violation:</strong> Temporary suspension (1-7 days)</li>
            <li><strong>Third Violation:</strong> Extended suspension (7-30 days)</li>
            <li><strong>Repeated/Severe Violations:</strong> Permanent account termination</li>
            <li><strong>Legal Consequences:</strong> Legal action in severe cases</li>
        </ul>
    </div>
    
    <div class="appeal-section">
        <h2>📢 Appeal Process</h2>
        <p>If you believe your content was removed or your account was suspended in error, you can:</p>
        <ol>
            <li>Visit the <a href="/pages/appeal-account">Appeal Account</a> page</li>
            <li>Submit your appeal with account details and reason</li>
            <li>Our team will review your case within 3-5 business days</li>
            <li>You will receive a response with the outcome</li>
        </ol>
    </div>
    
    <div class="contact-section">
        <h2>📞 Contact Us</h2>
        <p>If you have any questions about these rules, please email us at <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></p>
    </div>',
    'Platform Rules - ConnectNKT',
    'Read ConnectNKT''s platform rules. Learn about the 20 rules for a safe, respectful, and positive community experience.',
    1, 11, 1
),
(
    'Contact Us',
    'contact-us',
    '<h1>Contact Us</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <h2>Get in Touch</h2>
    <p>Have questions, feedback, or concerns? We''d love to hear from you! ConnectNKT is built for the community, and your input helps us improve and grow.</p>
    
    <h2>Common Inquiries</h2>
    <ul>
        <li><strong>🛠️ Technical Support:</strong> Having trouble with the platform? Let us know.</li>
        <li><strong>🚨 Content Moderation:</strong> Report inappropriate content or policy violations.</li>
        <li><strong>💼 Business/Partnerships:</strong> Interested in collaborating with ConnectNKT? Reach out to us.</li>
        <li><strong>💡 Feedback:</strong> Share your suggestions and ideas to make ConnectNKT better.</li>
        <li><strong>🔒 Privacy Concerns:</strong> For privacy-related questions, contact our privacy team.</li>
        <li><strong>📝 Grievance:</strong> Submit formal complaints through our grievance redressal process.</li>
    </ul>
    
    <p><strong>Response Time:</strong> We aim to respond to all inquiries within 24-48 hours.</p>
    
    <h2>Contact Methods</h2>
    <ul>
        <li><strong>📧 Email:</strong> <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></li>
        <li><strong>📞 Phone:</strong> [Phone Number]</li>
        <li><strong>📍 Address:</strong> [Company Address]</li>
    </ul>
    
    <h2>Grievance Officer</h2>
    <p>For formal complaints and grievances, please contact our Grievance Officer:</p>
    <ul>
        <li><strong>Email:</strong> <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a></li>
        <li><strong>Phone:</strong> [Phone Number]</li>
        <li><strong>Address:</strong> [Company Address]</li>
    </ul>
    
    <h2>Contact Form</h2>
    <p>Please fill out the form below and we''ll get back to you as soon as possible.</p>',
    'Contact Us - ConnectNKT Support',
    'Contact ConnectNKT support. Reach out for technical help, content moderation, business inquiries, or feedback.',
    1, 12, 1
),
(
    'Help Center',
    'help-center',
    '<h1>Help Center</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <p>Welcome to the ConnectNKT Help Center! Find answers to commonly asked questions and learn how to make the most of our platform.</p>
    
    <h2>Popular Topics</h2>
    
    <h3>Getting Started</h3>
    <ul>
        <li>What is ConnectNKT? - ConnectNKT is a hyperlocal social media platform for Neem Ka Thana.</li>
        <li>How do I create an account? - Click Register, fill your details, choose a username, and verify.</li>
        <li>Is ConnectNKT free? - Yes, it''s completely free for all residents.</li>
        <li>Who can use ConnectNKT? - Anyone living in Neem Ka Thana or surrounding villages.</li>
        <li>How do I verify my account? - Complete your profile and follow the verification process.</li>
    </ul>
    
    <h3>Account & Profile</h3>
    <ul>
        <li>How do I upload a profile photo? - Go to Settings → Profile → Upload Photo.</li>
        <li>How do I update profile information? - Go to Settings → Edit Profile.</li>
        <li>Can I delete my account? - Yes, from Settings → Account → Delete Account.</li>
        <li>I forgot my password - Click "Forgot Password" on the login page.</li>
        <li>Why was my account suspended? - Check your email or contact support for details.</li>
    </ul>
    
    <h3>Posts & Content</h3>
    <ul>
        <li>How do I create a post? - Click "Create Post", write your message, select category, and post.</li>
        <li>What is the maximum post limit? - 5 posts per day per user.</li>
        <li>Why was my post removed? - It may have violated our Community Guidelines.</li>
        <li>Why is ConnectNKT text-only? - To keep discussions focused and meaningful.</li>
        <li>What are the categories? - Posts can be categorized under various topics.</li>
    </ul>
    
    <h3>Community & Features</h3>
    <ul>
        <li>What is Blue Tick? - A verification badge for authentic and notable accounts. <a href="/pages/blue-tick-rules">Learn more</a></li>
        <li>How do I get Blue Tick? - Apply through Settings → Blue Tick with 500+ followers.</li>
        <li>How do I follow someone? - Visit their profile and click "Follow".</li>
        <li>What is Agree/Disagree? - Reactions to show your opinion on posts.</li>
        <li>How do comments work? - You can comment on posts and reply to others.</li>
    </ul>
    
    <h3>Privacy & Safety</h3>
    <ul>
        <li>How is my information protected? - We use encryption and secure servers.</li>
        <li>How do I report a post? - Click the "..." menu and select "Report".</li>
        <li>What are the platform rules? - Read our <a href="/pages/platform-rules">Platform Rules</a>.</li>
        <li>How do I appeal a suspension? - Visit the <a href="/pages/appeal-account">Appeal Account</a> page.</li>
    </ul>
    
    <h2>Still Need Help?</h2>
    <p>If you couldn''t find what you''re looking for, don''t worry! Our support team is here to help.</p>
    <p><a href="/pages/contact-us">Contact Us</a> and we''ll get back to you within 24-48 hours.</p>',
    'Help Center - ConnectNKT Support',
    'Find answers to your questions about ConnectNKT. Get help with account setup, posting, privacy, and more.',
    1, 13, 1
),
(
    'FAQ',
    'faq',
    '<h1>Frequently Asked Questions</h1>
    <p><strong>Last Updated: July 26, 2026</strong></p>
    
    <p>Find quick answers to the most commonly asked questions about ConnectNKT.</p>
    
    <h2>General Questions</h2>
    
    <h3>What is ConnectNKT?</h3>
    <p>ConnectNKT is a hyperlocal text-based social community platform built for Neem Ka Thana and surrounding villages. It helps residents share local updates, ask questions, and support each other through meaningful conversations.</p>
    
    <h3>Is ConnectNKT free?</h3>
    <p>Yes, ConnectNKT is completely free to use for all residents. There are no subscription fees or hidden charges.</p>
    
    <h3>Who can use ConnectNKT?</h3>
    <p>Anyone living in Neem Ka Thana or the surrounding villages can use ConnectNKT. The platform is designed for local residents, students, business owners, and community leaders.</p>
    
    <h2>Account Questions</h2>
    
    <h3>How do I create an account?</h3>
    <p>Visit the ConnectNKT website, click on "Register", fill in your details, choose a username, and verify your account.</p>
    
    <h3>How do I reset my password?</h3>
    <p>Click "Forgot Password" on the login page, enter your email, and follow the reset link sent to your inbox.</p>
    
    <h3>Can I delete my account?</h3>
    <p>Yes, you can delete your account from the settings page. This action is permanent and cannot be undone.</p>
    
    <h3>What are the username requirements?</h3>
    <p>Usernames must be unique, contain no spaces, and can only include letters, numbers, underscores (_), and dots (.).</p>
    
    <h2>Posting Questions</h2>
    
    <h3>How do I create a post?</h3>
    <p>Click the "Create Post" button, write your message, select a category, and click "Post" to share with the community.</p>
    
    <h3>Why can I only post 5 times per day?</h3>
    <p>The 5-post daily limit prevents spam and encourages thoughtful participation. It helps keep the feed useful for everyone.</p>
    
    <h3>Why are photos and videos not allowed?</h3>
    <p>ConnectNKT is text-only to keep the platform lightweight, fast, and focused on meaningful conversations.</p>
    
    <h3>What is the word limit for posts?</h3>
    <p>Posts must be 250 words or fewer to ensure concise and readable content.</p>
    
    <h2>Community Questions</h2>
    
    <h3>What is Blue Tick?</h3>
    <p>Blue Tick is a verification badge that shows an account is trusted, authentic, and notable within the community. Read the full <a href="/pages/blue-tick-rules">Blue Tick Rules</a>.</p>
    
    <h3>How do I get Blue Tick?</h3>
    <p>You need at least 500 followers and must apply through Settings → Blue Tick. The team reviews your application and decides based on authenticity and notability.</p>
    
    <h3>How do I report a post?</h3>
    <p>Click the "..." menu on the post, select "Report", choose a reason, and submit your report. Reports are handled confidentially.</p>
    
    <h3>What are the platform rules?</h3>
    <p>Read our complete <a href="/pages/platform-rules">Platform Rules</a> for all 20 community rules and guidelines.</p>
    
    <h2>Appeal Questions</h2>
    
    <h3>My account was suspended. What do I do?</h3>
    <p>Visit the <a href="/pages/appeal-account">Appeal Account</a> page and submit your appeal with details. Our team will review your case within 3-5 business days.</p>
    
    <h3>My post was removed. Can I appeal?</h3>
    <p>Yes, you can submit an appeal through the <a href="/pages/appeal-account">Appeal Account</a> page or contact our support team.</p>
    
    <h2>Legal & Privacy</h2>
    
    <h3>How is my data protected?</h3>
    <p>We use encryption, secure servers, and strict access controls. Read our <a href="/pages/privacy-policy">Privacy Policy</a> for details.</p>
    
    <h3>How do I file a grievance?</h3>
    <p>Use our <a href="/pages/grievance-redressal">Grievance Redressal</a> process or email us at <a href="mailto:connectnkt@gmail.com">connectnkt@gmail.com</a>.</p>
    
    <h2>Still have questions?</h2>
    <p>Visit our <a href="/pages/help-center">Help Center</a> for more articles or <a href="/pages/contact-us">Contact Us</a> for personalized support.</p>',
    'FAQ - ConnectNKT Help',
    'Find answers to frequently asked questions about ConnectNKT. Learn about accounts, posting, community features, and more.',
    1, 14, 1
);























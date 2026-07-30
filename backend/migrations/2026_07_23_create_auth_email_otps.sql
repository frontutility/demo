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

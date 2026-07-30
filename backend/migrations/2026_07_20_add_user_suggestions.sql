CREATE TABLE IF NOT EXISTS `districts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(170) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_districts_name` (`name`),
  UNIQUE KEY `uq_districts_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tehsils` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `district_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(170) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tehsils_name` (`name`),
  UNIQUE KEY `uq_tehsils_slug` (`slug`),
  CONSTRAINT `fk_tehsils_district` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `villages` ADD COLUMN `tehsil_id` BIGINT UNSIGNED DEFAULT NULL AFTER `id`;
ALTER TABLE `villages` ADD CONSTRAINT `fk_villages_tehsil` FOREIGN KEY (`tehsil_id`) REFERENCES `tehsils` (`id`) ON DELETE SET NULL;

ALTER TABLE `users` ADD COLUMN `trust_score` INT NOT NULL DEFAULT 0 AFTER `bio`;

ALTER TABLE `site_settings` ADD COLUMN `enable_profile_suggestions` TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE `site_settings` ADD COLUMN `suggestion_insertion_frequency` INT NOT NULL DEFAULT 15;
ALTER TABLE `site_settings` ADD COLUMN `suggestion_carousel_size` INT NOT NULL DEFAULT 10;

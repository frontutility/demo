-- Migration: Add Privacy Settings to user_settings table
-- Date: 2024-06-21
-- Description: Add privacy control fields for profile, email, phone, followers/following lists, and search visibility

ALTER TABLE `user_settings`
ADD COLUMN `profile_visibility` ENUM('public', 'followers', 'private') NOT NULL DEFAULT 'public' AFTER `hide_from_search`,
ADD COLUMN `email_visibility` ENUM('public', 'followers', 'private') NOT NULL DEFAULT 'public' AFTER `profile_visibility`,
ADD COLUMN `phone_visibility` ENUM('public', 'followers', 'private') NOT NULL DEFAULT 'public' AFTER `email_visibility`,
ADD COLUMN `followers_visibility` ENUM('public', 'followers', 'private') NOT NULL DEFAULT 'public' AFTER `phone_visibility`,
ADD COLUMN `following_visibility` ENUM('public', 'followers', 'private') NOT NULL DEFAULT 'public' AFTER `followers_visibility`,
ADD COLUMN `show_in_search` TINYINT(1) NOT NULL DEFAULT 1 AFTER `following_visibility`;

-- Update existing records to have default privacy settings
UPDATE `user_settings` SET 
  `profile_visibility` = 'public',
  `email_visibility` = 'public',
  `phone_visibility` = 'public',
  `followers_visibility` = 'public',
  `following_visibility` = 'public',
  `show_in_search` = 1
WHERE `profile_visibility` IS NULL;

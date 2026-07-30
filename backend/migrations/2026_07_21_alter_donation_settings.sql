-- Add missing columns to donation_settings table
ALTER TABLE donation_settings 
ADD COLUMN hero_title_hi VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN hero_description_hi TEXT NULL,
ADD COLUMN why_support_hi LONGTEXT NULL,
ADD COLUMN donation_usage_hi LONGTEXT NULL,
ADD COLUMN transparency_hi LONGTEXT NULL,
ADD COLUMN thank_you_hi LONGTEXT NULL,
ADD COLUMN hero_title_en VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN hero_description_en TEXT NULL,
ADD COLUMN why_support_en LONGTEXT NULL,
ADD COLUMN donation_usage_en LONGTEXT NULL,
ADD COLUMN transparency_en LONGTEXT NULL,
ADD COLUMN thank_you_en LONGTEXT NULL,
ADD COLUMN show_qr TINYINT(1) NOT NULL DEFAULT 1,
ADD COLUMN seo_title VARCHAR(255) NULL,
ADD COLUMN seo_description TEXT NULL;

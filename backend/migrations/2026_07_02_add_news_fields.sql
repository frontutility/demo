ALTER TABLE news
  ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255) NULL AFTER title,
  ADD COLUMN IF NOT EXISTS category VARCHAR(120) NULL AFTER subtitle,
  ADD COLUMN IF NOT EXISTS banner_image LONGTEXT NULL AFTER featured_image,
  ADD COLUMN IF NOT EXISTS short_description TEXT NULL AFTER content,
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255) NULL AFTER short_description,
  ADD COLUMN IF NOT EXISTS seo_description TEXT NULL AFTER seo_title,
  ADD COLUMN IF NOT EXISTS meta_keywords VARCHAR(255) NULL AFTER seo_description;

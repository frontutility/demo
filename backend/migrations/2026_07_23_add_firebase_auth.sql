ALTER TABLE users
  MODIFY password_hash VARCHAR(255) NULL,
  ADD COLUMN firebase_uid VARCHAR(128) NULL AFTER email,
  ADD COLUMN google_photo VARCHAR(500) NULL AFTER firebase_uid,
  ADD COLUMN google_provider VARCHAR(40) NULL AFTER google_photo,
  ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER google_provider,
  ADD UNIQUE KEY uq_users_firebase_uid (firebase_uid),
  ADD KEY idx_users_google_provider (google_provider);

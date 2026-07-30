-- Full poll-management state. Safe to run once on existing installations.
ALTER TABLE polls
  ADD COLUMN description VARCHAR(1000) NOT NULL DEFAULT '' AFTER question,
  ADD COLUMN status ENUM('active', 'closed') NOT NULL DEFAULT 'active' AFTER total_votes,
  ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured,
  ADD COLUMN expires_at DATETIME NULL DEFAULT NULL AFTER is_locked,
  ADD COLUMN closed_at DATETIME NULL DEFAULT NULL AFTER expires_at;

ALTER TABLE poll_options
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER sort_order;

UPDATE polls
SET total_votes = (
  SELECT COALESCE(SUM(po.votes_count), 0)
  FROM poll_options po
  WHERE po.poll_id = polls.id
);

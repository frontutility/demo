<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Core\BaseController;
use ConnectNKT\Core\Database;

final class AdminDashboardController extends BaseController
{
    public function index(): void
    {
        $db = Database::pdo();

        $summary = [
            'total_users' => $this->countWhere($db, 'users', 'deleted_at IS NULL'),
            'active_users' => $this->countWhere($db, 'users', "deleted_at IS NULL AND account_status = 'active'"),
            'hidden_users' => $this->countWhere($db, 'users', "deleted_at IS NULL AND account_status = 'hidden'"),
            'suspended_users' => $this->countWhere($db, 'users', "deleted_at IS NULL AND account_status = 'suspended'"),
            'deleted_users' => $this->countWhere($db, 'users', 'deleted_at IS NOT NULL'),
            'verified_users' => $this->countWhere($db, 'users', "deleted_at IS NULL AND blue_tick_status = 'verified'"),
            'new_users_this_month' => $this->countWhere($db, 'users', "deleted_at IS NULL AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())"),
            'total_posts' => $this->countWhere($db, 'posts', 'deleted_at IS NULL'),
            'published_posts' => $this->countWhere($db, 'posts', "deleted_at IS NULL AND is_hidden = 0"),
            'hidden_posts' => $this->countWhere($db, 'posts', 'deleted_at IS NULL AND is_hidden = 1'),
            'deleted_posts' => $this->countWhere($db, 'posts', 'deleted_at IS NOT NULL'),
            'reported_posts' => $this->countDistinctWhere($db, 'reports', 'reported_post_id', 'deleted_at IS NULL AND reported_post_id IS NOT NULL'),
            'total_villages' => $this->countWhere($db, 'villages', 'deleted_at IS NULL'),
            'total_followers' => $this->countDistinctWhere($db, 'followers', 'followed_id'),
            'total_following_relationships' => $this->countRows($db, 'followers'),
            'total_comments' => $this->countWhere($db, 'post_comments', 'deleted_at IS NULL'),
            'total_shares' => $this->sumWhere($db, 'posts', 'COALESCE(shares_count, 0)', 'deleted_at IS NULL'),
            'total_agree' => $this->sumWhere($db, 'posts', 'COALESCE(agrees_count, 0)', 'deleted_at IS NULL'),
            'total_disagree' => $this->sumWhere($db, 'posts', 'COALESCE(disagrees_count, 0)', 'deleted_at IS NULL'),
            'total_news' => $this->countWhere($db, 'news', 'deleted_at IS NULL'),
            'published_news' => $this->countWhere($db, 'news', "deleted_at IS NULL AND status = 'published'"),
            'draft_news' => $this->countWhere($db, 'news', "deleted_at IS NULL AND status = 'draft'"),
            'hidden_news' => $this->countWhere($db, 'news', "deleted_at IS NULL AND status = 'hidden'"),
            'reported_news' => $this->countWhere($db, 'reports', "deleted_at IS NULL AND report_type = 'news'"),
            'total_news_views' => $this->sumWhere($db, 'news', 'COALESCE(views_count, 0)', 'deleted_at IS NULL'),
            'total_reports' => $this->countWhere($db, 'reports', 'deleted_at IS NULL'),
            'pending_reports' => $this->countWhere($db, 'reports', "deleted_at IS NULL AND status = 'pending'"),
            'resolved_reports' => $this->countWhere($db, 'reports', "deleted_at IS NULL AND status = 'resolved'"),
            'user_reports' => $this->countDistinctWhere($db, 'reports', 'reported_user_id', 'deleted_at IS NULL AND reported_user_id IS NOT NULL'),
            'post_reports' => $this->countDistinctWhere($db, 'reports', 'reported_post_id', 'deleted_at IS NULL AND reported_post_id IS NOT NULL'),
            'comment_reports' => $this->countDistinctWhere($db, 'reports', 'reported_comment_id', 'deleted_at IS NULL AND reported_comment_id IS NOT NULL'),
            'news_reports' => $this->countWhere($db, 'reports', "deleted_at IS NULL AND report_type = 'news'"),
            'total_categories' => $this->countWhere($db, 'post_categories', 'deleted_at IS NULL'),
            'total_cms_pages' => $this->countWhere($db, 'cms_pages', 'deleted_at IS NULL'),
            'pending_blue_tick_requests' => $this->countWhere($db, 'blue_tick_requests', "deleted_at IS NULL AND request_status = 'pending'"),
        ];

        $today = [
            'new_users_today' => $this->countWhere($db, 'users', "deleted_at IS NULL AND DATE(created_at) = CURDATE()"),
            'new_posts_today' => $this->countWhere($db, 'posts', "deleted_at IS NULL AND DATE(created_at) = CURDATE()"),
            'new_followers_today' => $this->countRowsWhere($db, 'followers', "DATE(created_at) = CURDATE()"),
            'new_comments_today' => $this->countWhere($db, 'post_comments', "deleted_at IS NULL AND DATE(created_at) = CURDATE()"),
            'new_reports_today' => $this->countWhere($db, 'reports', "deleted_at IS NULL AND DATE(created_at) = CURDATE()"),
            'new_blue_tick_requests_today' => $this->countWhere($db, 'blue_tick_requests', "deleted_at IS NULL AND DATE(requested_at) = CURDATE()"),
        ];

        $last7Days = [
            'users_joined' => $this->dailySeries($db, 'users', 'created_at', 'deleted_at IS NULL'),
            'posts_created' => $this->dailySeries($db, 'posts', 'created_at', 'deleted_at IS NULL'),
            'followers_added' => $this->dailySeries($db, 'followers', 'created_at', null),
            'comments_added' => $this->dailySeries($db, 'post_comments', 'created_at', 'deleted_at IS NULL'),
        ];

        $latestUsers = $this->latestUsers($db, 5);
        $latestPosts = $this->latestPosts($db, 5);
        $latestNews = $this->latestNews($db, 5);
        $latestReports = $this->latestReports($db, 5);

        $response = array_merge($summary, $today, [
            'summary' => $summary,
            'today' => $today,
            'last_7_days' => $last7Days,
            'latest_users' => $latestUsers,
            'latest_posts' => $latestPosts,
            'latest_news' => $latestNews,
            'latest_reports' => $latestReports,
            'user_analytics' => [
                'top_users_by_followers' => $this->topUsersByFollowers($db, 5),
                'most_followed_user' => $this->topUserByFollowers($db),
                'most_active_user' => $this->mostActiveUser($db),
                'most_shared_user' => $this->mostSharedUser($db),
                'most_reported_user' => $this->mostReportedUser($db),
            ],
            'village_analytics' => [
                'top_villages_by_users' => $this->topVillagesByUsers($db, 5),
                'top_villages_by_posts' => $this->topVillagesByPosts($db, 5),
                'fastest_growing_village' => $this->fastestGrowingVillage($db),
            ],
            'post_analytics' => [
                'most_liked_posts' => $this->topPostsByMetric($db, 'agrees_count', 5),
                'most_disliked_posts' => $this->topPostsByMetric($db, 'disagrees_count', 5),
                'most_shared_posts' => $this->topPostsByMetric($db, 'shares_count', 5),
                'most_commented_posts' => $this->topPostsByMetric($db, 'comments_count', 5),
                'latest_posts' => $this->latestPosts($db, 5),
                'hidden_posts' => $this->hiddenPosts($db, 5),
            ],
            'news_analytics' => [
                'total_news' => $summary['total_news'],
                'published_news' => $summary['published_news'],
                'draft_news' => $summary['draft_news'],
                'hidden_news' => $summary['hidden_news'],
                'total_news_views' => $summary['total_news_views'],
            ],
            'report_analytics' => [
                'pending_reports' => $this->countWhere($db, 'reports', "deleted_at IS NULL AND status = 'pending'"),
                'resolved_reports' => $this->countWhere($db, 'reports', "deleted_at IS NULL AND status = 'resolved'"),
                'rejected_reports' => $this->countWhere($db, 'reports', "deleted_at IS NULL AND status = 'dismissed'"),
                'most_reported_posts' => $this->mostReportedPosts($db, 5),
                'most_reported_users' => $this->mostReportedUsers($db, 5),
            ],
            'blue_tick_analytics' => [
                'pending_requests' => $this->countWhere($db, 'blue_tick_requests', "deleted_at IS NULL AND request_status = 'pending'"),
                'approved_requests' => $this->countWhere($db, 'blue_tick_requests', "deleted_at IS NULL AND request_status = 'approved'"),
                'rejected_requests' => $this->countWhere($db, 'blue_tick_requests', "deleted_at IS NULL AND request_status = 'rejected'"),
                'revoked_requests' => $this->countWhere($db, 'blue_tick_requests', "deleted_at IS NULL AND request_status = 'revoked'"),
                'verified_users' => $this->countWhere($db, 'users', "deleted_at IS NULL AND blue_tick_status = 'verified'"),
            ],
            'live_activity_feed' => $this->liveActivityFeed($db, 5),
        ]);

        $this->json($response);
    }

    private function countRows(\PDO $db, string $table): int
    {
        $stmt = $db->query("SELECT COUNT(*) FROM {$table}");
        return (int) $stmt->fetchColumn();
    }

    private function countRowsWhere(\PDO $db, string $table, string $where, array $params = []): int
    {
        $stmt = $db->prepare("SELECT COUNT(*) FROM {$table} WHERE {$where}");
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }

    private function countDistinctWhere(\PDO $db, string $table, string $column, string $where = '1', array $params = []): int
    {
        $stmt = $db->prepare("SELECT COUNT(DISTINCT {$column}) FROM {$table} WHERE {$where}");
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }

    private function countWhere(\PDO $db, string $table, string $where, array $params = []): int
    {
        return $this->countRowsWhere($db, $table, $where, $params);
    }

    private function sumWhere(\PDO $db, string $table, string $column, string $where, array $params = []): int
    {
        $stmt = $db->prepare("SELECT COALESCE(SUM({$column}), 0) FROM {$table} WHERE {$where}");
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }

    private function latestUsers(\PDO $db, int $limit): array
    {
        $stmt = $db->prepare('
            SELECT
                u.id,
                u.name,
                u.username,
                u.email,
                u.mobile,
                u.profile_image_url,
                u.blue_tick_status,
                u.account_status,
                u.created_at,
                v.name AS village_name
            FROM users u
            LEFT JOIN villages v ON v.id = u.village_id
            WHERE u.deleted_at IS NULL
            ORDER BY u.created_at DESC, u.id DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    private function latestPosts(\PDO $db, int $limit): array
    {
        $stmt = $db->prepare('
            SELECT
                p.id,
                p.content,
                p.is_hidden,
                p.agrees_count,
                p.disagrees_count,
                p.comments_count,
                p.shares_count,
                p.created_at,
                u.id AS author_id,
                u.name AS author_name,
                u.username AS author_username,
                u.profile_image_url AS author_avatar,
                v.name AS village_name
            FROM posts p
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN villages v ON v.id = u.village_id
            WHERE p.deleted_at IS NULL
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return array_map(static function (array $row): array {
            return [
                'id' => (int) $row['id'],
                'content' => $row['content'] ?? '',
                'is_hidden' => (int) ($row['is_hidden'] ?? 0),
                'agrees_count' => (int) ($row['agrees_count'] ?? 0),
                'disagrees_count' => (int) ($row['disagrees_count'] ?? 0),
                'comments_count' => (int) ($row['comments_count'] ?? 0),
                'shares_count' => (int) ($row['shares_count'] ?? 0),
                'created_at' => $row['created_at'] ?? null,
                'author' => [
                    'id' => isset($row['author_id']) ? (int) $row['author_id'] : null,
                    'name' => $row['author_name'] ?? '',
                    'username' => $row['author_username'] ?? '',
                    'profile_image_url' => $row['author_avatar'] ?? '',
                ],
                'village_name' => $row['village_name'] ?? '',
            ];
        }, $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    private function latestReports(\PDO $db, int $limit): array
    {
        $stmt = $db->prepare('
            SELECT
                r.id,
                r.reported_post_id,
                r.reported_user_id,
                r.reported_comment_id,
                r.reason,
                r.status,
                r.created_at,
                COALESCE(r.reported_by_display_name, reporter.username, reporter.name, "Anonymous") AS reported_by
            FROM reports r
            LEFT JOIN users reporter ON reporter.id = r.reporter_user_id
            WHERE r.deleted_at IS NULL
            ORDER BY r.created_at DESC, r.id DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return array_map(static function (array $row): array {
            return [
                'id' => (int) $row['id'],
                'reported_post_id' => isset($row['reported_post_id']) ? (int) $row['reported_post_id'] : null,
                'reported_user_id' => isset($row['reported_user_id']) ? (int) $row['reported_user_id'] : null,
                'reported_comment_id' => isset($row['reported_comment_id']) ? (int) $row['reported_comment_id'] : null,
                'reason' => $row['reason'] ?? '',
                'status' => $row['status'] ?? 'pending',
                'reported_by' => $row['reported_by'] ?? 'Anonymous',
                'created_at' => $row['created_at'] ?? null,
            ];
        }, $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    private function latestNews(\PDO $db, int $limit): array
    {
        $stmt = $db->prepare('
            SELECT
                n.id,
                n.title,
                n.slug,
                n.featured_image,
                n.author_name,
                n.status,
                n.views_count,
                n.published_at,
                n.created_at,
                n.updated_at
            FROM news n
            WHERE n.deleted_at IS NULL
            ORDER BY COALESCE(n.published_at, n.created_at) DESC, n.id DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return array_map(static function (array $row): array {
            return [
                'id' => (int) ($row['id'] ?? 0),
                'title' => $row['title'] ?? '',
                'slug' => $row['slug'] ?? '',
                'featured_image' => $row['featured_image'] ?? null,
                'author_name' => $row['author_name'] ?? '',
                'status' => $row['status'] ?? 'draft',
                'views_count' => (int) ($row['views_count'] ?? 0),
                'published_at' => $row['published_at'] ?? null,
                'created_at' => $row['created_at'] ?? null,
                'updated_at' => $row['updated_at'] ?? null,
            ];
        }, $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    private function topUsersByFollowers(\PDO $db, int $limit): array
    {
        $stmt = $db->prepare('
            SELECT
                u.id,
                u.name,
                u.username,
                u.profile_image_url,
                COALESCE(u.followers_count_override, follower_counts.total, 0) AS followers
            FROM users u
            LEFT JOIN (
                SELECT followed_id, COUNT(*) AS total
                FROM followers
                GROUP BY followed_id
            ) follower_counts ON follower_counts.followed_id = u.id
            WHERE u.deleted_at IS NULL
            ORDER BY followers DESC, u.id DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        return array_map(static function (array $row, int $index): array {
            return [
                'rank' => $index + 1,
                'id' => (int) $row['id'],
                'name' => $row['name'] ?? '',
                'username' => $row['username'] ?? '',
                'profile_image_url' => $row['profile_image_url'] ?? '',
                'followers' => (int) ($row['followers'] ?? 0),
            ];
        }, $rows, array_keys($rows));
    }

    private function topUserByFollowers(\PDO $db): array
    {
        $rows = $this->topUsersByFollowers($db, 1);
        return $rows[0] ?? [];
    }

    private function mostActiveUser(\PDO $db): array
    {
        $stmt = $db->query('
            SELECT
                u.id,
                u.name,
                u.username,
                u.profile_image_url,
                COALESCE(post_counts.total, 0) AS posts_count,
                COALESCE(comment_counts.total, 0) AS comments_count,
                COALESCE(post_counts.total, 0) + COALESCE(comment_counts.total, 0) AS activity_score
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(*) AS total
                FROM posts
                WHERE deleted_at IS NULL
                GROUP BY user_id
            ) post_counts ON post_counts.user_id = u.id
            LEFT JOIN (
                SELECT user_id, COUNT(*) AS total
                FROM post_comments
                WHERE deleted_at IS NULL
                GROUP BY user_id
            ) comment_counts ON comment_counts.user_id = u.id
            WHERE u.deleted_at IS NULL
            ORDER BY activity_score DESC, posts_count DESC, comments_count DESC, u.id DESC
            LIMIT 1
        ');
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? [
            'id' => (int) $row['id'],
            'name' => $row['name'] ?? '',
            'username' => $row['username'] ?? '',
            'profile_image_url' => $row['profile_image_url'] ?? '',
            'posts_count' => (int) ($row['posts_count'] ?? 0),
            'comments_count' => (int) ($row['comments_count'] ?? 0),
            'activity_score' => (int) ($row['activity_score'] ?? 0),
        ] : [];
    }

    private function mostSharedUser(\PDO $db): array
    {
        $stmt = $db->query('
            SELECT
                u.id,
                u.name,
                u.username,
                u.profile_image_url,
                COALESCE(SUM(COALESCE(p.shares_count, 0)), 0) AS shares_count
            FROM users u
            LEFT JOIN posts p ON p.user_id = u.id AND p.deleted_at IS NULL
            WHERE u.deleted_at IS NULL
            GROUP BY u.id, u.name, u.username, u.profile_image_url
            ORDER BY shares_count DESC, u.id DESC
            LIMIT 1
        ');
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? [
            'id' => (int) $row['id'],
            'name' => $row['name'] ?? '',
            'username' => $row['username'] ?? '',
            'profile_image_url' => $row['profile_image_url'] ?? '',
            'shares_count' => (int) ($row['shares_count'] ?? 0),
        ] : [];
    }

    private function mostReportedUser(\PDO $db): array
    {
        $stmt = $db->query('
            SELECT
                u.id,
                u.name,
                u.username,
                u.profile_image_url,
                COALESCE(report_counts.total, 0) AS reports_count
            FROM users u
            LEFT JOIN (
                SELECT reported_user_id, COUNT(*) AS total
                FROM reports
                WHERE deleted_at IS NULL AND status = \'pending\' AND reported_user_id IS NOT NULL
                GROUP BY reported_user_id
            ) report_counts ON report_counts.reported_user_id = u.id
            WHERE u.deleted_at IS NULL
            ORDER BY reports_count DESC, u.id DESC
            LIMIT 1
        ');
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? [
            'id' => (int) $row['id'],
            'name' => $row['name'] ?? '',
            'username' => $row['username'] ?? '',
            'profile_image_url' => $row['profile_image_url'] ?? '',
            'reports_count' => (int) ($row['reports_count'] ?? 0),
        ] : [];
    }

    private function topVillagesByUsers(\PDO $db, int $limit): array
    {
        $stmt = $db->prepare('
            SELECT
                v.id,
                v.name,
                COALESCE(user_counts.total, 0) AS users
            FROM villages v
            LEFT JOIN (
                SELECT village_id, COUNT(*) AS total
                FROM users
                WHERE deleted_at IS NULL AND village_id IS NOT NULL
                GROUP BY village_id
            ) user_counts ON user_counts.village_id = v.id
            WHERE v.deleted_at IS NULL
            ORDER BY users DESC, v.id DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'name' => $row['name'] ?? '',
            'users' => (int) ($row['users'] ?? 0),
        ], $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    private function topVillagesByPosts(\PDO $db, int $limit): array
    {
        $stmt = $db->prepare('
            SELECT
                v.id,
                v.name,
                COALESCE(post_counts.total, 0) AS posts
            FROM villages v
            LEFT JOIN users u ON u.village_id = v.id AND u.deleted_at IS NULL
            LEFT JOIN (
                SELECT user_id, COUNT(*) AS total
                FROM posts
                WHERE deleted_at IS NULL
                GROUP BY user_id
            ) post_counts ON post_counts.user_id = u.id
            WHERE v.deleted_at IS NULL
            GROUP BY v.id, v.name, post_counts.total
            ORDER BY posts DESC, v.id DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'name' => $row['name'] ?? '',
            'posts' => (int) ($row['posts'] ?? 0),
        ], $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    private function fastestGrowingVillage(\PDO $db): array
    {
        $stmt = $db->query('
            SELECT
                v.id,
                v.name,
                COALESCE(new_user_counts.total, 0) AS new_users
            FROM villages v
            LEFT JOIN (
                SELECT village_id, COUNT(*) AS total
                FROM users
                WHERE deleted_at IS NULL AND village_id IS NOT NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY village_id
            ) new_user_counts ON new_user_counts.village_id = v.id
            WHERE v.deleted_at IS NULL
            ORDER BY new_users DESC, v.id DESC
            LIMIT 1
        ');
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ? [
            'id' => (int) $row['id'],
            'name' => $row['name'] ?? '',
            'new_users' => (int) ($row['new_users'] ?? 0),
        ] : [];
    }

    private function topPostsByMetric(\PDO $db, string $metricColumn, int $limit): array
    {
        $stmt = $db->prepare("
            SELECT
                p.id,
                p.content,
                p.created_at,
                p.is_hidden,
                p.agrees_count,
                p.disagrees_count,
                p.comments_count,
                p.shares_count,
                u.id AS author_id,
                u.name AS author_name,
                u.username AS author_username,
                v.name AS village_name,
                COALESCE(report_counts.total, 0) AS reports_count
            FROM posts p
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN (
                SELECT reported_post_id, COUNT(*) AS total
                FROM reports
                WHERE deleted_at IS NULL AND status = 'pending' AND reported_post_id IS NOT NULL
                GROUP BY reported_post_id
            ) report_counts ON report_counts.reported_post_id = p.id
            WHERE p.deleted_at IS NULL
            ORDER BY COALESCE(p.{$metricColumn}, 0) DESC, p.created_at DESC, p.id DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $this->normalizePostRows($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    private function hiddenPosts(\PDO $db, int $limit): array
    {
        $stmt = $db->prepare('
            SELECT
                p.id,
                p.content,
                p.created_at,
                p.is_hidden,
                p.agrees_count,
                p.disagrees_count,
                p.comments_count,
                p.shares_count,
                u.id AS author_id,
                u.name AS author_name,
                u.username AS author_username,
                v.name AS village_name,
                COALESCE(report_counts.total, 0) AS reports_count
            FROM posts p
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN (
                SELECT reported_post_id, COUNT(*) AS total
                FROM reports
                WHERE deleted_at IS NULL AND status = \'pending\' AND reported_post_id IS NOT NULL
                GROUP BY reported_post_id
            ) report_counts ON report_counts.reported_post_id = p.id
            WHERE p.deleted_at IS NULL AND p.is_hidden = 1
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $this->normalizePostRows($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    private function normalizePostRows(array $rows): array
    {
        return array_map(static function (array $row): array {
            return [
                'id' => (int) ($row['id'] ?? 0),
                'content' => $row['content'] ?? '',
                'created_at' => $row['created_at'] ?? null,
                'is_hidden' => (int) ($row['is_hidden'] ?? 0),
                'agrees_count' => (int) ($row['agrees_count'] ?? 0),
                'disagrees_count' => (int) ($row['disagrees_count'] ?? 0),
                'comments_count' => (int) ($row['comments_count'] ?? 0),
                'shares_count' => (int) ($row['shares_count'] ?? 0),
                'reports_count' => (int) ($row['reports_count'] ?? 0),
                'author' => [
                    'id' => isset($row['author_id']) ? (int) $row['author_id'] : null,
                    'name' => $row['author_name'] ?? '',
                    'username' => $row['author_username'] ?? '',
                ],
                'village_name' => $row['village_name'] ?? '',
            ];
        }, $rows);
    }

    private function mostReportedPosts(\PDO $db, int $limit): array
    {
        $stmt = $db->prepare('
            SELECT
                p.id,
                p.content,
                p.created_at,
                p.is_hidden,
                p.agrees_count,
                p.disagrees_count,
                p.comments_count,
                p.shares_count,
                u.id AS author_id,
                u.name AS author_name,
                u.username AS author_username,
                v.name AS village_name,
                COALESCE(report_counts.total, 0) AS reports_count
            FROM posts p
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN (
                SELECT reported_post_id, COUNT(*) AS total
                FROM reports
                WHERE deleted_at IS NULL AND status = \'pending\' AND reported_post_id IS NOT NULL
                GROUP BY reported_post_id
            ) report_counts ON report_counts.reported_post_id = p.id
            WHERE p.deleted_at IS NULL
            ORDER BY reports_count DESC, p.created_at DESC, p.id DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $this->normalizePostRows($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    private function mostReportedUsers(\PDO $db, int $limit): array
    {
        $stmt = $db->prepare('
            SELECT
                u.id,
                u.name,
                u.username,
                u.profile_image_url,
                COALESCE(report_counts.total, 0) AS reports_count
            FROM users u
            LEFT JOIN (
                SELECT reported_user_id, COUNT(*) AS total
                FROM reports
                WHERE deleted_at IS NULL AND status = \'pending\' AND reported_user_id IS NOT NULL
                GROUP BY reported_user_id
            ) report_counts ON report_counts.reported_user_id = u.id
            WHERE u.deleted_at IS NULL
            ORDER BY reports_count DESC, u.id DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return array_map(static function (array $row): array {
            return [
                'id' => (int) $row['id'],
                'name' => $row['name'] ?? '',
                'username' => $row['username'] ?? '',
                'profile_image_url' => $row['profile_image_url'] ?? '',
                'reports_count' => (int) ($row['reports_count'] ?? 0),
            ];
        }, $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    private function dailySeries(\PDO $db, string $table, string $dateColumn, ?string $where): array
    {
        $series = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} day"));
            $sql = "SELECT COUNT(*) FROM {$table} WHERE DATE({$dateColumn}) = :date";
            if ($where) {
                $sql .= " AND {$where}";
            }
            $stmt = $db->prepare($sql);
            $stmt->execute(['date' => $date]);
            $series[] = [
                'date' => $date,
                'count' => (int) $stmt->fetchColumn(),
            ];
        }
        return $series;
    }

    private function liveActivityFeed(\PDO $db, int $limit): array
    {
        $stmt = $db->prepare('
            SELECT
                feed.feed_type,
                feed.entity_type,
                feed.entity_id,
                feed.title,
                feed.description,
                feed.created_at,
                feed.link_type,
                feed.link_id
            FROM (
                SELECT
                    "user" AS feed_type,
                    "user" AS entity_type,
                    u.id AS entity_id,
                    CONCAT(u.name, " joined ConnectNKT") AS title,
                    CONCAT("@", u.username, " created a new account") AS description,
                    u.created_at AS created_at,
                    "user" AS link_type,
                    u.id AS link_id
                FROM users u
                WHERE u.deleted_at IS NULL

                UNION ALL

                SELECT
                    "post" AS feed_type,
                    "post" AS entity_type,
                    p.id AS entity_id,
                    CONCAT(COALESCE(u.name, "A user"), " created a post") AS title,
                    p.content AS description,
                    p.created_at AS created_at,
                    "post" AS link_type,
                    p.id AS link_id
                FROM posts p
                LEFT JOIN users u ON u.id = p.user_id
                WHERE p.deleted_at IS NULL
                  AND u.deleted_at IS NULL

                UNION ALL

                SELECT
                    "follow" AS feed_type,
                    "user" AS entity_type,
                    f.id AS entity_id,
                    CONCAT(COALESCE(follower.name, "A user"), " followed ", COALESCE(followed.name, "another user")) AS title,
                    CONCAT("@", COALESCE(follower.username, "unknown"), " followed @", COALESCE(followed.username, "unknown")) AS description,
                    f.created_at AS created_at,
                    "user" AS link_type,
                    follower.id AS link_id
                FROM followers f
                LEFT JOIN users follower ON follower.id = f.follower_id
                LEFT JOIN users followed ON followed.id = f.followed_id
                WHERE follower.deleted_at IS NULL
                  AND followed.deleted_at IS NULL

                UNION ALL

                SELECT
                    "blue_tick_request" AS feed_type,
                    "blue_tick_request" AS entity_type,
                    b.id AS entity_id,
                    CONCAT("Blue Tick requested by ", COALESCE(u.name, "a user")) AS title,
                    CONCAT("@", COALESCE(u.username, "unknown"), " submitted a verification request") AS description,
                    b.requested_at AS created_at,
                    "user" AS link_type,
                    u.id AS link_id
                FROM blue_tick_requests b
                LEFT JOIN users u ON u.id = b.user_id
                WHERE b.deleted_at IS NULL
                  AND u.deleted_at IS NULL

                UNION ALL

                SELECT
                    "report" AS feed_type,
                    "report" AS entity_type,
                    r.id AS entity_id,
                    CONCAT("Post reported by ", COALESCE(reporter.name, r.reported_by_display_name, "User")) AS title,
                    CONCAT("Reason: ", r.reason) AS description,
                    r.created_at AS created_at,
                    "report" AS link_type,
                    r.id AS link_id
                FROM reports r
                LEFT JOIN users reporter ON reporter.id = r.reporter_user_id
                WHERE r.deleted_at IS NULL
                  AND (r.reporter_user_id IS NULL OR reporter.deleted_at IS NULL)

                UNION ALL

                SELECT
                    "village" AS feed_type,
                    "village" AS entity_type,
                    v.id AS entity_id,
                    CONCAT("Village added by Admin: ", v.name) AS title,
                    CONCAT(v.name, " was added to the network") AS description,
                    v.created_at AS created_at,
                    "villages" AS link_type,
                    v.id AS link_id
                FROM villages v
                WHERE v.deleted_at IS NULL
            ) AS feed
            ORDER BY feed.created_at DESC, feed.entity_id DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return array_map(static function (array $row): array {
            return [
                'type' => $row['feed_type'] ?? '',
                'entityType' => $row['entity_type'] ?? '',
                'entityId' => isset($row['entity_id']) ? (int) $row['entity_id'] : null,
                'title' => $row['title'] ?? '',
                'description' => $row['description'] ?? '',
                'createdAt' => $row['created_at'] ?? null,
                'linkType' => $row['link_type'] ?? '',
                'linkId' => isset($row['link_id']) ? (int) $row['link_id'] : null,
            ];
        }, $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }
}

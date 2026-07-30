<?php

declare(strict_types=1);

namespace ConnectNKT\Controllers;

use ConnectNKT\Models\Post;

final class AdminPostController extends PostController
{
    /**
     * Get admin posts list with search and village filter
     */
    public function index(): array
    {
        $term = trim((string) ($_GET['q'] ?? $_GET['search'] ?? ''));
        $village = isset($_GET['village']) ? (int) $_GET['village'] : (isset($_GET['village_id']) ? (int) $_GET['village_id'] : 0);
        $page = isset($_GET['page']) ? max(1, (int) $_GET['page'] ) : null;
        $perPage = isset($_GET['per_page']) ? max(1, min(200, (int) $_GET['per_page'])) : null;
        $offset = $page && $perPage ? ($page - 1) * $perPage : null;
        $hasSlug = $this->hasColumn('posts', 'slug');
        $hasPostType = $this->hasColumn('posts', 'post_type');
        $params = [];
        
        $sql = '
            SELECT
                p.id,
                p.user_id,
                COALESCE(p.content, "") AS content,
                p.category_id,
                ' . ($hasSlug ? 'p.slug' : 'NULL AS slug') . ',
                ' . ($hasPostType ? 'COALESCE(p.post_type, "text") AS post_type' : '"text" AS post_type') . ',
                p.is_hidden,
                p.is_pinned,
                p.pinned_at,
                p.is_globally_pinned,
                p.globally_pinned_at,
                p.agrees_count,
                p.disagrees_count,
                p.comments_count,
                p.shares_count,
                p.created_at,
                p.updated_at,
                p.deleted_at,
                u.name AS author_name,
                u.username AS author_username,
                u.profile_image_url AS author_avatar,
                v.name AS village_name,
                c.name AS category_name,
                COALESCE(report_counts.total, 0) AS reports_count
            FROM posts p
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN post_categories c ON c.id = p.category_id
            LEFT JOIN (
                SELECT reported_post_id, COUNT(*) AS total
                FROM reports
                WHERE deleted_at IS NULL
                  AND status = \'pending\'
                  AND reported_post_id IS NOT NULL
                GROUP BY reported_post_id
            ) report_counts ON report_counts.reported_post_id = p.id
            WHERE p.deleted_at IS NULL';

        // Search by content, username, or village
        if ($term !== '') {
            $sql .= '
              AND (
                p.content LIKE :term
                OR u.username LIKE :term
                OR v.name LIKE :term
              )';
            $params['term'] = '%' . $term . '%';
        }

        // Filter by village
        if ($village > 0) {
            $sql .= '
              AND u.village_id = :village';
            $params['village'] = $village;
        }

        $sql .= ' ORDER BY p.created_at DESC';
        
        // Pagination
        if ($page !== null && $perPage !== null) {
            $sql .= " LIMIT {$perPage} OFFSET {$offset}";
        }
        
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);

        return array_map(fn (array $post) => $this->normalizeRow($post), $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: []);
    }

    /**
     * Get single post details
     */
    public function show(string $id): array
    {
        $hasSlug = $this->hasColumn('posts', 'slug');
        $hasPostType = $this->hasColumn('posts', 'post_type');
        $postTypeSelect = $hasPostType ? 'COALESCE(p.post_type, "text") AS post_type,' : '"text" AS post_type,';
        $slugSelect = $hasSlug ? 'p.slug,' : 'NULL AS slug,';
        
        $stmt = $this->db()->prepare('
            SELECT
                p.id,
                p.user_id,
                COALESCE(p.content, "") AS content,
                p.category_id,
                ' . $slugSelect . '
                ' . $postTypeSelect . '
                p.is_hidden,
                p.is_pinned,
                p.pinned_at,
                p.is_globally_pinned,
                p.globally_pinned_at,
                p.agrees_count,
                p.disagrees_count,
                p.comments_count,
                p.shares_count,
                p.created_at,
                p.updated_at,
                p.deleted_at,
                u.name AS author_name,
                u.username AS author_username,
                u.email AS author_email,
                u.mobile AS author_mobile,
                u.profile_image_url AS author_avatar,
                v.id AS village_id,
                v.name AS village_name,
                c.name AS category_name,
                COALESCE(report_counts.total, 0) AS reports_count
            FROM posts p
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN villages v ON v.id = u.village_id
            LEFT JOIN post_categories c ON c.id = p.category_id
            LEFT JOIN (
                SELECT reported_post_id, COUNT(*) AS total
                FROM reports
                WHERE deleted_at IS NULL
                  AND status = \'pending\'
                  AND reported_post_id IS NOT NULL
                GROUP BY reported_post_id
            ) report_counts ON report_counts.reported_post_id = p.id
            WHERE p.id = :id
              AND p.deleted_at IS NULL
            LIMIT 1
        ');
        $stmt->execute(['id' => (int) $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if (!$row) {
            return [];
        }

        return $this->normalizeRow($row, true);
    }

    /**
     * Update post
     */
    public function update(string $id): array
    {
        $post = (new Post())->find((int) $id);
        if (!$post) {
            $this->fail('Post not found', 404);
        }

        $input = $this->input();
        $payload = [];

        if (array_key_exists('content', $input)) {
            $payload['content'] = trim((string) $input['content']);
        }
        if (array_key_exists('category_id', $input) || array_key_exists('category', $input)) {
            $payload['category_id'] = (int) ($input['category_id'] ?? $input['category'] ?? 0);
        }
        if (array_key_exists('agrees_count', $input) || array_key_exists('agrees', $input)) {
            $payload['agrees_count'] = max(0, (int) ($input['agrees_count'] ?? $input['agrees'] ?? 0));
        }
        if (array_key_exists('disagrees_count', $input) || array_key_exists('disagrees', $input)) {
            $payload['disagrees_count'] = max(0, (int) ($input['disagrees_count'] ?? $input['disagrees'] ?? 0));
        }
        if (array_key_exists('comments_count', $input) || array_key_exists('comments', $input)) {
            $payload['comments_count'] = max(0, (int) ($input['comments_count'] ?? $input['comments'] ?? 0));
        }
        if (array_key_exists('shares_count', $input) || array_key_exists('shares', $input)) {
            $payload['shares_count'] = max(0, (int) ($input['shares_count'] ?? $input['shares'] ?? 0));
        }
        if (array_key_exists('visibility', $input)) {
            $payload['is_hidden'] = (string) $input['visibility'] === 'hidden' ? 1 : 0;
        }

        if (!$payload) {
            $this->fail('No update data provided.', 422);
        }

        $this->model()->update((int) $id, $payload);
        return $this->show($id);
    }

    /**
     * Delete post (soft delete)
     */
    public function destroy(string $id): array
    {
        $post = (new Post())->find((int) $id);
        if (!$post) {
            $this->fail('Post not found', 404);
        }

        $this->model()->delete((int) $id);
        return ['deleted' => true, 'id' => (int) $id];
    }

    /**
     * Hide post
     */
    public function hide(string $id): array
    {
        $stmt = $this->db()->prepare('UPDATE posts SET is_hidden = 1, hidden_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => (int) $id]);
        return $this->show($id);
    }

    /**
     * Restore (unhide) post
     */
    public function restore(string $id): array
    {
        $stmt = $this->db()->prepare('UPDATE posts SET is_hidden = 0, hidden_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => (int) $id]);
        return $this->show($id);
    }

    /**
     * Global pin a post
     */
    public function globalPin(string $id): array
    {
        $post = (new Post())->find((int) $id);
        if (!$post) {
            $this->fail('Post not found', 404);
        }

        // Get current admin ID from auth context
        $admin = $this->currentUser();
        $adminId = $admin['id'] ?? 0;

        $this->db()->beginTransaction();
        try {
            $unpinStmt = $this->db()->prepare('UPDATE posts SET is_globally_pinned = 0, globally_pinned_at = NULL, globally_pinned_by_admin_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE is_globally_pinned = 1');
            $unpinStmt->execute();

            $pinStmt = $this->db()->prepare('UPDATE posts SET is_globally_pinned = 1, globally_pinned_at = CURRENT_TIMESTAMP, globally_pinned_by_admin_id = :admin_id, updated_at = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1');
            $pinStmt->execute(['id' => $post['id'], 'admin_id' => $adminId]);

            $this->db()->commit();
        } catch (\Throwable $e) {
            if ($this->db()->inTransaction()) {
                $this->db()->rollBack();
            }
            $this->fail('Could not pin post globally: ' . $e->getMessage(), 500);
        }

        return $this->show($id);
    }

    /**
     * Global unpin a post
     */
    public function globalUnpin(string $id): array
    {
        $post = (new Post())->find((int) $id);
        if (!$post) {
            $this->fail('Post not found', 404);
        }

        $this->model()->update((int) $id, [
            'is_globally_pinned' => 0,
            'globally_pinned_at' => null,
            'globally_pinned_by_admin_id' => null,
        ]);

        return $this->show($id);
    }

    /**
     * Normalize post data for consistent response
     */
    private function normalizeRow(array $post, bool $detailed = false): array
    {
        // ✅ FULL content - NO truncation
        $fullContent = $post['content'] ?? '';
        
        $normalized = [
            'id' => (int) ($post['id'] ?? 0),
            'userId' => (int) ($post['user_id'] ?? 0),
            'content' => $fullContent,
            'content_full' => $fullContent,
            'content_summary' => mb_strlen($fullContent) > 200 
                ? mb_substr($fullContent, 0, 200) . '...' 
                : $fullContent,
            'content_length' => mb_strlen($fullContent),
            'categoryId' => isset($post['category_id']) ? (int) $post['category_id'] : null,
            'category' => $post['category_name'] ?? $post['category'] ?? '',
            'postType' => $post['post_type'] ?? 'text',
            'visibility' => (int) ($post['is_hidden'] ?? 0) ? 'hidden' : 'visible',
            'status' => (int) ($post['is_hidden'] ?? 0) ? 'hidden' : 'visible',
            'isPinned' => (int) ($post['is_pinned'] ?? 0),
            'pinnedAt' => $post['pinned_at'] ?? null,
            'isGloballyPinned' => (int) ($post['is_globally_pinned'] ?? 0),
            'globallyPinnedAt' => $post['globally_pinned_at'] ?? null,
            'agrees' => (int) ($post['agrees_count'] ?? 0),
            'disagrees' => (int) ($post['disagrees_count'] ?? 0),
            'comments' => (int) ($post['comments_count'] ?? 0),
            'shares' => (int) ($post['shares_count'] ?? 0),
            'reports' => (int) ($post['reports_count'] ?? 0),
            'createdAt' => $post['created_at'] ?? null,
            'updatedAt' => $post['updated_at'] ?? null,
            'author' => [
                'name' => $post['author_name'] ?? '',
                'username' => $post['author_username'] ?? '',
                'email' => $post['author_email'] ?? '',
                'mobile' => $post['author_mobile'] ?? '',
                'profileImageUrl' => $post['author_avatar'] ?? '',
            ],
            'village' => $post['village_name'] ?? '',
            'isHidden' => (int) ($post['is_hidden'] ?? 0),
        ];

        if ($detailed) {
            $normalized['slug'] = $post['slug'] ?? null;
            $normalized['villageId'] = isset($post['village_id']) ? (int) $post['village_id'] : null;
        }

        return $normalized;
    }
}
